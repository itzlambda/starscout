pub mod health;
pub mod jobs;
pub mod search;
pub mod settings;
pub mod stars;
pub mod user_exists;

// HTTP request handlers for Axum routes

pub use health::health_handler;
pub use settings::get_settings_handler;
pub use user_exists::user_exists_handler;
