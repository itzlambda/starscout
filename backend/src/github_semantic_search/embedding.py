from typing import List
import logging
from abc import ABC, abstractmethod
from tenacity import retry, stop_after_attempt, wait_exponential, RetryCallState

from .settings import settings
import openai
from openai import OpenAI
from google import genai
from google.genai.types import EmbedContentResponse

logger = logging.getLogger(__name__)


def log_retry(retry_state: RetryCallState) -> None:
    if retry_state.outcome.failed:
        exception = retry_state.outcome.exception()
        # Get max attempts from the stop strategy
        max_attempts = retry_state.retry_object.stop.max_attempt_number

        # Check if this is the final attempt
        if retry_state.attempt_number >= max_attempts:
            logger.error(
                f"Embedding generation failed (final attempt {retry_state.attempt_number}/{max_attempts}): {str(exception)}. "
                f"No more retries."
            )
        else:
            # Safe access to wait time
            wait_time = getattr(retry_state.next_action, "sleep", None)
            wait_msg = (
                f"Retrying in {wait_time:.1f} seconds..."
                if wait_time is not None
                else "Retrying..."
            )

            logger.warning(
                f"Embedding generation failed (attempt {retry_state.attempt_number}/{max_attempts}): {str(exception)}. "
                f"{wait_msg}"
            )


class EmbeddingProvider(ABC):
    @abstractmethod
    def get_embedding(self, text: str) -> List[float]:
        pass

    @abstractmethod
    def get_embeddings(self, texts: List[str]) -> List[List[float]]:
        pass

    @abstractmethod
    def check_api_key(self):
        pass


class OpenAIEmbedding(EmbeddingProvider):
    def __init__(self, api_key: str, model: str):
        self.client = OpenAI(api_key=api_key)
        self.model = model

    def get_embedding(self, text: str) -> List[float]:
        embeddings = self.get_embeddings([text])
        return embeddings[0]

    def get_embeddings(self, texts: List[str]) -> List[List[float]]:
        try:
            response = self.client.embeddings.create(
                model=self.model,
                input=texts,
                dimensions=settings.AI_EMBEDDING_VECTOR_DIMENSION,
            )

            if not response.data or not all(item.embedding for item in response.data):
                raise ValueError("Invalid response from OpenAI API")

            return [item.embedding for item in response.data]

        except openai.OpenAIError as e:
            logger.error(f"OpenAI API error: {str(e)}")
            raise
        except Exception as e:
            logger.error(f"Unexpected error while generating embeddings: {str(e)}")
            raise

    def check_api_key(self):
        try:
            self.client.models.list()
        except Exception:
            raise


class GeminiEmbedding(EmbeddingProvider):
    def __init__(self, api_key: str, model: str):
        self.client = genai.Client(api_key=api_key)
        self.model = model

    def get_embedding(self, text: str) -> List[float]:
        embeddings = self.get_embeddings([text])
        return embeddings[0]

    def get_embeddings(self, texts: List[str]) -> List[List[float]]:
        try:
            response: EmbedContentResponse = self.client.models.embed_content(
                contents=texts,
                model=self.model,
                config={
                    "output_dimensionality": settings.AI_EMBEDDING_VECTOR_DIMENSION
                },
            )

            if not response or not response.embeddings:
                raise ValueError("Invalid or empty response from Gemini API")

            return [embedding.values for embedding in response.embeddings]

        except Exception as e:
            logger.error(f"Unexpected error while generating embeddings: {str(e)}")
            raise

    def check_api_key(self):
        try:
            self.client.models.list()
        except Exception:
            raise


class Embeddings:
    def __init__(
        self,
        api_key: str,
        provider: str = "openai",
        model: str = "text-embedding-3-small",
        **kwargs,
    ):
        self.provider = self._get_provider(api_key, provider, model, **kwargs)

    def _get_provider(
        self, api_key: str, provider: str, model: str, **kwargs
    ) -> EmbeddingProvider:
        providers = {
            "openai": lambda: OpenAIEmbedding(api_key, model, **kwargs),
            "gemini": lambda: GeminiEmbedding(api_key, model, **kwargs),
        }

        if provider not in providers:
            raise ValueError(
                f"Unsupported provider: {provider}. Available providers: {list(providers.keys())}"
            )

        return providers[provider]()

    def get_embedding(self, text: str) -> List[float]:
        try:
            return self.provider.get_embedding(text)
        except Exception:
            raise

    def check_api_key(self):
        try:
            self.provider.check_api_key()
        except Exception:
            raise

    def get_embeddings(self, texts: List[str]) -> List[List[float]]:
        try:
            return self.provider.get_embeddings(texts)
        except Exception:
            raise


embedding = Embeddings(
    api_key=settings.AI_API_KEY,
    provider=settings.AI_PROVIDER,
    model=settings.AI_MODEL_NAME,
)
