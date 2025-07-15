use crate::app_state::AppState;
use crate::http::success;
use axum::{extract::State, response::IntoResponse};
use serde_json::json;
use tracing::instrument;

#[instrument(skip_all)]
pub async fn get_settings_handler(State(app_state): State<AppState>) -> impl IntoResponse {
    success(json!({
        "api_key_star_threshold": app_state.config.github_star_threshold,
        "github_following_threshold": app_state.config.github_following_threshold,
    }))
}
