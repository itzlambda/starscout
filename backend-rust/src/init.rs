use crate::app_state::AppState;
use crate::config::AppConfig;
use crate::db::{Database, init_pg_pool};
use crate::embedding::OpenAIEmbeddingService;
use crate::services::{JobManager, SemanticSearchManager};
use anyhow::{Context, Result};
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

/// Initialize tracing with environment-based configuration
pub fn init_tracing() -> Result<()> {
    tracing_subscriber::registry()
        .with(
            tracing_subscriber::EnvFilter::try_from_default_env().unwrap_or_else(|_| "info".into()),
        )
        .with(tracing_subscriber::fmt::layer())
        .init();
    Ok(())
}

/// Initialize all application services (database, embedding service, etc.)
pub async fn init_services(config: &AppConfig) -> Result<AppState> {
    // Construct database URL from config fields
    let database_url = format!(
        "postgresql://{}:{}@{}:{}/{}",
        config.db_user, config.db_password, config.db_host, config.db_port, config.db_name
    );

    // Initialize database pool
    let db_pool = init_pg_pool(&database_url)
        .await
        .with_context(|| "Failed to initialize database pool")?;

    // Create Database abstraction
    let database = Database::new(db_pool);

    tracing::info!("Database initialized successfully");

    // Initialize OpenAI embedding service
    let embedding_service = OpenAIEmbeddingService::new();

    let repo_manager = SemanticSearchManager::new(embedding_service.clone(), database.clone());
    let job_manager = JobManager::new(repo_manager, database.clone());

    tracing::info!("OpenAI embedding service initialized successfully");

    Ok(AppState {
        database,
        embedding_service,
        config: config.clone(),
        job_manager,
    })
}
