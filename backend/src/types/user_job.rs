// User job-specific types and implementations will go here

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::{FromRow, types::Decimal};

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct UserJob {
    /// Job ID (SERIAL in database, auto-generated)
    pub id: i32,
    /// GitHub user ID
    pub user_id: Decimal,
    /// Job status (pending, processing, completed, failed)
    pub status: String,
    /// Total number of repositories to process
    pub total_repos: i32,
    /// Number of repositories processed
    pub processed_repos: i32,
    /// Number of repositories that failed processing
    pub failed_repos: i32,
    /// Job creation timestamp
    pub created_at: DateTime<Utc>,
    /// Job last update timestamp
    pub updated_at: DateTime<Utc>,
    /// Job completion timestamp
    pub completed_at: DateTime<Utc>,
}

impl UserJob {
    /// Check if the job is completed (successfully or with failures)
    pub fn is_completed(&self) -> bool {
        self.status == "completed" || self.status == "failed"
    }

    /// Check if the job is currently processing
    pub fn is_processing(&self) -> bool {
        self.status == "processing"
    }

    /// Check if the job is pending
    pub fn is_pending(&self) -> bool {
        self.status == "pending"
    }

    /// Calculate success rate as a percentage
    pub fn success_rate(&self) -> f64 {
        if self.total_repos == 0 {
            return 0.0;
        }
        let successful_repos = self.total_repos - self.failed_repos;
        (successful_repos as f64 / self.total_repos as f64) * 100.0
    }

    /// Calculate completion percentage
    pub fn completion_percentage(&self) -> f64 {
        if self.total_repos == 0 {
            return 0.0;
        }
        (self.processed_repos as f64 / self.total_repos as f64) * 100.0
    }
}

/// Job status constants
pub mod job_status {
    pub const PENDING: &str = "pending";
    pub const PROCESSING: &str = "processing";
    pub const COMPLETED: &str = "completed";
    pub const FAILED: &str = "failed";
}
