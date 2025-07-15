# StarScout Backend (Rust)

A high-performance Rust backend for StarScout - a GitHub repository semantic search engine.

## Overview

This is a complete rewrite of the Python FastAPI backend using modern Rust technologies:
- **Axum** for the web framework
- **SQLx** for database operations with PostgreSQL
- **pgvector** for vector similarity search
- **async-openai** for generating embeddings
- **Tokio** for async runtime

## Features

- Semantic search across GitHub repositories
- Vector similarity search using pgvector
- GitHub API integration for repository data
- Background job processing for repository indexing
- OAuth authentication with GitHub
- RESTful API compatible with existing frontend

## Architecture

```
src/
├── main.rs            # Application entry point
├── config.rs          # Configuration management
├── types/             # Domain types and data structures
├── db/                # Database connection and utilities
├── github/            # GitHub API client
├── embedding/         # OpenAI embedding service
├── services/          # Core business logic
├── handlers/          # HTTP request handlers
├── middleware/        # Authentication and logging middleware
└── util.rs            # Helper utilities
```

## Prerequisites

- Rust 1.70+ (latest stable recommended)
- PostgreSQL 14+ with pgvector extension
- GitHub API token
- OpenAI API key

## Setup

1. **Clone and navigate to the backend**:
   ```bash
   cd backend-rust
   ```

2. **Copy environment configuration**:
   ```bash
   cp .env.example .env
   ```

3. **Configure environment variables** in `.env`:
   - `DATABASE_URL`: PostgreSQL connection string
   - `GITHUB_TOKEN`: Your GitHub personal access token
   - `OPENAI_API_KEY`: Your OpenAI API key
   - `PORT`: Server port (default: 8080)
   - `LOG_LEVEL`: Logging level (info, debug, warn, error)

4. **Set up the database**:
   ```bash
   # Install sqlx-cli if not already installed
   cargo install sqlx-cli --no-default-features --features postgres,rustls

   # Run migrations
   sqlx migrate run --database-url $DATABASE_URL
   ```

5. **Build and run**:
   ```bash
   # Development mode
   cargo run

   # Release mode
   cargo run --release
   ```

## Development

### Running Tests
```bash
cargo test
```

### Code Formatting
```bash
cargo fmt
```

### Linting
```bash
cargo clippy
```

### Database Migrations

Create a new migration:
```bash
sqlx migrate add <migration_name>
```

Run pending migrations:
```bash
sqlx migrate run
```

## API Endpoints

The Rust backend maintains the same REST API contract as the Python version:

- `GET /` - Health check
- `GET /api/health` - Detailed health status
- `POST /api/search` - Semantic search
- `GET /api/repositories` - List repositories
- `POST /api/repositories/sync` - Sync GitHub repositories
- `GET /api/jobs/{job_id}` - Get job status

## Configuration

Configuration is managed through environment variables and the `config.rs` module. All settings can be overridden via environment variables.

### Required Environment Variables

- `DATABASE_URL`: PostgreSQL connection string
- `GITHUB_TOKEN`: GitHub API authentication
- `OPENAI_API_KEY`: OpenAI API for embeddings

### Optional Environment Variables

- `PORT`: Server port (default: 8080)
- `LOG_LEVEL`: Logging verbosity (default: info)
- `RUST_LOG`: Rust-specific logging configuration

## Performance

The Rust backend provides significant performance improvements over the Python version:
- Lower memory usage
- Better concurrent request handling
- Faster JSON serialization/deserialization
- Optimized database operations with connection pooling

## Contributing

1. Ensure all tests pass: `cargo test`
2. Format code: `cargo fmt`
3. Run linter: `cargo clippy`
4. Update documentation as needed

## License

This project follows the same license as the main StarScout project. 