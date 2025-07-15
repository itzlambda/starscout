pub mod connection;
pub mod database;

// Re-export the main functions and types for easy access
pub use connection::{init_pg_pool, test_connection};
pub use database::Database;
