use axum::{
    http::StatusCode,
    response::{IntoResponse, Json, Response},
};
use serde::Serialize;
use serde_json::json;

/// Create a 401 Unauthorized response with custom message
pub fn unauthorized<S: AsRef<str>>(message: S) -> Response {
    (
        StatusCode::UNAUTHORIZED,
        Json(json!({
            "error": "Unauthorized",
            "message": message.as_ref()
        })),
    )
        .into_response()
}

/// Create a 500 Internal Server Error response with custom message
pub fn internal_error<S: AsRef<str>>(message: S) -> Response {
    (
        StatusCode::INTERNAL_SERVER_ERROR,
        Json(json!({
            "error": "Internal Server Error",
            "message": message.as_ref()
        })),
    )
        .into_response()
}

/// Create a 400 Bad Request response with custom message
pub fn bad_request<S: AsRef<str>>(message: S) -> Response {
    (
        StatusCode::BAD_REQUEST,
        Json(json!({
            "error": "Bad Request",
            "message": message.as_ref()
        })),
    )
        .into_response()
}

/// Create a 200 OK response with custom data
pub fn success<T: Serialize>(data: T) -> Response {
    (StatusCode::OK, Json(data)).into_response()
}

/// Create a 202 Accepted response with custom data
pub fn accepted<T: Serialize>(data: T) -> Response {
    (StatusCode::ACCEPTED, Json(data)).into_response()
}
