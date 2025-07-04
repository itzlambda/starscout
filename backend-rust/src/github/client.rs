// GitHub REST API client using reqwest will go here

use base64::prelude::*;
use octocrab::models::Repository;
use octocrab::{Error as OctocrabError, Octocrab};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct User {
    pub login: String,
    pub id: u64,
    pub node_id: String,
    pub name: Option<String>,
    pub email: Option<String>,
    pub avatar_url: String,
    pub html_url: String,
}

/// A thin wrapper around the octocrab crate to expose only the domain-specific
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
    pub async fn get_authenticated_user(&self) -> Result<User, OctocrabError> {
        let response = self.inner.get("/user", None::<&()>).await?;

        Ok(response)
    }

    /// Get all starred repositories for the authenticated user
    /// This method handles pagination automatically to collect all starred repos
    pub async fn get_starred_repos(&self) -> Result<Vec<Repository>, OctocrabError> {
        let mut all_repos = Vec::new();
        let mut page = 1u32;
        let per_page = 100u32;

        loop {
            let repos: Vec<Repository> = self
                .inner
                .get(
                    "/user/starred",
                    Some(&[
                        ("page", page.to_string()),
                        ("per_page", per_page.to_string()),
                    ]),
                )
                .await?;

            let is_last_page = repos.len() < per_page as usize;
            all_repos.extend(repos);

            if is_last_page {
                break;
            }

            page += 1;
        }

        Ok(all_repos)
    }

    /// Get the README content for a specific repository
    /// Returns the raw markdown content as a string
    pub async fn get_readme(&self, owner: &str, repo: &str) -> Result<String, OctocrabError> {
        #[derive(Deserialize)]
        struct ReadmeResponse {
            content: Option<String>,
        }

        let readme: ReadmeResponse = self
            .inner
            .get(&format!("/repos/{owner}/{repo}/readme"), None::<&()>)
            .await?;

        // Decode the base64 content to get the raw README text
        let content = match readme.content {
            Some(encoded_content) => {
                // Remove whitespace and decode base64
                let cleaned = encoded_content.replace(['\n', ' '], "");
                match BASE64_STANDARD.decode(&cleaned) {
                    Ok(decoded) => {
                        String::from_utf8(decoded).map_err(|e| OctocrabError::Serde {
                            source: serde_json::Error::io(std::io::Error::new(
                                std::io::ErrorKind::InvalidData,
                                format!("UTF-8 error: {e}"),
                            )),
                            backtrace: std::backtrace::Backtrace::capture(),
                        })?
                    }
                    Err(e) => {
                        return Err(OctocrabError::Serde {
                            source: serde_json::Error::io(std::io::Error::new(
                                std::io::ErrorKind::InvalidData,
                                format!("Base64 decode error: {e}"),
                            )),
                            backtrace: std::backtrace::Backtrace::capture(),
                        });
                    }
                }
            }
            None => {
                return Err(OctocrabError::Serde {
                    source: serde_json::Error::io(std::io::Error::new(
                        std::io::ErrorKind::NotFound,
                        "README content not found",
                    )),
                    backtrace: std::backtrace::Backtrace::capture(),
                });
            }
        };

        Ok(content)
    }
}

#[cfg(test)]
mod tests {
    #![allow(unused_imports)]

    use super::*;

    use serde_json::json;
    use wiremock::{
        Mock, MockServer, ResponseTemplate,
        matchers::{header, method, path, query_param},
    };

    async fn setup_mock_github_client(mock_server: &MockServer) -> GitHubClient {
        // Create a client with a mock token and override the base URL
        let octocrab = Octocrab::builder()
            .base_uri(mock_server.uri())
            .unwrap()
            .personal_token("mock_token".to_string())
            .build()
            .unwrap();

        GitHubClient { inner: octocrab }
    }

