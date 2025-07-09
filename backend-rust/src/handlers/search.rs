// Search endpoint handlers will go here

use axum::{
    extract::{Query, State},
    http::HeaderMap,
    response::Response,
};
use serde::{Deserialize, Serialize};
use serde_json::json;
use tracing::instrument;

use crate::{
    app_state::AppState,
    extractors::AuthenticatedContext,
    http::{bad_request, internal_error, success, unauthorized},
    services::semantic_search_manager::{SearchScope, SemanticSearchManager},
    types::repository::Repository,
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

/// Shared handler logic for semantic search
async fn handle_semantic_search(
    app_state: AppState,
    params: SearchQuery,
    user_login: &str,
    headers: HeaderMap,
    scope: SearchScope,
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
        "Performing semantic search for user: {} with query: '{}', top_k: {} (scope: {:?})",
        user_login,
        query,
        top_k,
        scope
    );

    // Perform semantic search
    match repo_manager
        .semantic_search(query, top_k, api_key, scope)
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
                "Semantic search completed for user: {} - found {} results (scope: {:?})",
                user_login,
                response.total_count,
                scope
            );

            success(json!({
                "query": response.query,
                "total_count": response.total_count,
                "results": response.results
            }))
        }
        Err(e) => {
            tracing::error!(
                "Semantic search failed for user {}: {:?} (scope: {:?})",
                user_login,
                e,
                scope
            );
            internal_error(format!("Search failed: {e}"))
        }
    }
}

/// GET /search?query=...&top_k=... - Perform semantic search on repositories
#[instrument(skip_all, fields(user = user.login))]
pub async fn semantic_search_handler(
    State(app_state): State<AppState>,
    Query(params): Query<SearchQuery>,
    AuthenticatedContext { user, .. }: AuthenticatedContext,
    headers: HeaderMap,
) -> Response {
    handle_semantic_search(
        app_state,
        params,
        &user.login,
        headers,
        SearchScope::Starred {
            user_id: user.id.0.into(),
        },
    )
    .await
}

/// GET /search/global?query=...&top_k=... - Perform global semantic search across all repositories
#[instrument(skip_all, fields(user = user.login))]
pub async fn semantic_search_global_handler(
    State(app_state): State<AppState>,
    Query(params): Query<SearchQuery>,
    AuthenticatedContext { user, .. }: AuthenticatedContext,
    headers: HeaderMap,
) -> Response {
    handle_semantic_search(app_state, params, &user.login, headers, SearchScope::Global).await
}
