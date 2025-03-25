import asyncio
from typing import List, Dict, Optional, Any
import aiohttp
from urllib.parse import urljoin
import base64
import logging

from .core.models import Repository, RepositoryOwner

logger = logging.getLogger(__name__)
class GitHubClient:
    def __init__(self, token: str, base_url: str = "https://api.github.com"):
        self.token = token
        self.base_url = base_url
        self.headers = {
            "Accept": "application/vnd.github+json",
            "Authorization": f"Bearer {token}",
        }

    async def _fetch_page(
        self, session: aiohttp.ClientSession, url: str, params: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        async with session.get(url, params=params, headers=self.headers) as response:
            if response.status == 200:
                return await response.json()
            elif response.status == 404:
                raise ValueError(f"Resource not found: {url}")
            else:
                error_text = await response.text()
                raise ValueError(f"GitHub API error: {response.status} - {error_text}")

    async def get_user_stars_async(
        self, username: Optional[str] = None, per_page: int = 100
    ) -> List[Repository]:
        """Asynchronously retrieve starred repositories for a user with pagination.

        Args:
            username (str, optional): GitHub username. If None, gets stars for authenticated user.
            per_page (int, optional): Number of results per page. Defaults to 100 (max allowed).

        Returns:
            List[StarredRepository]: List of StarredRepository objects

        Raises:
            ValueError: If there's an error with the request
        """
        if username:
            url = urljoin(self.base_url, f"/users/{username}/starred")
        else:
            url = urljoin(self.base_url, "/user/starred")

        params = {
            "sort": "created",  # Sort parameter
            "direction": "desc",  # Direction parameter
            "per_page": per_page,
        }

        all_stars = []

        async with aiohttp.ClientSession() as session:
            current_page = 1
            has_more_pages = True

            while has_more_pages:
                # Fetch the current batch of pages concurrently
                batch_tasks = []
                batch_size = 10  # Number of concurrent requests

                for page_offset in range(batch_size):
                    page_num = current_page + page_offset
                    batch_tasks.append(
                        self._fetch_page(session, url, {**params, "page": page_num})
                    )

                # Wait for the batch to complete
                batch_results = await asyncio.gather(
                    *batch_tasks, return_exceptions=True
                )

                # Process the batch results
                has_more_pages = (
                    False  # Assume no more pages unless we find a full page
                )

                for i, result in enumerate(batch_results):
                    if isinstance(result, Exception):
                        logger.error(f"Error fetching page {current_page + i}: {result}")
                        continue

                    # If we got an empty page, we've reached the end
                    if not result:
                        break

                    # Process the repositories from this page
                    all_stars.extend(self._process_repos(result))

                    # If we got a full page, there might be more pages
                    if len(result) == per_page:
                        has_more_pages = True
                    else:
                        # If we got a partial page, we've reached the end
                        has_more_pages = False
                        break

                # Move to the next batch of pages
                current_page += batch_size

                # If we've processed all pages, exit the loop
                if not has_more_pages:
                    break

            return all_stars

    def _process_repos(self, repos: List[Dict[str, Any]]) -> List[Repository]:
        """Process repository data from the GitHub API response.

        Args:
            repos (List[Dict[str, Any]]): Raw repository data from the API

        Returns:
            List[Repository]: Processed repository information
        """
        processed_repos = []
        for repo in repos:
            try:
                # Create a RepositoryOwner object
                owner_data = repo.get("owner", {})
                owner = RepositoryOwner(
                    login=owner_data.get("login"),
                    avatarUrl=owner_data.get("avatar_url"),
                )

                # Create a Repository object with all required fields
                repo_info = Repository(
                    id=repo["id"],
                    name=repo["name"],
                    full_name=repo["full_name"],
                    description=repo.get("description"),
                    url=repo["html_url"],
                    stars=repo.get("stargazers_count", 0),
                    topics=repo.get("topics", []),
                    owner=owner,
                )
                processed_repos.append(repo_info)
            except Exception as e:
                logger.error(f"Error processing repository {repo.get('full_name')}: {e}")
                continue

        return processed_repos

    def get_user_stars(self, username: Optional[str] = None) -> List[Repository]:
        """Retrieve starred repositories for a user (synchronous wrapper).

        Args:
            username (str, optional): GitHub username. If None, gets stars for authenticated user.

        Returns:
            List[StarredRepository]: List of StarredRepository objects

        Raises:
            ValueError: If there's an error with the request
        """
        return asyncio.run(self.get_user_stars_async(username))

    def get_user_info(self) -> Dict[str, Any]:
        """Get information about the authenticated user.

        Returns:
            Dict[str, Any]: User information including id, login, name, etc.

        Raises:
            ValueError: If there's an error with the request
        """
        import requests

        url = urljoin(self.base_url, "/user")
        response = requests.get(url, headers=self.headers)

        if response.status_code == 200:
            return response.json()
        else:
            raise ValueError(
                f"GitHub API error: {response.status_code} - {response.text}"
            )

    async def get_repo_readme(
        self, owner: str, repo: str, session: aiohttp.ClientSession
    ) -> Optional[str]:
        """Asynchronously fetch and decode the README content of a repository.

        Args:
            owner (str): Repository owner's username
            repo (str): Repository name
            session (aiohttp.ClientSession): Active aiohttp session to use for the request

        Returns:
            Optional[str]: Decoded README content if found, None if README doesn't exist

        Raises:
            ValueError: If there's an error with the request other than 404
        """
        readme_url = urljoin(self.base_url, f"/repos/{owner}/{repo}/readme")

        async with session.get(readme_url, headers=self.headers) as response:
            if response.status == 404:
                return None
            elif response.status != 200:
                error_text = await response.text()
                raise ValueError(f"GitHub API error: {response.status} - {error_text}")

            readme_data = await response.json()
            return base64.b64decode(readme_data["content"]).decode("utf-8")

    async def get_repos_readmes_async(
        self, repos: List[str]
    ) -> Dict[str, Optional[str]]:
        """Asynchronously fetch README contents for multiple repositories.

        Args:
            repos (List[str]): List of repository full names in the format "owner/repo"

        Returns:
            Dict[str, Optional[str]]: Dictionary mapping repository full names to their README contents.
                                    None value indicates README was not found.

        Raises:
            ValueError: If there's an error with the request
        """
        results = {}

        async with aiohttp.ClientSession() as session:
            tasks = []
            for repo_full_name in repos:
                try:
                    owner, repo = repo_full_name.split("/")
                    tasks.append(self.get_repo_readme(owner, repo, session))
                except ValueError:
                    logger.error(f"Invalid repository name format: {repo_full_name}")
                    results[repo_full_name] = None
                    continue

            # Wait for all tasks to complete
            batch_results = await asyncio.gather(*tasks, return_exceptions=True)

            # Process the results
            for repo_full_name, result in zip(repos, batch_results):
                if isinstance(result, Exception):
                    logger.error(f"Error fetching README for {repo_full_name}: {result}")
                    results[repo_full_name] = None
                else:
                    results[repo_full_name] = result

        return results

    def get_repos_readmes(self, repos: List[str]) -> Dict[str, Optional[str]]:
        """Retrieve README contents for multiple repositories (synchronous wrapper).

        Args:
            repos (List[str]): List of repository full names in the format "owner/repo"

        Returns:
            Dict[str, Optional[str]]: Dictionary mapping repository full names to their README contents.
                                    None value indicates README was not found.

        Raises:
            ValueError: If there's an error with the request
        """
        return asyncio.run(self.get_repos_readmes_async(repos))

    async def get_user_stars_headers_async(self, per_page: int = 1) -> Dict[str, str]:
        """Get just the headers from the stars API call to efficiently get total star count.

        Args:
            per_page (int, optional): Number of results per page. Defaults to 1 since we only need headers.

        Returns:
            Dict[str, str]: Response headers including Link header for pagination info
        """
        url = urljoin(self.base_url, "/user/starred")
        params = {
            "per_page": per_page,
        }

        async with aiohttp.ClientSession() as session:
            async with session.get(
                url, params=params, headers=self.headers
            ) as response:
                if response.status == 200:
                    return dict(response.headers)
                else:
                    error_text = await response.text()
                    raise ValueError(
                        f"GitHub API error: {response.status} - {error_text}"
                    )