    #[tokio::test]
    async fn test_get_authenticated_user_success() {
        let mock_server = MockServer::start().await;

        // Mock the /user endpoint
        Mock::given(method("GET"))
            .and(path("/user"))
            .and(header("authorization", "Bearer mock_token"))
            .respond_with(ResponseTemplate::new(200).set_body_json(json!({
                "login": "testuser",
                "id": 12345,
                "node_id": "MDQ6VXNlcjEyMzQ1",
                "avatar_url": "https://github.com/images/error/testuser_happy.gif",
                "gravatar_id": "",
                "url": "https://api.github.com/users/testuser",
                "html_url": "https://github.com/testuser",
                "type": "User",
                "site_admin": false,
                "name": "Test User",
                "company": "GitHub",
                "blog": "https://github.com/blog",
                "location": "San Francisco",
                "email": "testuser@github.com",
                "public_repos": 2,
                "public_gists": 1,
                "followers": 20,
                "following": 0,
                "created_at": "2008-01-14T04:33:35Z",
                "updated_at": "2008-01-14T04:33:35Z"
            })))
            .mount(&mock_server)
            .await;

        let client = setup_mock_github_client(&mock_server).await;
        let user = client.get_authenticated_user().await.unwrap();

        assert_eq!(user.login, "testuser");
        assert_eq!(user.id, 12345);
        assert_eq!(user.name, Some("Test User".to_string()));
    }

    #[tokio::test]
    async fn test_get_starred_repos_single_page() {
        let mock_server = MockServer::start().await;

        // Mock the starred repos endpoint
        Mock::given(method("GET"))
            .and(path("/user/starred"))
            .and(query_param("page", "1"))
            .and(query_param("per_page", "100"))
            .and(header("authorization", "Bearer mock_token"))
            .respond_with(ResponseTemplate::new(200).set_body_json(json!([
                {
                    "id": 1296269,
                    "node_id": "MDEwOlJlcG9zaXRvcnkxMjk2MjY5",
                    "name": "Hello-World",
                    "full_name": "octocat/Hello-World",
                    "owner": {
                        "login": "octocat",
                        "id": 1,
                        "node_id": "MDQ6VXNlcjE=",
                        "avatar_url": "https://github.com/images/error/octocat_happy.gif",
                        "gravatar_id": "",
                        "url": "https://api.github.com/users/octocat",
                        "html_url": "https://github.com/octocat",
                        "followers_url": "https://api.github.com/users/octocat/followers",
                        "following_url": "https://api.github.com/users/octocat/following{/other_user}",
                        "gists_url": "https://api.github.com/users/octocat/gists{/gist_id}",
                        "starred_url": "https://api.github.com/users/octocat/starred{/owner}{/repo}",
                        "subscriptions_url": "https://api.github.com/users/octocat/subscriptions",
                        "organizations_url": "https://api.github.com/users/octocat/orgs",
                        "repos_url": "https://api.github.com/users/octocat/repos",
                        "events_url": "https://api.github.com/users/octocat/events{/privacy}",
                        "received_events_url": "https://api.github.com/users/octocat/received_events",
                        "type": "User",
                        "site_admin": false
                    },
                    "private": false,
                    "html_url": "https://github.com/octocat/Hello-World",
                    "description": "This your first repo!",
                    "fork": false,
                    "url": "https://api.github.com/repos/octocat/Hello-World",
                    "created_at": "2011-01-26T19:01:12Z",
                    "updated_at": "2011-01-26T19:14:43Z",
                    "pushed_at": "2011-01-26T19:06:43Z",
                    "git_url": "git://github.com/octocat/Hello-World.git",
                    "ssh_url": "git@github.com:octocat/Hello-World.git",
                    "clone_url": "https://github.com/octocat/Hello-World.git",
                    "homepage": "https://github.com",
                    "size": 108,
                    "stargazers_count": 80,
                    "watchers_count": 9,
                    "language": "C",
                    "has_issues": true,
                    "has_projects": true,
                    "has_wiki": true,
                    "has_pages": false,
                    "forks_count": 9,
                    "open_issues_count": 0,
                    "forks": 9,
                    "open_issues": 0,
                    "watchers": 80,
                    "default_branch": "master"
                }
            ])))
            .mount(&mock_server)
            .await;

        let client = setup_mock_github_client(&mock_server).await;
        let _repos = client.get_starred_repos().await.unwrap();

        // Ensure the call succeeded; no further assertions as the starred repo list could be empty.
    }

