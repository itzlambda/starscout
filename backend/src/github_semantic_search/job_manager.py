import logging
import asyncio
from typing import Optional, Dict, Any, List
from datetime import datetime

from .db.database import db
from .core.models import UserJob, Repository
from .github_client import GitHubClient
from .repo_manager import semantic_search_manager
from .settings import settings
from .shared_state import oauth_token_cache

logger = logging.getLogger(__name__)

# In-memory cache of active jobs
active_jobs: Dict[str, asyncio.Task] = {}


class JobManager:
    def __init__(self):
        self.db = db

    async def create_job(self, user_id: str) -> UserJob:
        """Create a new job for the user."""
        query = """
        INSERT INTO user_jobs (user_id, status)
        VALUES (%s, 'pending')
        RETURNING id, user_id, status, total_repos, processed_repos, failed_repos, 
                  created_at, updated_at, completed_at
        """

        result = self.db.execute_query(query, (user_id,))
        if not result:
            raise ValueError("Failed to create job")

        return UserJob(**result[0])

    async def get_job(self, job_id: int) -> Optional[UserJob]:
        """Get job by ID."""
        query = """
        SELECT id, user_id, status, total_repos, processed_repos, failed_repos, 
               created_at, updated_at, completed_at
        FROM user_jobs
        WHERE id = %s
        """

        result = self.db.execute_query(query, (job_id,))
        if not result:
            return None

        return UserJob(**result[0])

    async def get_latest_job(self, user_id: str) -> Optional[UserJob]:
        """Get the latest job for a user."""
        query = """
        SELECT id, user_id, status, total_repos, processed_repos, failed_repos, 
               created_at, updated_at, completed_at
        FROM user_jobs
        WHERE user_id = %s
        ORDER BY created_at DESC
        LIMIT 1
        """

        result = self.db.execute_query(query, (user_id,))
        if not result:
            return None

        return UserJob(**result[0])

    async def update_job(self, job_id: int, **kwargs: Any) -> Optional[UserJob]:
        """Update job fields."""
        # Build the SET clause dynamically based on provided kwargs
        set_clause = ", ".join([f"{key} = %s" for key in kwargs.keys()])
        set_clause += ", updated_at = NOW()"  # Always update the updated_at timestamp

        # Build the parameter tuple
        params = tuple(kwargs.values()) + (job_id,)

        query = f"""
        UPDATE user_jobs
        SET {set_clause}
        WHERE id = %s
        RETURNING id, user_id, status, total_repos, processed_repos, failed_repos, 
                  created_at, updated_at, completed_at
        """

        result = self.db.execute_query(query, params)
        if not result:
            return None

        return UserJob(**result[0])

    async def process_user_stars(
        self,
        user_id: str,
        oauth_token: str,
        api_key: Optional[str] = None,
        github_username: Optional[str] = None,
    ) -> UserJob:
        """Process a user's starred repositories."""
        # Create a new job
        job = await self.create_job(user_id)

        # Start the processing task
        task = asyncio.create_task(
            self._process_stars_task(
                job.id, user_id, oauth_token, api_key, github_username
            )
        )
        active_jobs[str(job.id)] = task

        return job

    async def _process_stars_task(
        self,
        job_id: int,
        user_id: str,
        oauth_token: str,
        api_key: Optional[str] = None,
        github_username: Optional[str] = None,
    ) -> None:
        """Background task to process starred repositories."""
        try:
            # Update job status to processing
            await self.update_job(job_id, status="Fetching stars...")

            # Create GitHub client with user's token
            github_client = GitHubClient(token=oauth_token)

            # Fetch starred repositories
            all_starred_repos = await github_client.get_user_stars_async()

            # Filter repos with less than configured number of stars
            starred_repos = [
                repo
                for repo in all_starred_repos
                if repo.stars >= settings.GITHUB_STAR_THRESHOLD
            ]

            # Update job with total repos
            await self.update_job(job_id, status="Creating embeddings...")
            await self.update_job(job_id, total_repos=len(starred_repos))

            # Find repositories that need embeddings
            repos_needing_embeddings = (
                semantic_search_manager.find_repos_needing_embeddings(starred_repos)
            )

            # Process repositories in batches
            batch_size = 50
            processed_count = 0
            failed_count = 0

            for i in range(0, len(repos_needing_embeddings), batch_size):
                batch = repos_needing_embeddings[i : i + batch_size]

                try:
                    # Process batch with API key if provided
                    await semantic_search_manager.create_embeddings_for_repos(
                        batch, oauth_token=oauth_token, api_key=api_key
                    )
                    processed_count += len(batch)
                except Exception as e:
                    logger.error(f"Error processing batch: {e}")
                    failed_count += len(batch)

                # Update job progress
                await self.update_job(
                    job_id, processed_repos=processed_count, failed_repos=failed_count
                )

            # Store user stars in the database
            await self._store_user_stars(user_id, starred_repos, github_username)

            # Update job status to completed
            await self.update_job(
                job_id, status="completed", completed_at=datetime.now()
            )

        except Exception as e:
            logger.error(f"Error processing user stars: {e}")
            # Update job status to failed
            await self.update_job(job_id, status="failed")
        finally:
            # Remove task from active jobs
            active_jobs.pop(str(job_id), None)

    async def user_exists(self, user_id: str) -> bool:
        """Check if a user exists in the database."""
        query = """
        SELECT EXISTS (
            SELECT 1
            FROM user_stars
            WHERE user_id = %s
        )
        """

        result = self.db.execute_query(query, (user_id,))
        if not result:
            return False

        return result[0]["exists"]


    async def _store_user_stars(
        self,
        user_id: str,
        starred_repos: List[Repository],
        github_username: Optional[str] = None,
    ) -> None:
        """Store user's starred repositories in the database."""
        if not starred_repos:
            logger.info(f"No starred repositories to store for user {user_id}")
            return

        try:
            # Extract repo IDs from starred repositories
            repo_ids = [repo.id for repo in starred_repos]

            if not github_username:
                logger.error(f"Could not determine GitHub username for user {user_id}")
                return

            # Upsert user stars
            upsert_query = """
            INSERT INTO user_stars (user_id, github_username, repo_ids, updated_at)
            VALUES (%s, %s, %s, NOW())
            ON CONFLICT (user_id) 
            DO UPDATE SET 
                github_username = EXCLUDED.github_username,
                repo_ids = EXCLUDED.repo_ids,
                updated_at = NOW()
            """

            self.db.execute_query(upsert_query, (user_id, github_username, repo_ids))
            logger.info(
                f"Stored {len(repo_ids)} starred repositories for user {user_id} ({github_username})"
            )
        except Exception as e:
            logger.error(f"Error storing user stars: {e}")
            raise


job_manager = JobManager()
