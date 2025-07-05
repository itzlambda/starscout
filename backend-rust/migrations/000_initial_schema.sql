-- Migration: 000_drop_tables
-- Created at: 2024-03-16

-- Drop all tables
DROP TABLE IF EXISTS repositories CASCADE;

-- Drop the vector extension
-- DROP EXTENSION IF EXISTS vector;

-- Combined Migrations for GitHub Semantic Search Database
-- This file represents the final state of the database schema after all migrations

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS vector;

-- Create main repositories table
CREATE TABLE IF NOT EXISTS repositories (
    id NUMERIC PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    owner VARCHAR(255) NOT NULL,
    description TEXT,
    readme_content TEXT,
    topics TEXT[],
    homepage_url TEXT NOT NULL,
    embedding vector(1536) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indices for repositories
CREATE INDEX IF NOT EXISTS idx_repo_github_id ON repositories(id);

-- Create user_jobs table for tracking processing progress
CREATE TABLE IF NOT EXISTS user_jobs (
    id SERIAL PRIMARY KEY,
    user_id NUMERIC NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    total_repos INTEGER NOT NULL DEFAULT 0,
    processed_repos INTEGER NOT NULL DEFAULT 0,
    failed_repos INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Create index for user_jobs
CREATE INDEX IF NOT EXISTS idx_user_jobs_user_id ON user_jobs(user_id);

-- Create user_stars table for tracking user's starred repositories
CREATE TABLE IF NOT EXISTS user_stars (
    user_id NUMERIC PRIMARY KEY,
    github_username VARCHAR(255) NOT NULL,
    repo_ids NUMERIC[] NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create index for user_stars
CREATE INDEX IF NOT EXISTS idx_user_stars_user_id ON user_stars(user_id);

-- Create table for tracking repositories without READMEs
CREATE TABLE IF NOT EXISTS repos_without_readme (
    id NUMERIC PRIMARY KEY,
    name TEXT NOT NULL,
    owner TEXT NOT NULL
);

-- Create index for repos_without_readme
CREATE INDEX IF NOT EXISTS repos_without_readme_owner_name_idx ON repos_without_readme(owner, name);

-- Add table comments
COMMENT ON TABLE repos_without_readme IS 'Stores repositories that do not have README files to avoid repeated GitHub API calls'; 