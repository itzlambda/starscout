use crate::config::AppConfig;
use crate::db::Database;
use crate::embedding::OpenAIEmbeddingService;
use crate::services::JobManager;

/// Shared application state containing all services
#[derive(Clone)]
pub struct AppState {
    pub database: Database,
    pub embedding_service: OpenAIEmbeddingService,
    pub config: AppConfig,
    pub job_manager: JobManager,
}
