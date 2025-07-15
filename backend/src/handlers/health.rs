// Health check endpoint handlers will go here

use crate::app_state::AppState;
use axum::{
    extract::State,
    response::{IntoResponse, Json},
};
use serde_json::json;

/// GET /health - Health check endpoint
pub async fn health_handler(State(_state): State<AppState>) -> impl IntoResponse {
    Json(json!({ "status": "ok" }))
}
