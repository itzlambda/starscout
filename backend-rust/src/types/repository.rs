// Repository-specific types and implementations will go here

use rust_decimal::Decimal;

#[derive(Debug, Clone, serde::Serialize)]
pub struct Repository {
    pub id: Decimal,
    pub name: String,
    pub owner: String,
    pub description: Option<String>,
    pub readme_content: Option<String>,
    pub topics: Vec<String>,
    pub homepage_url: String,
    pub created_at: Option<chrono::DateTime<chrono::Utc>>,
    pub last_updated: Option<chrono::DateTime<chrono::Utc>>,
}
