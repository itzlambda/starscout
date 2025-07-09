// Stars endpoint handlers will go here

use axum::{extract::State, http::HeaderMap, response::Response};
use serde_json::json;
use tracing::instrument;

use crate::{
    app_state::AppState,
    extractors::AuthenticatedContext,
    http::{internal_error, success},
};

#[instrument(skip_all, fields(user = user.login))]
pub async fn generate_embeddings_handler(
    State(app_state): State<AppState>,
    AuthenticatedContext {
        user,
        github_client,
    }: AuthenticatedContext,
    headers: HeaderMap,
) -> Response {
    // Check if user has more starred repos than the configured threshold and require API key
    let user_provided_key = headers
        .get("Api_key")
        .and_then(|h| h.to_str().ok())
        .map(str::trim);

    // Get starred repositories count to enforce API key requirement
    let starred_repos_count = match github_client.get_starred_repos().await {
        Ok(repos) => repos.len(),
        Err(e) => {
            tracing::error!(
                "Failed to fetch starred repositories for user {}: {:?}",
                user.login,
                e
            );
            return internal_error("Failed to fetch starred repositories");
        }
    };

    if starred_repos_count > app_state.config.api_key_star_threshold.into()
        && user_provided_key.is_none()
    {
        return internal_error(format!(
            "API key required: User has {starred_repos_count} starred repos (>{}). Please provide your own API key in the Api_key header.",
            app_state.config.api_key_star_threshold
        ));
    }

    // Use provided API key or fall back to default
    let api_key = match user_provided_key {
        Some(key) => key,
        _ => &app_state.config.ai_api_key,
    };

    let user_id = user.id;

    tracing::info!(
        "Starting background embedding job for user: {} ({}) with {} starred repos",
        user.login,
        user_id,
        starred_repos_count
    );

    // Start background job using JobManager
    match app_state
        .job_manager
        .start_job(user_id.0 as i64, api_key, &github_client)
        .await
    {
        Ok(job_id) => {
            tracing::info!(
                "Job started for user: {} with job_id: {}",
                user.login,
                job_id
            );
            success(json!({
                "message": "Embedding job started",
                "job_id": job_id,
                "user_id": user_id,
                "github_user": user.login
            }))
        }
        Err(e) => {
            tracing::error!(
                "Failed to start embedding job for user {}: {:?}",
                user.login,
                e
            );
            internal_error(format!("Failed to start embedding job: {e}"))
        }
    }
}
