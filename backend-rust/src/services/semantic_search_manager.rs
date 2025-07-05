use crate::db::Database;
use crate::embedding::{EmbeddingError, OpenAIEmbeddingService, ToEmbeddingText};
use crate::github::GitHubClient;
use crate::types::Repository;
use sqlx::types::Decimal;
use thiserror::Error;
use tracing::{debug, error, info, warn};

#[derive(Error, Debug)]
pub enum SemanticSearchManagerError {
    #[error("Database error: {0}")]
    DatabaseError(#[from] sqlx::Error),
    #[error("GitHub API error: {0}")]
    GitHubError(#[from] octocrab::Error),
    #[error("Embedding error: {0}")]
    EmbeddingError(#[from] EmbeddingError),
    #[error("Configuration error: {0}")]
    ConfigError(String),
    #[error("Validation error: {0}")]
    ValidationError(String),
}

#[derive(Debug, Clone)]
pub struct SemanticSearchManager {
    embedding_service: OpenAIEmbeddingService,
    database: Database,
}

impl SemanticSearchManager {
    /// Create a new SemanticSearchManager instance
    pub fn new(embedding_service: OpenAIEmbeddingService, database: Database) -> Self {
        Self {
            embedding_service,
            database,
        }
    }

    async fn find_repos_needing_embeddings(
        &self,
        starred_repos: Vec<Repository>,
    ) -> Result<Vec<Repository>, SemanticSearchManagerError> {
        let repo_ids = starred_repos.iter().map(|repo| repo.id).collect();
        let existing_repo_ids = self.database.existing_repos(repo_ids).await?;
        let needs_embedding = starred_repos
            .iter()
            .filter(|repo| !existing_repo_ids.contains(&repo.id))
            .cloned()
            .collect();
        Ok(needs_embedding)
    }

    /// Generate embeddings for a user's starred repositories and store them
    pub async fn generate_and_store_embeddings(
        &self,
        user_id: u64,
        api_key: &str,
        github_client: &GitHubClient,
        starred_repos: Vec<Repository>,
    ) -> Result<(), SemanticSearchManagerError> {
        info!("Starting embedding generation for user: {}", user_id);

        info!("Received {} starred repositories", starred_repos.len());

        if starred_repos.is_empty() {
            info!("No starred repositories found for user {}", user_id);
            return Ok(());
        }

        // Only process repositories that do not already have embeddings
        let repos_to_process = self
            .find_repos_needing_embeddings(starred_repos.clone())
            .await?;

        // Process repositories in batches
        const BATCH_SIZE: usize = 50;
        let mut processed_count = 0;
        let mut failed_count = 0;

        if repos_to_process.is_empty() {
            info!(
                "All repositories already have embeddings for user {}",
                user_id
            );
        } else {
            for batch in repos_to_process.chunks(BATCH_SIZE) {
                match self
                    .process_repository_batch(batch, user_id, api_key, github_client)
                    .await
                {
                    Ok(batch_processed) => {
                        processed_count += batch_processed;
                        info!("Processed batch: {} repositories", batch_processed);
                    }
                    Err(e) => {
                        failed_count += batch.len();
                        error!("Failed to process batch: {:?}", e);
                    }
                }
            }
        }

        info!(
            "Completed embedding generation for user {}: {} processed, {} failed",
            user_id, processed_count, failed_count
        );

        // Update user_stars table with the list of repository IDs
        let repo_ids: Vec<Decimal> = starred_repos.iter().map(|repo| repo.id).collect();
        self.update_user_stars(user_id, &repo_ids, github_client)
            .await?;

        Ok(())
    }

    /// Process a batch of repositories: fetch README, generate embeddings, and store
    async fn process_repository_batch(
        &self,
        repos: &[Repository],
        _user_id: u64,
        api_key: &str,
        github_client: &GitHubClient,
    ) -> Result<usize, SemanticSearchManagerError> {
        let mut processed_repos = Vec::new();

        // Fetch README content for each repository
        for repo in repos {
            let mut enriched_repo = repo.clone();

            // Try to fetch README content
            match github_client.get_readme(&repo.owner, &repo.name).await {
                Ok(readme_content) => {
                    enriched_repo.readme_content = readme_content;
                    debug!("Fetched README for {}/{}", repo.owner, repo.name);
                }
                Err(e) => {
                    warn!(
                        "Failed to fetch README for {}/{}: {:?}",
                        repo.owner, repo.name, e
                    );
                    // Continue without README
                }
            }

            processed_repos.push(enriched_repo);
        }

        // Generate embeddings for all repositories in this batch
        let embedding_texts: Vec<String> = processed_repos
            .iter()
            .map(|repo| repo.to_embedding_text())
            .collect();

        let embeddings = self
            .embedding_service
            .get_embeddings(embedding_texts, api_key)
            .await?;

        // Store repositories and embeddings in database
        for (repo, embedding) in processed_repos.iter().zip(embeddings.iter()) {
            if let Err(e) = self.store_repository_with_embedding(repo, embedding).await {
                error!(
                    "Failed to store repository {}/{}: {:?}",
                    repo.owner, repo.name, e
                );
            }
        }

        Ok(processed_repos.len())
    }

    /// Store a repository with its embedding in the database
    async fn store_repository_with_embedding(
        &self,
        repo: &Repository,
        embedding: &[f32],
    ) -> Result<(), SemanticSearchManagerError> {
        self.database.upsert_repository(repo, embedding).await?;

        debug!(
            "Stored repository {}/{} with embedding",
            repo.owner, repo.name
        );
        Ok(())
    }

    /// Update the user_stars table with the list of starred repository IDs
    async fn update_user_stars(
        &self,
        user_id: u64,
        repo_ids: &[Decimal],
        github_client: &GitHubClient,
    ) -> Result<(), SemanticSearchManagerError> {
        // Get GitHub username from the current user
        let github_user = github_client.get_authenticated_user().await?;
        let github_username = github_user.login;

        let user_id_decimal = sqlx::types::Decimal::from_i128_with_scale(user_id as i128, 0);

        self.database
            .update_user_stars(user_id_decimal, repo_ids, &github_username)
            .await?;

        info!(
            "Updated user_stars for user {} with {} repositories",
            user_id,
            repo_ids.len()
        );
        Ok(())
    }

    /// Perform semantic search on repositories
    pub async fn semantic_search(
        &self,
        query: &str,
        top_k: usize,
        api_key: &str,
    ) -> Result<Vec<(Repository, f32)>, SemanticSearchManagerError> {
        if query.is_empty() {
            return Err(SemanticSearchManagerError::ValidationError(
                "Query cannot be empty".to_string(),
            ));
        }

        if top_k == 0 {
            return Ok(Vec::new());
        }

        debug!(
            "Performing semantic search for query: '{}', top_k: {}",
            query, top_k
        );

        // Generate embedding for the query
        let query_embedding = self.embedding_service.get_embedding(query, api_key).await?;

        // Use Database method for semantic search
        let results = self
            .database
            .semantic_search_repositories(&query_embedding, top_k)
            .await?;

        info!("Found {} results for semantic search query", results.len());
        Ok(results)
    }

    /// Perform semantic search on user's starred repositories only
    pub async fn semantic_search_starred(
        &self,
        query: &str,
        user_id: Decimal,
        top_k: usize,
        api_key: &str,
    ) -> Result<Vec<(Repository, f32)>, SemanticSearchManagerError> {
        if query.is_empty() {
            return Err(SemanticSearchManagerError::ValidationError(
                "Query cannot be empty".to_string(),
            ));
        }

        if top_k == 0 {
            return Ok(Vec::new());
        }

        debug!(
            "Performing semantic search on starred repos for user: {}, query: '{}', top_k: {}",
            user_id, query, top_k
        );

        // Get user's starred repository IDs to check if user has stars
        let starred_repo_ids = self.get_user_starred_repo_ids_by_string(user_id).await?;

        if starred_repo_ids.is_empty() {
            debug!("User {} has no starred repositories", user_id);
            return Ok(Vec::new());
        }

        // Generate embedding for the query
        let query_embedding = self.embedding_service.get_embedding(query, api_key).await?;

        // Use Database method for semantic search on starred repositories
        let results = self
            .database
            .semantic_search_starred_repositories(&query_embedding, user_id, top_k)
            .await?;

        info!(
            "Found {} results for starred repositories search for user {}",
            results.len(),
            user_id
        );
        Ok(results)
    }

    /// Get repository count for statistics
    pub async fn get_repository_count(&self) -> Result<Decimal, SemanticSearchManagerError> {
        self.database
            .get_repository_count()
            .await
            .map_err(SemanticSearchManagerError::DatabaseError)
    }

    /// Get user's starred repository IDs
    pub async fn get_user_starred_repo_ids(
        &self,
        user_id: Decimal,
    ) -> Result<Vec<Decimal>, SemanticSearchManagerError> {
        self.database
            .get_user_starred_repo_ids(user_id)
            .await
            .map_err(SemanticSearchManagerError::DatabaseError)
    }

    /// Get user's starred repository IDs by string user ID
    pub async fn get_user_starred_repo_ids_by_string(
        &self,
        user_id: Decimal,
    ) -> Result<Vec<Decimal>, SemanticSearchManagerError> {
        self.database
            .get_user_starred_repo_ids_by_string(user_id)
            .await
            .map_err(SemanticSearchManagerError::DatabaseError)
    }
}
