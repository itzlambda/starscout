#!/usr/bin/env bash

# SQLx prepare script for compile-time SQL validation
# This generates sqlx-data.json which allows for offline builds

set -e

echo "Running SQLx prepare for compile-time SQL validation..."

# Set the database URL if not already set
if [ -z "$DATABASE_URL" ]; then
    echo "Warning: DATABASE_URL not set. Using default local database."
    export DATABASE_URL="postgresql://postgres:password@localhost:5432/starscout_dev"
fi

# Prepare SQLx queries for offline compilation
cargo sqlx prepare -- --lib

echo "SQLx prepare completed successfully!"
echo "sqlx-data.json has been generated for offline builds."
echo ""
echo "Make sure to commit sqlx-data.json to enable offline builds in CI/CD." 