from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional, List


class Settings(BaseSettings):
    DB_NAME: str
    DB_USER: str
    DB_PASSWORD: str
    DB_HOST: str
    DB_PORT: int = 5432

    GITHUB_API_URL: str = "https://api.github.com"
    GITHUB_STAR_THRESHOLD: int = 100
    GITHUB_FOLLOWING_THRESHOLD: int = 20

    LOG_LEVEL: str = "INFO"
    API_HOST: str = "0.0.0.0"
    API_PORT: int = 8000
    DEBUG: bool = False

    AI_PROVIDER: str
    AI_API_KEY: str
    AI_MODEL_NAME: str
    AI_EMBEDDING_VECTOR_DIMENSION: int

    # Number of stars above which an API key is required
    API_KEY_STAR_THRESHOLD: int = 5000

    # CORS settings
    ALLOWED_ORIGINS: List[str] = ["https://localhost:3000", "http://localhost:3000", "https://starscout.xyz"]

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
    )


settings = Settings()
