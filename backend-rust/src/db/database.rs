use anyhow::Result;
use chrono::Utc;
use pgvector::Vector;
use sqlx::{PgPool, Row, types::Decimal};

use crate::types::repository::Repository;

/// Database abstraction layer that encapsulates all database operations.
/// This provides a high-level interface for all database interactions,
/// centralizing SQL queries and making testing easier.
#[derive(Debug, Clone)]
pub struct Database {
    pool: PgPool,
}

impl Database {
    /// Create a new Database instance with the given connection pool
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }

    /// Get a reference to the underlying connection pool
    /// This should only be used in tests or special cases
    pub fn pool(&self) -> &PgPool {
        &self.pool
    }

    // ===== Repository Operations =====

    /// Persist/upsert a repository and its embedding
    pub async fn upsert_repository(
        &self,
        repo: &Repository,
        embedding: &[f32],
    ) -> Result<(), sqlx::Error> {
        let vector = Vector::from(embedding.to_vec());
        let now = Utc::now();

        sqlx::query(
            r#"
            INSERT INTO repositories (
                id, name, owner, description, readme_content, topics, 
                homepage_url, embedding, created_at, last_updated
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            ON CONFLICT (id) 
            DO UPDATE SET 
                name = EXCLUDED.name,
                owner = EXCLUDED.owner,
                description = EXCLUDED.description,
                readme_content = EXCLUDED.readme_content,
                topics = EXCLUDED.topics,
                homepage_url = EXCLUDED.homepage_url,
                embedding = EXCLUDED.embedding,
                last_updated = EXCLUDED.last_updated
            "#,
        )
        .bind(repo.id)
        .bind(&repo.name)
        .bind(&repo.owner)
        .bind(&repo.description)
        .bind(&repo.readme_content)
        .bind(&repo.topics)
        .bind(&repo.homepage_url)
        .bind(vector)
        .bind(now)
        .bind(now)
        .execute(&self.pool)
        .await?;
        Ok(())
    }

    /// Get the total count of repositories in the database
    pub async fn get_repository_count(&self) -> Result<Decimal, sqlx::Error> {
        let row = sqlx::query("SELECT COUNT(*) as count FROM repositories")
            .fetch_one(&self.pool)
            .await?;
        Ok(row.get("count"))
    }

    /// Perform semantic search on all repositories
    pub async fn semantic_search_repositories(
        &self,
        query_embedding: &[f32],
        top_k: usize,
    ) -> Result<Vec<(Repository, f32)>, sqlx::Error> {
        let query_vector = Vector::from(query_embedding.to_vec());

        let rows = sqlx::query(
            r#"
            SELECT 
                id, name, owner, description, readme_content, topics, 
                homepage_url, created_at, last_updated,
                1 - (embedding <=> $1) AS similarity_score
            FROM repositories
            ORDER BY embedding <=> $1
            LIMIT $2
            "#,
        )
        .bind(query_vector)
        .bind(top_k as i64)
        .fetch_all(&self.pool)
        .await?;

        let mut results = Vec::new();
        for row in rows {
            let repo = Repository {
                id: row.get("id"),
                name: row.get("name"),
                owner: row.get("owner"),
                description: row.get("description"),
                readme_content: row.get("readme_content"),
                topics: row
                    .get::<Option<Vec<String>>, _>("topics")
                    .unwrap_or_default(),
                homepage_url: row.get("homepage_url"),
                embedding: None,
                created_at: row.get("created_at"),
                last_updated: row.get("last_updated"),
            };

            let similarity_score: f64 = row.get("similarity_score");
            results.push((repo, similarity_score as f32));
        }

        Ok(results)
    }

    /// Perform semantic search on repositories starred by a specific user
    pub async fn semantic_search_starred_repositories(
        &self,
        query_embedding: &[f32],
        user_id: Decimal,
        top_k: usize,
    ) -> Result<Vec<(Repository, f32)>, sqlx::Error> {
        let query_vector = Vector::from(query_embedding.to_vec());

        let rows = sqlx::query(
            r#"
            SELECT 
                r.id, r.name, r.owner, r.description, r.readme_content, r.topics, 
                r.homepage_url, r.created_at, r.last_updated,
                1 - (r.embedding <=> $1) AS similarity_score
            FROM repositories r
            JOIN user_stars us ON us.user_id = $2 AND r.id = ANY(us.repo_ids)
            ORDER BY r.embedding <=> $1
            LIMIT $3
            "#,
        )
        .bind(query_vector)
        .bind(user_id)
        .bind(top_k as i64)
        .fetch_all(&self.pool)
        .await?;

        let mut results = Vec::new();
        for row in rows {
            let repo = Repository {
                id: row.get("id"),
                name: row.get("name"),
                owner: row.get("owner"),
                description: row.get("description"),
                readme_content: row.get("readme_content"),
                topics: row
                    .get::<Option<Vec<String>>, _>("topics")
                    .unwrap_or_default(),
                homepage_url: row.get("homepage_url"),
                embedding: None,
                created_at: row.get("created_at"),
                last_updated: row.get("last_updated"),
            };

            let similarity_score: f64 = row.get("similarity_score");
            results.push((repo, similarity_score as f32));
        }

        Ok(results)
    }

    // ===== User Stars Operations =====

    /// Update or insert user stars entry with repository IDs
    pub async fn update_user_stars(
        &self,
        user_id: Decimal,
        repo_ids: &[Decimal],
        github_username: &str,
    ) -> Result<(), sqlx::Error> {
        let now = Utc::now();
        sqlx::query(
            r#"
            INSERT INTO user_stars (user_id, github_username, repo_ids, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5)
            ON CONFLICT (user_id)
            DO UPDATE SET 
                github_username = EXCLUDED.github_username,
                repo_ids = EXCLUDED.repo_ids,
                updated_at = EXCLUDED.updated_at
            "#,
        )
        .bind(user_id)
        .bind(github_username)
        .bind(repo_ids)
        .bind(now)
        .bind(now)
        .execute(&self.pool)
        .await?;
        Ok(())
    }

    /// Check if a user has any starred repositories stored
    pub async fn user_has_stars(&self, user_id: Decimal) -> Result<bool, sqlx::Error> {
        let row = sqlx::query("SELECT COUNT(*) as count FROM user_stars WHERE user_id = $1")
            .bind(user_id)
            .fetch_one(&self.pool)
            .await?;
        Ok(row.get::<Decimal, _>("count") > Decimal::from(0))
    }

    /// Get user's starred repository IDs
    pub async fn get_user_starred_repo_ids(
        &self,
        user_id: Decimal,
    ) -> Result<Vec<Decimal>, sqlx::Error> {
        let row = sqlx::query("SELECT repo_ids FROM user_stars WHERE user_id = $1")
            .bind(user_id)
            .fetch_optional(&self.pool)
            .await?;
        Ok(row
            .map(|r| r.get::<Vec<Decimal>, _>("repo_ids"))
            .unwrap_or_default())
    }

    /// Check if a user exists in the user_stars table
    pub async fn user_exists(&self, user_id: Decimal) -> Result<bool, sqlx::Error> {
        let row = sqlx::query("SELECT EXISTS (SELECT 1 FROM user_stars WHERE user_id = $1)")
            .bind(user_id)
            .fetch_one(&self.pool)
            .await?;
        Ok(row.get::<bool, _>(0))
    }

    /// Get user's starred repository IDs by string user ID (kept for backward compatibility)
    pub async fn get_user_starred_repo_ids_by_string(
        &self,
        user_id: Decimal,
    ) -> Result<Vec<Decimal>, sqlx::Error> {
        let row = sqlx::query("SELECT repo_ids FROM user_stars WHERE user_id = $1")
            .bind(user_id)
            .fetch_optional(&self.pool)
            .await?;
        Ok(row
            .map(|r| r.get::<Vec<_>, _>("repo_ids"))
            .unwrap_or_default())
    }

    // ===== User Job Operations =====

    /// Create a new job for a user
    pub async fn create_job(&self, user_id: Decimal) -> Result<crate::types::UserJob, sqlx::Error> {
        let row = sqlx::query_as::<_, crate::types::UserJob>(
            r#"
            INSERT INTO user_jobs (user_id, status, total_repos, processed_repos, failed_repos)
            VALUES ($1, 'pending', 0, 0, 0)
            RETURNING id, user_id, status, total_repos, processed_repos, failed_repos, 
                      created_at, updated_at, completed_at
            "#,
        )
        .bind(user_id)
        .fetch_one(&self.pool)
        .await?;
        Ok(row)
    }

    /// Get a job by its ID
    pub async fn get_job(&self, job_id: i32) -> Result<Option<crate::types::UserJob>, sqlx::Error> {
        let job = sqlx::query_as::<_, crate::types::UserJob>(
            r#"
            SELECT id, user_id, status, total_repos, processed_repos, failed_repos, 
                   created_at, updated_at, completed_at
            FROM user_jobs
            WHERE id = $1
            "#,
        )
        .bind(job_id)
        .fetch_optional(&self.pool)
        .await?;
        Ok(job)
    }

    /// Get the latest job for a user
    pub async fn get_latest_job(
        &self,
        user_id: Decimal,
    ) -> Result<Option<crate::types::UserJob>, sqlx::Error> {
        let job = sqlx::query_as::<_, crate::types::UserJob>(
            r#"
            SELECT id, user_id, status, total_repos, processed_repos, failed_repos, 
                   created_at, updated_at, completed_at
            FROM user_jobs
            WHERE user_id = $1
            ORDER BY created_at DESC
            LIMIT 1
            "#,
        )
        .bind(user_id)
        .fetch_optional(&self.pool)
        .await?;
        Ok(job)
    }

    /// Update a job's status
    pub async fn update_job_status(&self, job_id: i32, status: &str) -> Result<(), sqlx::Error> {
        sqlx::query(
            r#"
            UPDATE user_jobs 
            SET status = $1, updated_at = CURRENT_TIMESTAMP
            WHERE id = $2
            "#,
        )
        .bind(status)
        .bind(job_id)
        .execute(&self.pool)
        .await?;
        Ok(())
    }

    /// Update a job's progress
    pub async fn update_job_progress(
        &self,
        job_id: i32,
        total_repos: i32,
        processed_repos: i32,
        failed_repos: i32,
    ) -> Result<(), sqlx::Error> {
        sqlx::query(
            r#"
            UPDATE user_jobs 
            SET total_repos = $1, processed_repos = $2, failed_repos = $3, updated_at = CURRENT_TIMESTAMP
            WHERE id = $4
            "#,
        )
        .bind(total_repos)
        .bind(processed_repos)
        .bind(failed_repos)
        .bind(job_id)
        .execute(&self.pool)
        .await?;
        Ok(())
    }

    /// Update a job to completed status
    pub async fn complete_job(&self, job_id: i32) -> Result<(), sqlx::Error> {
        sqlx::query(
            r#"
            UPDATE user_jobs 
            SET status = 'completed', completed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
            WHERE id = $1
            "#,
        )
        .bind(job_id)
        .execute(&self.pool)
        .await?;
        Ok(())
    }

    /// Update a job to failed status
    pub async fn fail_job(&self, job_id: i32) -> Result<(), sqlx::Error> {
        sqlx::query(
            r#"
            UPDATE user_jobs 
            SET status = 'failed', completed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
            WHERE id = $1
            "#,
        )
        .bind(job_id)
        .execute(&self.pool)
        .await?;
        Ok(())
    }

    // ===== Health Check Operations =====

    /// Test the database connection
    pub async fn test_connection(&self) -> Result<()> {
        let row = sqlx::query("SELECT 1").fetch_one(&self.pool).await?;
        let value: i32 = row.get(0);
        if value == 1 {
            Ok(())
        } else {
            Err(anyhow::anyhow!("Test query returned unexpected value"))
        }
    }

    // ===== Migration and Schema Operations =====

    /// Run database migrations
    pub async fn run_migrations(&self) -> Result<()> {
        sqlx::migrate!("./migrations")
            .run(&self.pool)
            .await
            .map_err(|e| anyhow::anyhow!("Failed to run migrations: {}", e))?;
        Ok(())
    }

    pub(crate) async fn existing_repos(
        &self,
        repo_ids: Vec<Decimal>,
    ) -> Result<Vec<Decimal>, sqlx::Error> {
        let row = sqlx::query(
            r#"
                SELECT id 
                FROM (
                    SELECT id FROM repositories
                    UNION
                    SELECT id FROM repos_without_readme
                ) existing_repos
                WHERE id = ANY($1)
            "#,
        )
        .bind(&repo_ids)
        .fetch_all(&self.pool)
        .await?;

        Ok(row.iter().map(|r| r.get::<Decimal, _>("id")).collect())
    }
}
