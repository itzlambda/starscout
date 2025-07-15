#![allow(clippy::result_large_err)]

pub mod app_state;
pub mod config;
pub mod db;
pub mod embedding;
pub mod extractors;
pub mod github;
pub mod handlers;
pub mod http;
pub mod init;
pub mod middleware;
pub mod services;
pub mod types;

use std::sync::Arc;

// Re-export AppState for convenience
pub use app_state::AppState;
use axum::middleware::from_fn;
use axum::{Router, response::Json, routing::get};
use serde_json::{Value, json};
use tower_governor::{GovernorLayer, governor::GovernorConfigBuilder};
use tower_http::{cors::CorsLayer, trace::TraceLayer};
use tracing::instrument;

use crate::handlers::jobs::job_status_handler;
use crate::handlers::search::{semantic_search_global_handler, semantic_search_handler};
use crate::handlers::stars::generate_embeddings_handler;
use crate::handlers::{get_settings_handler, user_exists_handler};
use crate::middleware::auth;
use crate::middleware::user_key_extractor::UserToken;

pub fn build_router(state: AppState) -> Router {
    let governer_conf = Arc::new(
        GovernorConfigBuilder::default()
            .use_headers()
            .key_extractor(UserToken)
            .per_second(60)
            .burst_size(5)
            .finish()
            .unwrap(),
    );

    // Build search routes with rate limiting
    let rate_limited_routes = Router::new()
        .route("/search", get(semantic_search_handler))
        .route("/search_global", get(semantic_search_global_handler))
        .route("/user/process_star", get(generate_embeddings_handler))
        .layer(GovernorLayer {
            config: Arc::clone(&governer_conf),
        });

    // Build other protected routes (no specific rate limiting)
    let other_protected_routes = Router::new()
        .route("/user/exists", get(user_exists_handler))
        .route("/jobs/status", get(job_status_handler));

    // Combine all protected routes and add auth middleware
    let protected_routes = Router::new()
        .merge(rate_limited_routes)
        .merge(other_protected_routes)
        .layer(from_fn(auth::auth_middleware));

    Router::new()
        .route("/", get(health_check))
        // .route("/health", get(health_check))
        .route("/settings", get(get_settings_handler))
        .merge(protected_routes)
        .layer(CorsLayer::permissive())
        .layer(TraceLayer::new_for_http())
        .with_state(state)
}

/// Simple health check endpoint (not protected)
#[instrument]
pub async fn health_check() -> Json<Value> {
    Json(json!({
        "status": "healthy",
        "message": "starscout API is running",
    }))
}

// Protected endpoint that returns the authenticated user's information
// pub async fn get_user_handler(
//     Extension(AuthenticatedUser(user)): Extension<AuthenticatedUser>,
// ) -> Json<Value> {
//     Json(json!({
//         "login": user.login,
//         "id": user.id,
//         "node_id": user.node_id,
//         "name": user.name,
//         "email": user.email,
//         "avatar_url": user.avatar_url,
//         "html_url": user.html_url
//     }))
// }
