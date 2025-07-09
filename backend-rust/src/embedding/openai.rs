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

        let all_embeddings = self.get_embeddings_batch(texts, api_key).await?;

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
