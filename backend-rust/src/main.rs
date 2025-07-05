use anyhow::{Context, Result};
use tokio::net::TcpListener;

use starscout_backend::build_router;
use starscout_backend::config::AppConfig;
use starscout_backend::init::{init_services, init_tracing};

#[tokio::main]
async fn main() -> Result<()> {
    // Initialize tracing
    init_tracing()?;

    // Load configuration
    let config = AppConfig::from_env().context("Failed to load configuration")?;

    tracing::info!("Starting StarScout backend server...");

    // Initialize services
    let app_state = init_services(&config).await?;

    // Build the router
    let app = build_router(app_state);

    // Create TCP listener using config.api_port
    let addr = format!("{}:{}", config.api_host, config.api_port);
    let listener = TcpListener::bind(&addr).await?;

    tracing::info!("Server listening on {}", addr);

    // Start server with graceful shutdown
    axum::serve(listener, app)
        .with_graceful_shutdown(shutdown_signal())
        .await?;

    Ok(())
}

async fn shutdown_signal() {
    tokio::signal::ctrl_c()
        .await
        .expect("failed to install Ctrl+C handler");
    tracing::info!("Shutdown signal received, shutting down server...");
}
