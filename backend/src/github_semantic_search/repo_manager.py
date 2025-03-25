from typing import List, Optional
import logging
import base64
from urllib.parse import urljoin

import aiohttp

from .db.database import db
from .embedding import EmbeddingProvider, embedding
from .core.models import Repository, RepositoryOwner
from .settings import settings
from .github_client import GitHubClient

logger = logging.getLogger(__name__)


class SemanticSearchManager:
    def __init__(self):
        self.db = db
        self.embedding_provider = embedding

    def _get_github_client(self, oauth_token: str) -> GitHubClient:
        """Get a GitHub client instance with the provided OAuth token.

        Args:
            oauth_token (str): OAuth token to use for GitHub API requests

        Returns:
            GitHubClient: GitHub client instance
        """
        return GitHubClient(token=oauth_token)

    def find_repos_needing_embeddings(
        self, starred_repos: List[Repository]
    ) -> List[Repository]:
        if not starred_repos:
            logger.info("No starred repositories provided")
            return []

        repo_ids = [repo.id for repo in starred_repos]

        # Check both repositories table and repos_without_readme table
        query = """
        SELECT id 
        FROM (
            SELECT id FROM repositories
            UNION
            SELECT id FROM repos_without_readme
        ) existing_repos
        WHERE id = ANY(%s)
        """

        try:
            results = self.db.execute_query(query, (repo_ids,))
            existing_repo_ids = {result["id"] for result in results}
            repos_needing_embeddings = [
                repo for repo in starred_repos if repo.id not in existing_repo_ids
            ]

            logger.info(
                f"Found {len(repos_needing_embeddings)} repositories needing embeddings out of {len(starred_repos)} starred repositories"
            )
            return repos_needing_embeddings

        except Exception as e:
            logger.error(f"Error checking repositories for embeddings: {e}")
            raise

    def _get_embedding_provider(
        self, api_key: Optional[str] = None
    ) -> EmbeddingProvider:
        """Get an embedding provider instance, optionally using a provided API key.

        Args:
            api_key (Optional[str]): Optional API key to use for embeddings. If provided, creates a new provider.

        Returns:
            EmbeddingProvider: The embedding provider to use
        """
        if api_key:
            from .embedding import Embeddings

            return Embeddings(
                api_key=api_key,
                provider=settings.AI_PROVIDER,
                model=settings.AI_MODEL_NAME,
            )
        return self.embedding_provider

    async def create_embeddings_for_repos(
        self, repos: List[Repository], oauth_token: str, api_key: Optional[str] = None
    ) -> None:
        """Create embeddings for the given repositories by processing their READMEs.
        Repositories without READMEs are stored in a separate table to avoid repeated API calls.

        Args:
            repos (List[Repository]): List of repositories to create embeddings for
            oauth_token (str): OAuth token to use for GitHub API requests
            api_key (Optional[str]): Optional API key to use for creating embeddings. If provided, will override the default key.
        """
        if not repos:
            logger.info("No repositories provided for embedding creation")
            return

        # First, fetch all READMEs in batches
        github_client = self._get_github_client(oauth_token)
        repo_names = [f"{repo.owner.login}/{repo.name}" for repo in repos]
        readmes = await github_client.get_repos_readmes_async(repo_names)

        # Collect repository data and prepare for batch processing
        repositories = []
        repos_without_readme = []

        for repo in repos:
            try:
                repo_full_name = f"{repo.owner.login}/{repo.name}"
                readme_content = readmes.get(repo_full_name)

                if readme_content is None:
                    logger.warning(f"No README found for {repo_full_name}")
                    repos_without_readme.append(repo)
                    continue

                # Truncate README content if necessary
                truncated_readme = (
                    readme_content[:2000] + "..."
                    if len(readme_content) > 2000
                    else readme_content
                )

                # Format the text for embedding
                embedding_str = embedding_format.format(
                    repo_name=repo.name,
                    owner=repo.owner.login,
                    description=repo.description or "Ignore descriptions",
                    topics=", ".join(repo.topics) if repo.topics else "Ignore topics",
                    homepage_url=repo.url,
                    truncated_readme=truncated_readme,
                )

                # Store all repository data in a single object
                repositories.append(
                    {
                        "repo": repo,
                        "readme_content": readme_content,
                        "embedding_str": embedding_str,
                    }
                )

            except Exception as e:
                logger.error(
                    f"Error processing repository {repo.owner.login}/{repo.name}: {e}"
                )
                continue

        # Store repositories without READMEs in the dedicated table
        for repo in repos_without_readme:
            try:
                query = """
                INSERT INTO repos_without_readme (
                    id, name, owner
                ) VALUES (
                    %s, %s, %s
                )
                """

                self.db.execute_query(
                    query,
                    (
                        repo.id,
                        repo.name,
                        repo.owner.login,
                    ),
                )

                logger.info(
                    f"Stored repository {repo.owner.login}/{repo.name} in repos_without_readme table"
                )

            except Exception as e:
                logger.error(
                    f"Error inserting repository {repo.owner.login}/{repo.name} into repos_without_readme table: {e}"
                )
                continue

        if not repositories:
            return

        try:
            # Extract embedding strings for batch processing
            embedding_strings = [repo["embedding_str"] for repo in repositories]

            # Get embedding provider (with API key if provided)
            embedding_provider = self._get_embedding_provider(api_key)
            embedding_vectors = embedding_provider.get_embeddings(embedding_strings)

            # Insert all repositories with their embeddings
            for repo_info, embedding_vector in zip(repositories, embedding_vectors):
                repo = repo_info["repo"]
                readme_content = repo_info["readme_content"]

                try:
                    query = """
                    INSERT INTO repositories (
                        id, name, owner, description, readme_content, 
                        homepage_url, topics, embedding
                    ) VALUES (
                        %s, %s, %s, %s, %s, %s, %s, %s
                    )
                    """

                    self.db.execute_query(
                        query,
                        (
                            repo.id,
                            repo.name,
                            repo.owner.login,
                            repo.description,
                            readme_content,
                            repo.url,
                            repo.topics,
                            embedding_vector,
                        ),
                    )

                    logger.info(
                        f"Successfully created embedding for {repo.owner.login}/{repo.name}"
                    )

                except Exception as e:
                    logger.error(
                        f"Error inserting repository {repo.owner.login}/{repo.name} into database: {e}"
                    )
                    continue

        except Exception as e:
            logger.error(f"Error generating batch embeddings: {e}")
            raise

    def search_repositories(
        self,
        query: str,
        user_id: Optional[str] = None,
        limit: int = 5,
        api_key: Optional[str] = None,
    ) -> List[Repository]:
        """Search repositories using semantic search, either globally or within a user's starred repositories.

        Args:
            query (str): The search query to find semantically similar repositories
            user_id (Optional[str], optional): If provided, search only within user's starred repositories.
                                             If None, search all repositories. Defaults to None.
            limit (int, optional): Maximum number of results to return. Defaults to 5.
            api_key (Optional[str], optional): Optional API key for embeddings. Defaults to None.

        Returns:
            List[Repository]: List of repositories matching the query, ordered by relevance
        """

        if not query:
            raise ValueError("Query is required")

        try:
            # Get embedding provider (with API key if provided)
            embedding_provider = self._get_embedding_provider(api_key)
            query_embedding = embedding_provider.get_embedding(query)

            # Base similarity search query
            base_query = """
            SELECT 
                id,
                name,
                owner,
                description,
                topics,
                homepage_url,
                1 - (embedding <=> %s::vector) as cosine_similarity
            FROM repositories
            """

            query_params = [query_embedding]

            # If user_id is provided, filter by user's starred repositories
            if user_id:
                # Get the user's starred repository IDs
                user_stars_query = """
                SELECT repo_ids
                FROM user_stars
                WHERE user_id = %s
                """

                user_stars_result = self.db.execute_query(
                    user_stars_query, (user_id,), commit=False
                )

                if not user_stars_result:
                    logger.info(f"No starred repositories found for user {user_id}")
                    return []

                starred_repo_ids = user_stars_result[0]["repo_ids"]

                if not starred_repo_ids:
                    logger.info(f"User {user_id} has no starred repositories")
                    return []

                # Add WHERE clause for user's starred repos
                base_query += " WHERE id = ANY(%s)"
                query_params.append(starred_repo_ids)

            # Add ordering and limit
            base_query += """
            ORDER BY cosine_similarity DESC
            LIMIT %s
            """
            query_params.append(limit)

            # Execute the query
            results = self.db.execute_query(
                base_query,
                tuple(query_params),
                commit=False,
            )

            search_type = "user" if user_id else "global"
            logger.info(
                f"Found {len(results)} repositories matching {search_type} query: {query}"
            )

            # Convert database results to Repository objects
            repositories = [
                Repository(
                    id=result["id"],
                    name=result["name"],
                    fullName=f"{result['owner']}/{result['name']}",
                    description=result.get("description"),
                    url=result.get("homepage_url"),
                    topics=result.get("topics", []),
                    owner=RepositoryOwner(
                        login=result["owner"],
                        avatarUrl=f"https://github.com/{result['owner']}.png",
                    ),
                )
                for result in results
            ]

            return repositories

        except Exception as e:
            logger.error(
                f"Error during semantic search for query: {query}, with error: {e}"
            )
            raise


embedding_format = """
# Key Information
Repository name: {repo_name}
Description: {description}
Topics: {topics}
Owner: {owner}

# README Content
{truncated_readme}
"""

semantic_search_manager = SemanticSearchManager()
