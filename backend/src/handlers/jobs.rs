// Job endpoint handlers for tracking processing progress

use axum::{extract::State, response::IntoResponse};
use serde_json::json;
use tracing::instrument;

use crate::{
    app_state::AppState,
    extractors::AuthenticatedUser,
    http::{internal_error, success},
};

/// GET /jobs/status - Get current job processing status for the authenticated user
/// Returns the latest job information, whether a job is currently running, and overall status
#[instrument(skip_all, fields(user = user.login))]
pub async fn job_status_handler(
    State(app_state): State<AppState>,
    AuthenticatedUser(user): AuthenticatedUser,
) -> impl IntoResponse {
    tracing::debug!("Job status requested by user: {}", user.login);

    let is_running = app_state.job_manager.is_job_running(user.id);

    // Try to get the latest job for this user
    match app_state.job_manager.get_latest_job(user.id).await {
        Ok(Some(job)) => success(json!({
            "job": job,
            "is_running": is_running,
            "user_id": user.id,
            "total_active_jobs": app_state.job_manager.active_job_count()
        })),
        Ok(None) => success(json!({
            "job": null,
            "is_running": is_running,
            "user_id": user.id,
            "total_active_jobs": app_state.job_manager.active_job_count(),
            "message": "No jobs found for user"
        })),
        Err(e) => {
            tracing::error!("Failed to get latest job for user {}: {}", user.id, e);
            internal_error("Failed to get job status")
        }
    }
}
