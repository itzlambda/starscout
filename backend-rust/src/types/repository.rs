// Repository-specific types and implementations will go here

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::{FromRow, types::Decimal};

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct RepositoryOwner {
    pub login: String,
    #[serde(alias = "avatarUrl")]
    pub avatar_url: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Repository {
    /// GitHub repository ID (maps to BIGINT in database)
    pub id: Decimal,
    /// Repository name
    pub name: String,
    /// Repository owner login
    pub owner: String,
    /// Repository description (nullable)
    pub description: Option<String>,
    /// Repository README content (nullable)
    pub readme_content: Option<String>,
    /// Repository topics as array
    pub topics: Vec<String>,
    /// Repository homepage/URL (maps to homepage_url in database)
    pub homepage_url: String,
    /// Repository embedding vector (nullable, will be handled separately in queries)
    #[sqlx(skip)]
    pub embedding: Option<Vec<f32>>,
    /// Repository creation timestamp
    pub created_at: Option<DateTime<Utc>>,
    /// Repository last update timestamp  
    pub last_updated: Option<DateTime<Utc>>,
}

impl Repository {
    /// Create a Repository from a GitHub API response
    pub fn from_github_response(data: &serde_json::Value) -> Result<Self, serde_json::Error> {
        Ok(Repository {
            id: data["id"].as_i64().unwrap_or(0).into(),
            name: data["name"].as_str().unwrap_or("").to_string(),
            owner: data["owner"]["login"].as_str().unwrap_or("").to_string(),
            description: data["description"].as_str().map(|s| s.to_string()),
            readme_content: None, // Will be populated separately
            topics: data["topics"]
                .as_array()
                .map(|arr| {
                    arr.iter()
                        .filter_map(|v| v.as_str().map(String::from))
                        .collect()
                })
                .unwrap_or_default(),
            homepage_url: data["html_url"].as_str().unwrap_or("").to_string(),
            embedding: None,    // Will be populated after generating embeddings
            created_at: None,   // Will be set to current timestamp when inserting
            last_updated: None, // Will be set to current timestamp when inserting
        })
    }

    /// Convert from octocrab's Repository model to our Repository type
    pub fn from_octocrab_repository(repo: &octocrab::models::Repository) -> Self {
        Repository {
            id: (repo.id.0 as i64).into(),
            name: repo.name.clone(),
            owner: repo
                .owner
                .as_ref()
                .map(|o| o.login.clone())
                .unwrap_or_default(),
            description: repo.description.clone(),
            readme_content: None, // Will be populated separately
            topics: repo.topics.clone().unwrap_or_default(),
            homepage_url: repo
                .html_url
                .as_ref()
                .map(|u| u.to_string())
                .unwrap_or_default(),
            embedding: None,    // Will be populated after generating embeddings
            created_at: None,   // Will be set to current timestamp when inserting
            last_updated: None, // Will be set to current timestamp when inserting
        }
    }
}

/// For compatibility with the Python API that expects nested owner object
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RepositoryWithOwner {
    pub id: i64,
    pub name: String,
    #[serde(alias = "fullName")]
    pub full_name: String,
    pub description: Option<String>,
    pub readme_content: Option<String>,
    pub topics: Vec<String>,
    pub url: String,
    pub stars: i32,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub embedding: Option<Vec<f32>>,
    pub created_at: Option<DateTime<Utc>>,
    pub last_updated: Option<DateTime<Utc>>,
    pub owner: RepositoryOwner,
}

impl From<Repository> for RepositoryWithOwner {
    fn from(repo: Repository) -> Self {
        let full_name = format!("{}/{}", repo.owner, repo.name);
        RepositoryWithOwner {
            id: repo.id.to_string().parse::<i64>().unwrap_or(0),
            name: repo.name.clone(),
            full_name,
            description: repo.description,
            readme_content: repo.readme_content,
            topics: repo.topics,
            url: repo.homepage_url,
            stars: 0, // Will need to be fetched separately from GitHub API
            embedding: repo.embedding,
            created_at: repo.created_at,
            last_updated: repo.last_updated,
            owner: RepositoryOwner {
                login: repo.owner,
                avatar_url: String::new(), // Will need to be fetched from GitHub API
            },
        }
    }
}
