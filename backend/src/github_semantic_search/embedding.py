from typing import List
import logging
from abc import ABC, abstractmethod
from tenacity import retry, stop_after_attempt, wait_exponential, RetryCallState

from .settings import settings
import litellm

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
    def __init__(self, model: str = settings.AI_MODEL_NAME):
        self.model = model
        # Configure litellm logger
        litellm.set_verbose = False

    def get_embedding(self, text: str) -> List[float]:
        """Generates an embedding for a single text using litellm."""
        embeddings = self.get_embeddings([text])
        return embeddings[0]

    def get_embeddings(self, texts: List[str]) -> List[List[float]]:
        """Generates embeddings for a list of texts using litellm."""
        try:
            response = litellm.embedding(
                api_key=settings.AI_API_KEY,
                model=self.model,
                input=texts,
                dimensions=settings.AI_EMBEDDING_VECTOR_DIMENSION,
            )

            if not response.data or not all(item.get("embedding") for item in response.data):
                # Attempt to log the raw response if available
                raw_response_info = ""
                if hasattr(response, "_response"):
                    raw_response_info = f" Raw response: {response._response}"
                elif hasattr(response, "response"):
                    raw_response_info = f" Raw response: {response.response}"

                logger.error(
                    f"Invalid or empty embedding data received from litellm for model {self.model}. Response data: {response.data}.{raw_response_info}"
                )
                raise ValueError(
                    f"Invalid or empty embedding data received from litellm for model {self.model}."
                )

            # Access embedding using dictionary key
            return [item["embedding"] for item in response.data]

        except Exception as e:
            # Catch potential litellm exceptions and general errors
            logger.error(
                f"LiteLLM embedding failed for model {self.model}: {str(e)}",
                exc_info=True,
            )
            # Re-raise the exception to be handled upstream
            raise

    def check_api_key(self):
        """
        Performs a simple test embedding call to check if the API key
        associated with the model is likely valid.
        Relies on litellm finding the appropriate key from environment variables.
        """
        try:
            logger.info(f"Performing API key check for model {self.model} via test embedding...")
            # Use a short, simple text for the check
            test_embedding = self.get_embedding("test")
            if not test_embedding or not isinstance(test_embedding[0], float):
                 raise ValueError("Test embedding result was invalid.")
            logger.info(f"API key check successful for model {self.model}.")
        except Exception as e:
            logger.error(
                f"API key check failed for model {self.model}. " f"Error: {str(e)}"
            )
            # Re-raise the exception to signal failure
            raise ValueError(f"API key check failed for model {self.model}.") from e


# Instantiate the Embeddings service using settings
# LiteLLM will pick up the API key from environment variables based on the model
embedding = Embeddings(
    model=settings.AI_MODEL_NAME,
)
