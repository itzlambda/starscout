use anyhow::{Context, Result};
use serde::Deserialize;

#[derive(Debug, Deserialize, Clone)]
#[serde(default)]
pub struct AppConfig {
    pub db_name: String,
    pub db_user: String,
    pub db_password: String,
    pub db_host: String,
    pub db_port: u16,

    pub github_api_url: String,
    pub github_star_threshold: u16,
    pub github_following_threshold: u16,

    pub api_host: String,
    pub api_port: u16,

    pub ai_provider: String,
    pub ai_api_key: String,
    pub ai_model_name: String,
    pub ai_embedding_vector_dimension: u16,

    pub allowed_origins: Vec<String>,
    pub log_level: String,
}

impl Default for AppConfig {
    fn default() -> Self {
        Self {
            db_name: "starscout".to_string(),
            db_user: "postgres".to_string(),
            db_password: "postgres".to_string(),
            db_host: "localhost".to_string(),
            db_port: 5432,

            github_api_url: "https://api.github.com".to_string(),
            github_star_threshold: 500,
            github_following_threshold: 50,

            api_host: "0.0.0.0".to_string(),
            api_port: 8000,

            ai_provider: "openai".to_string(),
            ai_api_key: String::new(),
            ai_model_name: "text-embedding-3-small".to_string(),
            ai_embedding_vector_dimension: 1536,

            allowed_origins: vec!["http://localhost:3000".to_string()],
            log_level: "info".to_string(),
        }
    }
}

impl AppConfig {
    pub fn from_env() -> Result<Self> {
        dotenvy::dotenv().ok();

        let settings = config::Config::builder()
            .add_source(config::Environment::default())
            .build()
            .with_context(|| "Failed to build configuration")?;

        settings
            .try_deserialize()
            .with_context(|| "Failed to deserialize configuration from environment")
    }
}
