import datetime
import logging
from typing import List, Optional, Dict
from fastapi import FastAPI, HTTPException, status, Depends, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from github_semantic_search.core.models import Repository, UserJob, OAuthCacheObject
from github_semantic_search.repo_manager import semantic_search_manager
from github_semantic_search.job_manager import job_manager
from github_semantic_search.log import console_handler
from github_semantic_search.github_client import GitHubClient
from github_semantic_search.settings import settings
from github_semantic_search.shared_state import oauth_token_cache

logging.basicConfig(level=logging.INFO, handlers=[console_handler])
logger = logging.getLogger(__name__)

app = FastAPI(
    title="starscout search API",
    description="API for semantic search over your GitHub starred repositories",
    version="1.0.0",
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


async def get_oauth_token(authorization: str = Header(...)) -> str:
    """Extract OAuth token from Authorization header."""
    if not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authorization header. Must start with 'Bearer '",
        )
    return authorization.replace("Bearer ", "")


async def get_user_object_from_token(
    oauth_token: str = Depends(get_oauth_token),
) -> OAuthCacheObject:
    """Get user ID from OAuth token with caching to reduce GitHub API calls."""
    # Check if the token is in the cache
    if oauth_token in oauth_token_cache:
        return oauth_token_cache[oauth_token]

    # If not in cache, fetch from GitHub API
    github_client = GitHubClient(token=oauth_token)
    user_info = github_client.get_user_info()
    user_id = str(user_info["id"])
    github_username = str(user_info["login"])
    following_count = int(user_info["following"])
    created_at = datetime.datetime.strptime(user_info["created_at"], "%Y-%m-%dT%H:%M:%SZ")

    # Store in cache for future use
    oauth_token_cache[oauth_token] = OAuthCacheObject(
        user_id=user_id,
        github_username=github_username,
        following_count=following_count,
        created_at=created_at,
    )

    return oauth_token_cache[oauth_token]


async def get_user_star_count(oauth_token: str = Depends(get_oauth_token)) -> int:
    """Get the total number of stars for a user with caching."""
    # If not in cache, fetch from GitHub API
    github_client = GitHubClient(token=oauth_token)
    # Make a single API call with per_page=1 to get Link header
    headers = await github_client.get_user_stars_headers_async(per_page=1)

    # Get total stars from the Link header
    link_header = headers.get("Link")
    star_count = 0
    if link_header:
        # Extract the last page number from the Link header
        import re

        matches = re.search(r'page=(\d+)>; rel="last"', link_header)
        if matches:
            star_count = int(matches.group(1))

    return star_count


async def check_api_key_requirement(
    oauth_token: str = Depends(get_oauth_token),
    api_key: Optional[str] = Header(
        None, description="Required for users with more than 5000 stars", alias="Api_key"
    ),
) -> Optional[str]:
    """Check if API key is required and validate it."""
    star_count = await get_user_star_count(oauth_token)

    # Check if API key is required
    if star_count > settings.API_KEY_STAR_THRESHOLD and not api_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"API key required for users with more than {settings.API_KEY_STAR_THRESHOLD} stars",
        )

    if api_key:
        try:
            from github_semantic_search.embedding import Embeddings

            embedding_provider = Embeddings(
                api_key=api_key,
                provider=settings.AI_PROVIDER,
                model=settings.AI_MODEL_NAME,
            )
            embedding_provider.check_api_key()
        except Exception as e:
            logger.error(f"Invalid API key: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid API key",
            )

    return api_key


@app.get("/")
async def root():
    return {"status": "healthy", "message": "starscout API is running"}


@app.get("/search", response_model=List[Repository])
async def semantic_search(
    query: str,
    limit: int = 10,
    oauth_token: str = Depends(get_oauth_token),
    api_key: Optional[str] = Depends(check_api_key_requirement),
):
    try:
        user_obj = await get_user_object_from_token(oauth_token)
        results = semantic_search_manager.search_repositories(
            query, user_id=user_obj.user_id, limit=limit, api_key=api_key
        )
        return results
    except Exception as e:
        logger.error(f"Error during semantic search: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to perform semantic search or invalid query",
        )


@app.get("/search-global", response_model=List[Repository])
async def semantic_search_global(
    query: str,
    limit: int = 10,
    api_key: Optional[str] = Depends(check_api_key_requirement),
):
    try:
        results = semantic_search_manager.search_repositories(
            query, user_id=None, limit=limit, api_key=api_key
        )
        return results
    except Exception as e:
        logger.error(f"Error during global semantic search: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to perform global semantic search or invalid query",
        )


@app.post("/process-stars", response_model=UserJob)
async def process_stars(
    oauth_token: str = Depends(get_oauth_token),
    api_key: Optional[str] = Depends(check_api_key_requirement),
):
    try:
        # Get user_id from OAuth token (cached)
        user_obj = await get_user_object_from_token(oauth_token)

        # Check if there's already an active job for this user
        existing_job = await job_manager.get_latest_job(user_obj.user_id)
        if existing_job and existing_job.status in ["pending", "processing"]:
            return existing_job

        # Start a new job to process the user's starred repositories
        job = await job_manager.process_user_stars(
            user_id=user_obj.user_id,
            oauth_token=oauth_token,
            api_key=api_key,
            github_username=user_obj.github_username,
        )
        return job
    except Exception as e:
        logger.error(f"Error processing starred repositories: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to process starred repositories",
        )


@app.get("/job-status/{job_id}", response_model=UserJob)
async def get_job_status(
    job_id: int,
    oauth_token: str = Depends(get_oauth_token),
):
    try:
        # Get user_id from OAuth token (cached)
        user_obj = await get_user_object_from_token(oauth_token)

        # Get the job
        job = await job_manager.get_job(job_id)
        if not job:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Job with ID {job_id} not found",
            )

        if job.user_id != user_obj.user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You don't have permission to access this job",
            )

        return job
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting job status: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get job status",
        )


@app.get("/user-jobs", response_model=Optional[UserJob])
async def get_user_latest_job(
    oauth_token: str = Depends(get_oauth_token),
):
    try:
        # Get user_id from OAuth token (cached)
        user_obj = await get_user_object_from_token(oauth_token)

        job = await job_manager.get_latest_job(user_obj.user_id)
        return job
    except Exception as e:
        logger.error(f"Error getting user's latest job: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get user's latest job",
        )

@app.get("/user-exists", response_model=Dict[str, bool])
async def user_exists(oauth_token: str = Depends(get_oauth_token)):
    user_obj = await get_user_object_from_token(oauth_token)
    exists = await job_manager.user_exists(user_obj.user_id)
    return {"user_exists": exists}

@app.get("/settings")
async def get_settings():
    return {
        "api_key_star_threshold": settings.API_KEY_STAR_THRESHOLD,
        "github_following_threshold": settings.GITHUB_FOLLOWING_THRESHOLD,
    }


def start():
    import uvicorn

    uvicorn.run(
        "github_semantic_search.main:app",  # Use import string instead of app instance
        host="0.0.0.0",
        port=8001,
        reload=True,
        log_level="info",
    )


if __name__ == "__main__":
    start()
