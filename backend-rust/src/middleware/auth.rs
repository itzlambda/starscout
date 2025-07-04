use axum::http::header::AUTHORIZATION;
use axum::{body::Body, http::Request, middleware::Next, response::Response};

use crate::{github::GitHubClient, http::unauthorized};

/// Middleware to enforce presence of Authorization Bearer token
/// Returns 401 Unauthorized if missing, malformed, or invalid
pub async fn auth_middleware(mut req: Request<Body>, next: Next) -> Response {
    let headers = req.headers();

    // Check for Authorization header
    let auth_header = match headers.get(AUTHORIZATION) {
        Some(header) => header,
        None => return unauthorized("Missing Authorization header"),
    };

    // Convert to string
    let auth_str = match auth_header.to_str() {
        Ok(s) => s,
        Err(_) => return unauthorized("Invalid Authorization header"),
    };

    // Check Bearer format
    if !auth_str.starts_with("Bearer ") {
        return unauthorized("Authorization header must start with 'Bearer '");
    }

    // Extract token
    let token = auth_str.strip_prefix("Bearer ").unwrap();
    if token.trim().is_empty() {
        return unauthorized("Empty Bearer token");
    }

    // Validate token with GitHub
    let client = match GitHubClient::new(token.to_string()) {
        Ok(client) => client,
        Err(_) => return unauthorized("Failed to create GitHub client"),
    };

    match client.get_authenticated_user().await {
        Ok(user) => {
            // Insert user and client into request extensions for handlers to use
            req.extensions_mut().insert(user);
            req.extensions_mut().insert(client);
            next.run(req).await
        }
        Err(_) => unauthorized("Invalid or expired token"),
    }
}
