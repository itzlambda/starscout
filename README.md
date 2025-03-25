# starscout

starscout is a tool for searching through your GitHub stars using AI.

It uses vector embeddings to find relevant repositories according to the user's search query.

## Requirements

- Postgres instance with pgvector extension
- Embedding model provider (e.g. OpenAI, Gemini, or self-hosted model)
- GitHub OAuth app credentials

## How it works

The system operates through the following steps:

1. Creates embeddings for each starred repository using the repository name, description, and some part of the README content
2. Stores these embeddings in a Postgres database
3. Uses a vector search algorithm to find the top 10 repositories matching the search query
4. Returns the results to frontend

## Things to note

By default:
- We only index repositories with at least 100 stars. It can be configured using the `GITHUB_STAR_THRESHOLD` environment variable in the backend.
- We require user to provide their own API key for query and calculating embeddings if they have more than 5000 stars. This can also be configured using the `API_KEY_STAR_THRESHOLD` environment variable in the backend.

This project was mostly "vibe coded" by me and claude, so there must be many low hanging fruits to optimize. Feel free to open an issue or PR!