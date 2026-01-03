from typing import List

from api.core.logging import logger
from api.core.settings import WatsonSettings
from api.exceptions.watson_exceptions import EmbeddingsException
from openai import AsyncOpenAI


class EmbeddingsService:
    def __init__(self):
        self.client = AsyncOpenAI(
            base_url=f"http://{WatsonSettings.vllm_container}:{WatsonSettings.vllm_port}/v1",
            api_key="not-needed",
        )
        logger.instrument_openai(self.client)

    async def health(self):
        try:
            await self.client.models.list()
            return True
        except Exception as e:
            logger.error(f"Health check failed: {str(e)}")
            raise EmbeddingsException("Embeddings service is unavailable")

    async def _generate_embedding(self, text: str) -> List[float]:
        """
        Generates an embedding for the provided text using the vLLM embeddings service.

        Args:
            text (str): The text to generate an embedding for.
        Returns:
            List[float]: The generated embedding vector.
        """
        try:
            response = await self.client.embeddings.create(
                model=WatsonSettings.embedding_model,
                input=text,
            )
            return response.data[0].embedding
        except Exception as e:
            logger.error(f"Error during embedding generation: {str(e)}")
            raise EmbeddingsException(
                "Failed to generate embedding", details={"error": str(e)}
            )

    async def generate_embeddings(self, query: str) -> List[float]:
        """
        Public method to generate embeddings for the given query.

        Args:
            query (str): The input text to generate embeddings for.
        Returns:
            List[float]: The generated embedding vector.
        """
        return await self._generate_embedding(query)


embedding_service = EmbeddingsService()
