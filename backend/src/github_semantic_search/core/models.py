from typing import List, Optional
from pydantic import BaseModel, Field
from datetime import datetime


class RepositoryOwner(BaseModel):
    login: str = Field(..., description="Owner's login name")
    avatar_url: str = Field(..., alias="avatarUrl", description="Owner's avatar URL")

    class Config:
        from_attributes = True
        populate_by_name = True


class OAuthCacheObject(BaseModel):
    user_id: str = Field(..., description="GitHub user ID")
    created_at: datetime = Field(..., description="GitHub account creation date")
    following_count: int = Field(..., description="GitHub following count")
    github_username: str = Field(..., description="GitHub username")


class Repository(BaseModel):
    id: int = Field(..., description="GitHub repository ID")
    name: str = Field(..., description="Repository name")
    full_name: str = Field(
        ..., alias="fullName", description="Full repository name (owner/name)"
    )
    description: Optional[str] = Field(None, description="Repository description")
    readme_content: Optional[str] = Field(None, description="Repository README content")
    topics: List[str] = Field(default_factory=list, description="Repository topics")
    url: str = Field(..., description="Repository URL")
    stars: int = Field(0, description="Number of repository stars (stargazers)")
    embedding: Optional[List[float]] = Field(
        None, description="Repository embedding vector"
    )
    created_at: Optional[datetime] = Field(
        None, description="Repository creation timestamp"
    )
    last_updated: Optional[datetime] = Field(
        None, description="Repository last update timestamp"
    )
    owner: RepositoryOwner = Field(..., description="Repository owner")

    @classmethod
    def from_github_response(cls, data: dict) -> "Repository":
        return cls(
            id=data["id"],
            name=data["name"],
            fullName=data["full_name"],
            description=data.get("description"),
            url=data["html_url"],
            stars=data.get("stargazers_count", 0),
            topics=data.get("topics", []),
            owner=RepositoryOwner(
                login=data["owner"]["login"], avatarUrl=data["owner"]["avatar_url"]
            ),
        )

    class Config:
        from_attributes = True
        populate_by_name = True
        json_schema_extra = {
            "example": {
                "id": 1234567,
                "name": "tensorflow",
                "full_name": "tensorflow/tensorflow",
                "description": "An open source machine learning framework for everyone",
                "html_url": "https://github.com/tensorflow/tensorflow",
                "stars": 178000,
                "topics": ["machine-learning", "deep-learning", "python"],
                "owner": {
                    "login": "tensorflow",
                    "avatar_url": "https://avatars.githubusercontent.com/u/15658632?v=4",
                },
            }
        }


class UserJob(BaseModel):
    id: Optional[int] = Field(None, description="Job ID")
    user_id: str = Field(..., description="GitHub user ID")
    status: str = Field(
        "pending", description="Job status (pending, processing, completed, failed)"
    )
    total_repos: int = Field(0, description="Total number of repositories to process")
    processed_repos: int = Field(0, description="Number of repositories processed")
    failed_repos: int = Field(
        0, description="Number of repositories that failed processing"
    )
    created_at: Optional[datetime] = Field(None, description="Job creation timestamp")
    updated_at: Optional[datetime] = Field(
        None, description="Job last update timestamp"
    )
    completed_at: Optional[datetime] = Field(
        None, description="Job completion timestamp"
    )

    class Config:
        from_attributes = True
        populate_by_name = True
