use crate::{AppState, extractors::AuthenticatedContext, http::success};
use axum::{extract::State, response::IntoResponse};
use serde_json::json;

pub async fn user_exists_handler(
    State(app_state): State<AppState>,
    AuthenticatedContext { user, .. }: AuthenticatedContext,
) -> impl IntoResponse {
    let user_id = user.id;
    let exists = app_state
        .database
        .user_exists(user_id.into())
        .await
        .unwrap();
    success(json!({ "user_exists": exists }))
}
