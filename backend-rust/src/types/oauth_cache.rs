// OAuth cache-specific types and implementations will go here

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use thiserror::Error;

#[derive(Error, Debug)]
pub enum OAuthCacheError {
    #[error("Missing required field: {field}")]
    MissingField { field: String },
    #[error("Invalid date format: {0}")]
    InvalidDateFormat(#[from] chrono::ParseError),
    #[error("JSON parsing error: {0}")]
    JsonError(#[from] serde_json::Error),
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OAuthCacheObject {
    /// GitHub user ID
    pub user_id: String,
    /// GitHub account creation date
    pub created_at: DateTime<Utc>,
    /// GitHub following count
    pub following_count: i32,
    /// GitHub username
    pub github_username: String,
}

impl OAuthCacheObject {
    /// Create a new OAuthCacheObject from GitHub user data
    pub fn new(
        user_id: String,
        created_at: DateTime<Utc>,
        following_count: i32,
        github_username: String,
    ) -> Self {
        OAuthCacheObject {
            user_id,
            created_at,
            following_count,
            github_username,
        }
    }

    /// Create from GitHub API response JSON
    pub fn from_github_user(data: &serde_json::Value) -> Result<Self, OAuthCacheError> {
        let user_id = data["id"]
            .as_i64()
            .ok_or_else(|| OAuthCacheError::MissingField {
                field: "id".to_string(),
            })?
            .to_string();

        let github_username = data["login"]
            .as_str()
            .ok_or_else(|| OAuthCacheError::MissingField {
                field: "login".to_string(),
            })?
            .to_string();

        let created_at_str =
            data["created_at"]
                .as_str()
                .ok_or_else(|| OAuthCacheError::MissingField {
                    field: "created_at".to_string(),
                })?;

        let created_at = DateTime::parse_from_rfc3339(created_at_str)?.with_timezone(&Utc);

        let following_count = data["following"].as_i64().unwrap_or(0) as i32;

        Ok(OAuthCacheObject::new(
            user_id,
            created_at,
            following_count,
            github_username,
        ))
    }
}
