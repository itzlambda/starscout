// Database connection utilities and helpers will go here

use anyhow::{Context, Result};
use sqlx::{PgPool, Row, postgres::PgPoolOptions};

/// Initialize a Postgres connection pool and run migrations
pub async fn init_pg_pool(database_url: &str) -> Result<PgPool> {
    // Create connection pool with reasonable settings
    let pool = PgPoolOptions::new()
        .max_connections(10)
        .min_connections(2)
        .connect(database_url)
        .await
        .with_context(|| format!("Failed to connect to database at {database_url}"))?;

    // Run embedded migrations automatically (migrations folder is in the workspace root)
    sqlx::migrate!("./migrations")
        .run(&pool)
        .await
        .with_context(|| "Failed to run database migrations")?;

    tracing::info!("Database connection pool initialized and migrations applied");
    Ok(pool)
}

/// Test the database connection
pub async fn test_connection(pool: &PgPool) -> Result<()> {
    let row = sqlx::query("SELECT 1").fetch_one(pool).await?;

    let value: i32 = row.get(0);
    if value == 1 {
        Ok(())
    } else {
        Err(anyhow::anyhow!("Test query returned unexpected value"))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::env;

    #[tokio::test]
    #[ignore] // Requires database connection
    async fn test_database_connection() {
        // This test requires a test database URL to be set
        if let Ok(database_url) = env::var("TEST_DATABASE_URL") {
            let pool = init_pg_pool(&database_url)
                .await
                .expect("Failed to initialize test database pool");

            test_connection(&pool)
                .await
                .expect("Failed to test database connection");
        }
    }
}
