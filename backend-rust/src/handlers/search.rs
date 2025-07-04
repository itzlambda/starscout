// Search endpoint handlers will go here

use axum::{
    extract::{Query, State},
    http::HeaderMap,
    response::Response,
};
use serde::{Deserialize, Serialize};
use serde_json::json;

use crate::{
    app_state::AppState,
    extractors::AuthenticatedContext,
    http::{bad_request, internal_error, success, unauthorized},
    services::semantic_search_manager::SemanticSearchManager,
    types::Repository,
};

/// Query parameters for semantic search
#[derive(Deserialize)]
pub struct SearchQuery {
    /// The search query string
    pub query: String,
    /// Number of results to return (default: 10, max: 50)
    pub top_k: Option<usize>,
}

/// Response format for semantic search results
#[derive(Serialize)]
pub struct SearchResult {
    pub repository: Repository,
    pub similarity_score: f32,
}

/// Response wrapper for search results
#[derive(Serialize)]
pub struct SearchResponse {
    pub query: String,
    pub results: Vec<SearchResult>,
    pub total_count: usize,
}

/// GET /search?query=...&top_k=... - Perform semantic search on repositories
pub async fn semantic_search_handler(
    State(app_state): State<AppState>,
    Query(params): Query<SearchQuery>,
    AuthenticatedContext { user, .. }: AuthenticatedContext,
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

    // Validate query parameters
    let query = params.query.trim();
    if query.is_empty() {
        return bad_request("Query parameter cannot be empty");
    }

    // Validate top_k parameter (default: 10, max: 50)
    let top_k = params.top_k.unwrap_or(10);
    if top_k == 0 || top_k > 50 {
        return bad_request("top_k must be between 1 and 50");
    }

    // Create RepoManager for this request
    let repo_manager = SemanticSearchManager::new(
        app_state.embedding_service.clone(),
        app_state.database.clone(),
    );

    tracing::info!(
        "Performing semantic search on starred repos for user: {} with query: '{}', top_k: {}",
        user.login,
        query,
        top_k
    );

    // Perform semantic search on user's starred repositories
    match repo_manager
        .semantic_search_starred(query, user.id.into(), top_k, api_key)
        .await
    {
        Ok(results) => {
            let search_results: Vec<SearchResult> = results
                .into_iter()
                .map(|(repository, similarity_score)| SearchResult {
                    repository,
                    similarity_score,
                })
                .collect();

            let response = SearchResponse {
                query: query.to_string(),
                total_count: search_results.len(),
                results: search_results,
            };

            tracing::info!(
                "Starred repositories search completed for user: {} - found {} results",
                user.login,
                response.total_count
            );

            success(json!({
                "query": response.query,
                "total_count": response.total_count,
                "results": response.results
            }))
        }
        Err(e) => {
            tracing::error!(
                "Starred repositories search failed for user {}: {:?}",
                user.login,
                e
            );
            internal_error(format!("Search failed: {e}"))
        }
    }
}

/// GET /search/global?query=...&top_k=... - Perform global semantic search across all repositories
pub async fn semantic_search_global_handler(
    State(app_state): State<AppState>,
    Query(params): Query<SearchQuery>,
    AuthenticatedContext {
        user,
        github_client: _,
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

    // Validate query parameters
    let query = params.query.trim();
    if query.is_empty() {
        return bad_request("Query parameter cannot be empty");
    }

    // Validate top_k parameter (default: 10, max: 50)
    let top_k = params.top_k.unwrap_or(10);
    if top_k == 0 || top_k > 50 {
        return bad_request("top_k must be between 1 and 50");
    }

    // Create RepoManager for this request
    let repo_manager = SemanticSearchManager::new(
        app_state.embedding_service.clone(),
        app_state.database.clone(),
    );

    tracing::info!(
        "Performing global semantic search for user: {} with query: '{}', top_k: {}",
        user.login,
        query,
        top_k
    );

    // Perform global semantic search across all repositories
    match repo_manager.semantic_search(query, top_k, api_key).await {
        Ok(results) => {
            let search_results: Vec<SearchResult> = results
                .into_iter()
                .map(|(repository, similarity_score)| SearchResult {
                    repository,
                    similarity_score,
                })
                .collect();

            let response = SearchResponse {
                query: query.to_string(),
                total_count: search_results.len(),
                results: search_results,
            };

            tracing::info!(
                "Global semantic search completed for user: {} - found {} results",
                user.login,
                response.total_count
            );

            success(json!({
                "query": response.query,
                "total_count": response.total_count,
                "results": response.results
            }))
        }
        Err(e) => {
            tracing::error!(
                "Global semantic search failed for user {}: {:?}",
                user.login,
                e
            );
            internal_error(format!("Search failed: {e}"))
        }
    }
}