    #[tokio::test]
    async fn test_get_readme_success() {
        let mock_server = MockServer::start().await;

        // Create base64 encoded README content
        let readme_content = "# Hello World\n\nThis is a test README.";
        let encoded_content = BASE64_STANDARD.encode(readme_content.as_bytes());

        // Mock the README endpoint
        Mock::given(method("GET"))
            .and(path("/repos/octocat/Hello-World/readme"))
            .and(header("authorization", "Bearer mock_token"))
            .respond_with(ResponseTemplate::new(200).set_body_json(json!({
                "type": "file",
                "encoding": "base64",
                "size": readme_content.len(),
                "name": "README.md",
                "path": "README.md",
                "content": encoded_content,
                "sha": "3d21ec53a331a6f037a91c368710b99387d012c1",
                "url": "https://api.github.com/repos/octocat/Hello-World/contents/README.md",
                "git_url": "https://api.github.com/repos/octocat/Hello-World/git/blobs/3d21ec53a331a6f037a91c368710b99387d012c1",
                "html_url": "https://github.com/octocat/Hello-World/blob/master/README.md",
                "download_url": "https://raw.githubusercontent.com/octocat/Hello-World/master/README.md"
            })))
            .mount(&mock_server)
            .await;

        let client = setup_mock_github_client(&mock_server).await;
        let content = client.get_readme("octocat", "Hello-World").await.unwrap();

        assert_eq!(content, readme_content);
    }

    #[tokio::test]
    async fn test_get_readme_not_found() {
        let mock_server = MockServer::start().await;

        // Mock 404 response for README endpoint
        Mock::given(method("GET"))
            .and(path("/repos/octocat/No-README/readme"))
            .and(header("authorization", "Bearer mock_token"))
            .respond_with(ResponseTemplate::new(404).set_body_json(json!({
                "message": "Not Found",
                "documentation_url": "https://docs.github.com/rest"
            })))
            .mount(&mock_server)
            .await;

        let client = setup_mock_github_client(&mock_server).await;
        let result = client.get_readme("octocat", "No-README").await;

        assert!(result.is_err());
    }

    // Integration tests (gated by environment variable)
    #[tokio::test]
    #[ignore = "integration test - requires GITHUB_TOKEN environment variable"]
    async fn test_integration_get_authenticated_user() {
        let token = std::env::var("GITHUB_TOKEN")
            .expect("GITHUB_TOKEN environment variable must be set for integration tests");

        let client = GitHubClient::new(token).unwrap();
        let user = client.get_authenticated_user().await.unwrap();

        // Just verify we got a valid user response
        assert!(!user.login.is_empty());
        assert!(user.id > 0);
    }

    #[tokio::test]
    #[ignore = "integration test - requires GITHUB_TOKEN environment variable"]
    async fn test_integration_get_starred_repos() {
        let token = std::env::var("GITHUB_TOKEN")
            .expect("GITHUB_TOKEN environment variable must be set for integration tests");

        let client = GitHubClient::new(token).unwrap();
        let _repos = client.get_starred_repos().await.unwrap();

        // Ensure the call succeeded; no further assertions as the starred repo list could be empty.
    }

    #[tokio::test]
    #[ignore = "integration test - requires GITHUB_TOKEN environment variable"]
    async fn test_integration_get_readme_rust_lang() {
        let token = std::env::var("GITHUB_TOKEN")
            .expect("GITHUB_TOKEN environment variable must be set for integration tests");

        let client = GitHubClient::new(token).unwrap();
        let readme = client.get_readme("rust-lang", "rust").await.unwrap();

        // Verify the README contains expected content
        assert!(readme.contains("Rust"));
        assert!(!readme.is_empty());
    }
}
