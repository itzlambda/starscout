use async_openai::{
    Client as OpenAIClient,
    config::OpenAIConfig,
    types::{CreateEmbeddingRequest, EmbeddingInput},
};
use thiserror::Error;
use tracing::{debug, error, info};

#[derive(Error, Debug)]
pub enum EmbeddingError {
    #[error("OpenAI API error: {0}")]
    ApiError(#[from] async_openai::error::OpenAIError),
    #[error("Configuration error: {0}")]
    ConfigError(String),
    #[error("Input validation error: {0}")]
    ValidationError(String),
}

#[derive(Debug, Clone)]
pub struct OpenAIEmbeddingService {
    model: String,
}

impl Default for OpenAIEmbeddingService {
    fn default() -> Self {
        Self::new()
    }
}

impl OpenAIEmbeddingService {
    /// Create a new OpenAI embedding service.
    ///
    /// It will use the `OPENAI_API_KEY` environment variable if present.
    pub fn new() -> Self {
        Self {
            model: "text-embedding-3-small".to_string(),
        }
    }

    /// Create service with custom model
    pub fn with_model(mut self, model: String) -> Self {
        self.model = model;
        self
    }

    /// Generate embedding for a single text
    pub async fn get_embedding(
        &self,
        text: &str,
        api_key: &str,
    ) -> Result<Vec<f32>, EmbeddingError> {
        if text.is_empty() {
            return Err(EmbeddingError::ValidationError(
                "Input text cannot be empty".to_string(),
            ));
        }

        let embeddings = self.get_embeddings(vec![text.to_string()], api_key).await?;
        embeddings
            .into_iter()
            .next()
            .ok_or_else(|| EmbeddingError::ValidationError("No embedding returned".to_string()))
    }

    /// Generate embeddings for multiple texts with batching
    pub async fn get_embeddings(
        &self,
        texts: Vec<String>,
        api_key: &str,
    ) -> Result<Vec<Vec<f32>>, EmbeddingError> {
        if texts.is_empty() {
            return Ok(Vec::new());
        }

        // Validate input texts
        for (i, text) in texts.iter().enumerate() {
            if text.is_empty() {
                return Err(EmbeddingError::ValidationError(format!(
                    "Text at index {i} cannot be empty"
                )));
            }
        }

        debug!("Getting embeddings for {} texts", texts.len());

        // OpenAI has a limit of ~8192 tokens per request, so we batch requests
        // Each text could be up to ~2000 tokens, so we batch 4 at a time to be safe
        const BATCH_SIZE: usize = 4;
        let mut all_embeddings = Vec::new();

        for batch in texts.chunks(BATCH_SIZE) {
            let batch_embeddings = self.get_embeddings_batch(batch.to_vec(), api_key).await?;
            all_embeddings.extend(batch_embeddings);
        }

        info!("Successfully generated {} embeddings", all_embeddings.len());
        Ok(all_embeddings)
    }

    /// Get embeddings for a single batch
    pub async fn get_embeddings_batch(
        &self,
        texts: Vec<String>,
        api_key: &str,
    ) -> Result<Vec<Vec<f32>>, EmbeddingError> {
        let config = OpenAIConfig::new().with_api_key(api_key.to_string());
        let client = OpenAIClient::with_config(config);

        let request = CreateEmbeddingRequest {
            model: self.model.clone(),
            input: EmbeddingInput::StringArray(texts.clone()),
            encoding_format: None,
            dimensions: None,
            user: None,
        };

        debug!("Making OpenAI embedding request for {} texts", texts.len());

        let response = client.embeddings().create(request).await?;

        debug!("Received {} embeddings from OpenAI", response.data.len());

        // Extract embeddings from response
        let embeddings: Vec<Vec<f32>> = response
            .data
            .into_iter()
            .map(|embedding| embedding.embedding)
            .collect();

        if embeddings.len() != texts.len() {
            return Err(EmbeddingError::ValidationError(format!(
                "Expected {} embeddings, got {}",
                texts.len(),
                embeddings.len()
            )));
        }

        Ok(embeddings)
    }

    /// Get the model being used
    pub fn model(&self) -> &str {
        &self.model
    }
}

/// Helper trait for types that can be converted to embedding text
pub trait ToEmbeddingText {
    fn to_embedding_text(&self) -> String;
}

impl ToEmbeddingText for crate::types::Repository {
    fn to_embedding_text(&self) -> String {
        let mut parts = Vec::new();

        // Add repository name and owner
        parts.push(format!("{}/{}", self.owner, self.name));

        // Add description if available
        if let Some(desc) = &self.description {
            parts.push(desc.clone());
        }

        // Add README content if available (truncate to reasonable length)
        if let Some(readme) = &self.readme_content {
            let truncated = if readme.chars().count() > 2000 {
                let truncated: String = readme.chars().take(2000).collect();
                format!("{truncated}...")
            } else {
                readme.clone()
            };
            parts.push(truncated);
        }

        // Add topics
        if !self.topics.is_empty() {
            parts.push(format!("Topics: {}", self.topics.join(", ")));
        }

        parts.join("\n\n")
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::types::Repository;

    #[test]
    fn test_new_service() {
        let service = OpenAIEmbeddingService::new();
        assert_eq!(service.model(), "text-embedding-3-small");
    }

    #[test]
    fn test_with_model() {
        let service =
            OpenAIEmbeddingService::new().with_model("text-embedding-3-small".to_string());
        assert_eq!(service.model(), "text-embedding-3-small");
    }

    #[test]
    fn test_repository_to_embedding_text() {
        let repo = Repository {
            id: 123.into(),
            name: "test-repo".to_string(),
            owner: "test-owner".to_string(),
            description: Some("A test repository".to_string()),
            readme_content: Some("# Test Repo\nThis is a test".to_string()),
            topics: vec!["rust".to_string(), "testing".to_string()],
            homepage_url: "https://github.com/test-owner/test-repo".to_string(),
            embedding: None,
            created_at: None,
            last_updated: None,
        };

        let text = repo.to_embedding_text();
        assert!(text.contains("test-owner/test-repo"));
        assert!(text.contains("A test repository"));
        assert!(text.contains("# Test Repo"));
        assert!(text.contains("Topics: rust, testing"));
    }

    #[test]
    fn test_repository_to_embedding_text_minimal() {
        let repo = Repository {
            id: 123.into(),
            name: "minimal-repo".to_string(),
            owner: "owner".to_string(),
            description: None,
            readme_content: None,
            topics: vec![],
            homepage_url: "https://github.com/owner/minimal-repo".to_string(),
            embedding: None,
            created_at: None,
            last_updated: None,
        };

        let text = repo.to_embedding_text();
        assert_eq!(text, "owner/minimal-repo");
    }
}
