use serde::{Deserialize, Serialize};

// Re-export all domain types
pub mod oauth_cache;
pub mod repository;
pub mod user_job;

// Re-export structs for easy importing
pub use oauth_cache::{OAuthCacheError, OAuthCacheObject};
pub use user_job::{UserJob, job_status};

// Common types that might be shared across modules
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ApiResponse<T> {
    pub success: bool,
    pub data: Option<T>,
    pub message: Option<String>,
}

impl<T> ApiResponse<T> {
    pub fn success(data: T) -> Self {
        ApiResponse {
            success: true,
            data: Some(data),
            message: None,
        }
    }

    pub fn error(message: String) -> Self {
        ApiResponse {
            success: false,
            data: None,
            message: Some(message),
        }
    }
}
