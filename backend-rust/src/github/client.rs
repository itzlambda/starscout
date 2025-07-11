// GitHub REST API client using reqwest will go here

use base64::prelude::*;
use octocrab::models::{Author, Repository};
use octocrab::{Error as OctocrabError, Octocrab};
use url::Url;

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

    pub async fn get_starred_repos_count(&self) -> Result<usize, OctocrabError> {
        let response = self
            .inner
            .current()
            .list_repos_starred_by_authenticated_user()
            .per_page(1)
            .send()
            .await?;

        let last_page = response.last.unwrap();
        let star_count = get_page_from_url(&last_page.to_string()).unwrap();
        Ok(star_count.try_into().unwrap())
    }

    /// Get all starred repositories for the authenticated user
    /// This method fetches the first page to get total count, then fetches all remaining pages in parallel
    pub async fn get_starred_repos(
        &self,
        star_count: usize,
    ) -> Result<Vec<Repository>, OctocrabError> {
        let per_page = 100u8;

        let pages = (star_count as f64 / per_page as f64).ceil() as u8;
        let mut handles = Vec::new();

        // Spawn a task for each page
        for page in 1..=pages {
            let client = self.inner.clone();
            let handle = tokio::spawn(async move {
                client
                    .current()
                    .list_repos_starred_by_authenticated_user()
                    .per_page(per_page)
                    .page(page)
                    .send()
                    .await
            });
            handles.push(handle);
        }

        // Collect results from all tasks
        let mut all_repos = Vec::new();
        for handle in handles {
            let page_result = handle.await.map_err(|e| OctocrabError::Serde {
                source: serde_json::Error::io(std::io::Error::other(format!(
                    "Task join error: {e}"
                ))),
                backtrace: std::backtrace::Backtrace::capture(),
            })??;

            all_repos.extend(page_result.items);
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

/// Parses a URL and extracts the 'page' query parameter.
pub fn get_page_from_url(url_str: &str) -> Option<u32> {
    Url::parse(url_str)
        .ok()?
        .query_pairs()
        .find_map(|(key, value)| {
            if key == "page" {
                value.parse::<u32>().ok()
            } else {
                None
            }
        })
}
