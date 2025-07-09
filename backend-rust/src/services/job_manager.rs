// Background job management with tokio spawned tasks will go here

use dashmap::DashMap;
use rust_decimal::Decimal;
use std::sync::Arc;
use tokio::task::JoinHandle;
use tracing::{error, info, warn};

use crate::db::Database;
use crate::github::GitHubClient;
use crate::services::{SemanticSearchManager, SemanticSearchManagerError};
use crate::types::UserJob;
use crate::types::repository::Repository;

impl Repository {
    pub fn from_octocrab(repo: octocrab::models::Repository) -> Self {
        Repository {
            id: Decimal::from(repo.id.0),
            name: repo.name,
            owner: repo.owner.map(|o| o.login).unwrap_or_default(),
            description: repo.description,
            readme_content: None,
            topics: repo.topics.unwrap_or_default(),
            homepage_url: repo.html_url.map(|u| u.to_string()).unwrap_or_default(),
            created_at: repo.created_at,
            last_updated: repo.updated_at,
        }
    }
}

#[derive(Debug, thiserror::Error)]
pub enum JobError {
    #[error("Job already running for user {user_id}")]
    JobAlreadyRunning { user_id: i64 },
    #[error("Job not found for user {user_id}")]
    JobNotFound { user_id: i64 },
    #[error("Database error: {0}")]
    DatabaseError(#[from] sqlx::Error),
    #[error("Repository manager error: {0}")]
    SemanticSearchManagerError(#[from] SemanticSearchManagerError),
    #[error("GitHub client error: {0}")]
    GitHubError(#[from] octocrab::Error),
    #[error("Task join error: {0}")]
    TaskJoinError(#[from] tokio::task::JoinError),
}

/// JobManager handles asynchronous processing of user starred repositories
/// It tracks active jobs and manages background tasks for generating embeddings
#[derive(Debug, Clone)]
pub struct JobManager {
    repo_manager: SemanticSearchManager,
    database: Database,
    active_jobs: Arc<DashMap<i64, (i32, JoinHandle<()>)>>, // (user_id, (job_id, handle))
}

impl JobManager {
    /// Create a new JobManager instance
    pub fn new(repo_manager: SemanticSearchManager, database: Database) -> Self {
        Self {
            repo_manager,
            database,
            active_jobs: Arc::new(DashMap::new()),
        }
    }

    /// Initialize the JobManager by cleaning up any stale jobs from previous server runs
    /// This should be called once during server startup
    pub async fn initialize(&self) -> Result<(), JobError> {
        info!("Initializing JobManager and cleaning up stale jobs...");

        // Find all incomplete jobs (jobs that were running when server shut down)
        let incomplete_jobs = self.database.get_incomplete_jobs().await?;

        if !incomplete_jobs.is_empty() {
            let job_ids: Vec<i32> = incomplete_jobs.iter().map(|job| job.id.unwrap()).collect();
            info!(
                "Found {} stale jobs, marking them as failed: {:?}",
                incomplete_jobs.len(),
                job_ids
            );

            // Mark all stale jobs as failed since they were interrupted
            self.database.fail_jobs(&job_ids).await?;

            info!(
                "Successfully cleaned up {} stale jobs",
                incomplete_jobs.len()
            );
        } else {
            info!("No stale jobs found during initialization");
        }

        Ok(())
    }

    /// Start a background job to process a user's starred repositories
    /// Returns the job ID if successful, or an error if a job is already running for this user
    pub async fn start_job(
        &self,
        user_id: i64,
        api_key: &str,
        github_client: &GitHubClient,
        starred_repos_count: usize,
    ) -> Result<i32, JobError> {
        // Check if job is already running in memory
        if self.active_jobs.contains_key(&user_id) {
            return Err(JobError::JobAlreadyRunning { user_id });
        }

        info!("Starting background job for user: {}", user_id);

        // Create job record in database
        let job = self.database.create_job(user_id.into()).await?;
        let job_id = job.id.unwrap(); // Safe because database returns the ID

        // Clone necessary data for the spawned task
        let repo_manager = self.repo_manager.clone();
        let database = self.database.clone();
        let active_jobs = Arc::clone(&self.active_jobs);

        let api_key = api_key.to_string();
        let github_client = github_client.clone();

        // Spawn the background task
        let handle = tokio::spawn(async move {
            let result = Self::process_user_stars(
                user_id,
                job_id,
                repo_manager,
                &github_client,
                database,
                api_key,
                starred_repos_count,
            )
            .await;

            match result {
                Ok(_) => {
                    info!("Successfully completed job for user: {}", user_id);
                }
                Err(e) => {
                    error!("Job failed for user {}: {:?}", user_id, e);
                }
            }

            // Remove job from active jobs when complete
            active_jobs.remove(&user_id);
        });

        // Store the job ID and handle
        self.active_jobs.insert(user_id, (job_id, handle));

        Ok(job_id)
    }

    /// Internal method to process a user's starred repositories
    async fn process_user_stars(
        user_id: i64,
        job_id: i32,
        repo_manager: SemanticSearchManager,
        github_client: &GitHubClient,
        database: Database,
        api_key: String,
        starred_repos_count: usize,
    ) -> Result<(), JobError> {
        info!("Processing starred repositories for user: {}", user_id);

        // Update job status to fetching stars
        database
            .update_job_status(job_id, "Fetching stars...")
            .await?;

        // Fetch starred repositories via GitHub client
        let octo_repos = github_client.get_starred_repos(starred_repos_count).await?;
        let starred_repos: Vec<Repository> = octo_repos
            .into_iter()
            .map(Repository::from_octocrab)
            .collect();
        info!(
            "Found {} starred repositories for user {}",
            starred_repos.len(),
            user_id
        );

        // Update job with total repos count and status
        database
            .update_job_progress(job_id, starred_repos.len() as i32, 0, 0)
            .await?;
        database
            .update_job_status(job_id, "Creating embeddings...")
            .await?;

        // Generate and store embeddings using RepoManager
        // Progress is now updated incrementally inside generate_and_store_embeddings
        match repo_manager
            .generate_and_store_embeddings(
                user_id.try_into().unwrap(),
                &api_key,
                github_client,
                starred_repos.clone(),
                job_id, // Pass job_id for progress tracking
            )
            .await
        {
            Ok(_) => {
                // No need to update progress here as it's done incrementally
                info!(
                    "Successfully completed embedding generation for user {}",
                    user_id
                );
            }
            Err(e) => {
                // Mark all as failed and propagate error
                database
                    .update_job_progress(
                        job_id,
                        starred_repos.len() as i32,
                        0,
                        starred_repos.len() as i32,
                    )
                    .await?;
                database.fail_job(job_id).await?;
                return Err(e.into());
            }
        }

        // Update user_stars table to mark the job as completed
        let repo_ids: Vec<sqlx::types::Decimal> =
            starred_repos.iter().map(|repo| repo.id).collect();

        if !repo_ids.is_empty() {
            // Get GitHub username from the current user
            let github_user = github_client.get_authenticated_user().await?;
            let github_username = github_user.login;

            database
                .update_user_stars(user_id.into(), &repo_ids, &github_username)
                .await?;

            info!(
                "Updated user_stars table for user {} with {} repositories",
                user_id,
                starred_repos.len()
            );
        }

        // Mark job as completed
        database.complete_job(job_id).await?;

        Ok(())
    }

    /// List all currently active job user IDs
    pub fn list_active_jobs(&self) -> Vec<i64> {
        self.active_jobs.iter().map(|entry| *entry.key()).collect()
    }

    /// Stop a running job for a specific user
    /// Returns an error if no job is found for the user
    pub async fn stop_job(&self, user_id: i64) -> Result<(), JobError> {
        if let Some((_, (job_id, handle))) = self.active_jobs.remove(&user_id) {
            info!("Stopping job for user: {} (job_id: {})", user_id, job_id);
            handle.abort();

            // Wait for the task to complete or be aborted
            match handle.await {
                Ok(_) => {
                    info!("Job stopped successfully for user: {}", user_id);
                    // Mark job as failed in database since it was manually stopped
                    if let Err(e) = self.database.fail_job(job_id).await {
                        warn!("Failed to mark job as failed in database: {}", e);
                    }
                }
                Err(e) if e.is_cancelled() => {
                    info!("Job cancelled for user: {}", user_id);
                    // Mark job as failed in database since it was cancelled
                    if let Err(e) = self.database.fail_job(job_id).await {
                        warn!("Failed to mark job as failed in database: {}", e);
                    }
                }
                Err(e) => warn!("Error while stopping job for user {}: {:?}", user_id, e),
            }

            Ok(())
        } else {
            Err(JobError::JobNotFound { user_id })
        }
    }

    /// Check if a job is currently running for a user
    pub fn is_job_running(&self, user_id: i64) -> bool {
        self.active_jobs.contains_key(&user_id)
    }

    /// Get the number of currently active jobs
    pub fn active_job_count(&self) -> usize {
        self.active_jobs.len()
    }

    /// Get job by ID
    pub async fn get_job(&self, job_id: i32) -> Result<Option<UserJob>, JobError> {
        Ok(self.database.get_job(job_id).await?)
    }

    /// Get latest job for a user
    pub async fn get_latest_job(&self, user_id: i64) -> Result<Option<UserJob>, JobError> {
        Ok(self.database.get_latest_job(user_id.into()).await?)
    }
}
