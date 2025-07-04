use axum::{extract::FromRequestParts, response::Response};
use http::request::Parts;

use crate::{
    github::{GitHubClient, User},
    http::unauthorized,
};
// use crate::http::unauthorized;
// use axum::{extract::FromRequestParts, http::request::Parts, response::Response};

/// Extractor for authenticated user, automatically extracts User from request extensions
#[derive(Debug, Clone)]
pub struct AuthenticatedUser(pub User);

impl<S> FromRequestParts<S> for AuthenticatedUser
where
    S: Send + Sync,
{
    type Rejection = Response;

    async fn from_request_parts(parts: &mut Parts, _state: &S) -> Result<Self, Self::Rejection> {
        parts
            .extensions
            .get::<User>()
            .map(|user| AuthenticatedUser(user.clone()))
            .ok_or_else(|| unauthorized("User not found in request extensions"))
    }
}

/// Extractor for GitHub client, automatically extracts GitHubClient from request extensions  
#[derive(Debug, Clone)]
pub struct AuthenticatedGitHubClient(pub GitHubClient);

impl<S> FromRequestParts<S> for AuthenticatedGitHubClient
where
    S: Send + Sync,
{
    type Rejection = Response;

    async fn from_request_parts(parts: &mut Parts, _state: &S) -> Result<Self, Self::Rejection> {
        parts
            .extensions
            .get::<GitHubClient>()
            .map(|client| AuthenticatedGitHubClient(client.clone()))
            .ok_or_else(|| unauthorized("GitHub client not found in request extensions"))
    }
}

/// Combined extractor for both user and GitHub client
#[derive(Debug, Clone)]
pub struct AuthenticatedContext {
    pub user: User,
    pub github_client: GitHubClient,
}

impl<S> FromRequestParts<S> for AuthenticatedContext
where
    S: Send + Sync,
{
    type Rejection = Response;

    async fn from_request_parts(parts: &mut Parts, _state: &S) -> Result<Self, Self::Rejection> {
        let user = parts
            .extensions
            .get::<User>()
            .cloned()
            .ok_or_else(|| unauthorized("User not found in request extensions"))?;

        let github_client = parts
            .extensions
            .get::<GitHubClient>()
            .cloned()
            .ok_or_else(|| unauthorized("GitHub client not found in request extensions"))?;

        Ok(AuthenticatedContext {
            user,
            github_client,
        })
    }
}
