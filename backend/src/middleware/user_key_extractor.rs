use chrono::Utc;
use http::{Request, StatusCode};
use serde::{Deserialize, Serialize};
use tower_governor::{GovernorError, key_extractor::KeyExtractor};

#[derive(Debug, Serialize, Deserialize, Clone, Eq, PartialEq)]
pub struct UserToken;

impl KeyExtractor for UserToken {
    type Key = String;

    fn extract<B>(&self, req: &Request<B>) -> Result<Self::Key, GovernorError> {
        // HACK: bypass rate limit if user has passed an Api_key header
        // Check if Api_key header is present - if so, bypass rate limiting
        if req.headers().get("Api_key").is_some() {
            // Return a unique key based on current timestamp to bypass rate limiting
            return Ok(format!(
                "api_key_bypass_{}",
                Utc::now().timestamp_nanos_opt().unwrap_or_default()
            ));
        }

        // Otherwise, use the existing logic with Authorization header
        req.headers()
            .get("Authorization")
            .and_then(|token| token.to_str().ok())
            .and_then(|token| token.strip_prefix("Bearer "))
            .map(|token| token.trim().to_owned())
            .ok_or(GovernorError::Other {
                code: StatusCode::UNAUTHORIZED,
                msg: Some("You don't have permission to access".to_string()),
                headers: None,
            })
    }

    fn key_name(&self, key: &Self::Key) -> Option<String> {
        Some(key.to_string())
    }

    fn name(&self) -> &'static str {
        "UserToken"
    }
}
