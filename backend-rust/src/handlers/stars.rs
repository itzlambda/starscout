// Stars endpoint handlers will go here

use axum::{extract::State, http::HeaderMap, response::Response};
use serde_json::json;

use crate::{
    app_state::AppState,
    extractors::AuthenticatedContext,
    http::{internal_error, success, unauthorized},
};

pub async fn generate_embeddings_handler(
    State(app_state): State<AppState>,
    AuthenticatedContext {
        user,
        github_client,
    }: AuthenticatedContext,
    headers: HeaderMap,
) -> Response {
    // Enforce presence of Api_key header
    let api_key = match headers
        .get("Api_key")
        .and_then(|h| h.to_str().ok())
        .map(str::trim)
    {
        Some(key) if !key.is_empty() => key,
        _ => return unauthorized("API key required"),
    };

    let user_id = user.id;

    tracing::info!(
        "Starting background embedding job for user: {} ({})",
        user.login,
        user_id
    );

    // Start background job using JobManager
    match app_state
        .job_manager
        .start_job(user_id as i64, api_key, &github_client)
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
