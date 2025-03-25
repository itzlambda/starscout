from typing import Dict
from github_semantic_search.core.models import OAuthCacheObject

# TODO: this is probably not thread safe

# Simple in-memory cache for OAuth token to user data mapping
# This reduces unnecessary GitHub API requests
oauth_token_cache: Dict[str, OAuthCacheObject] = {}