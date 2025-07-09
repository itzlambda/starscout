// GitHub REST API client using reqwest will go here

use base64::prelude::*;
use octocrab::models::{Author, Repository};
use octocrab::{Error as OctocrabError, Octocrab};

/// A thin wrapper around the octocrab crate to expose only the project-specific
/// GitHub operations we need (fetching the authenticated user, paginated starred
/// repositories, and repository README content).
#[derive(Debug, Clone)]
pub struct GitHubClient {
    inner: Octocrab,
}

impl GitHubClient {
    /// Create a new GitHubClient with the provided personal access token
    pub fn new(token: impl Into<String>) -> Result<Self, OctocrabError> {
        let inner = Octocrab::builder().personal_token(token.into()).build()?;

        Ok(Self { inner })
    }

    /// Get the authenticated user information
    pub async fn get_authenticated_user(&self) -> Result<Author, OctocrabError> {
        let response = self.inner.current().user().await?;
        Ok(response)
    }

    // TODO: since we know number of stars a user and per_page count is defined by us
    // we can use that to fetch all the pages in parallel
    /// Get all starred repositories for the authenticated user
    /// This method handles pagination automatically to collect all starred repos
    pub async fn get_starred_repos(&self) -> Result<Vec<Repository>, OctocrabError> {
        let mut all_repos = Vec::new();
        let per_page = 100;
        let mut page = 1u8;

        loop {
            let repos = self
                .inner
                .current()
                .list_repos_starred_by_authenticated_user()
                .per_page(per_page)
                .page(page)
                .send()
                .await?;

            let is_last_page = repos.items.len() < per_page.into();
            all_repos.extend(repos.items);

            if is_last_page {
                break;
            }

            page += 1;
        }

        Ok(all_repos)
    }

    /// Get the README content for a specific repository.
    /// Returns the raw markdown content as a Some(string) if found, None otherwise.
    pub async fn get_readme(
        &self,
        owner: &str,
        repo: &str,
    ) -> Result<Option<String>, OctocrabError> {
        let res = self.inner.repos(owner, repo).get_readme().send().await?;

        let Some(encoded_content) = res.content else {
            // No README found
            return Ok(None);
        };
        let cleaned = encoded_content.replace("\n", "");

        let decoded_content =
            BASE64_STANDARD
                .decode(&cleaned)
                .map_err(|err| OctocrabError::Serde {
                    source: serde_json::Error::io(std::io::Error::new(
                        std::io::ErrorKind::InvalidData,
                        format!("Base64 decode error: {err}"),
                    )),
                    backtrace: std::backtrace::Backtrace::capture(),
                })?;

        let content = String::from_utf8(decoded_content).map_err(|e| OctocrabError::Serde {
            source: serde_json::Error::io(std::io::Error::new(
                std::io::ErrorKind::InvalidData,
                format!("UTF-8 error: {e}"),
            )),
            backtrace: std::backtrace::Backtrace::capture(),
        })?;

        Ok(Some(content))
    }
}
