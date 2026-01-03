from api.models.error_responses import ErrorResponse
from api.models.responses import SearchResultResponse
from api.services import postgres_service
from api.services.embedding_service import embedding_service
from fastapi import APIRouter, status

search_router = APIRouter()


@search_router.post(
    "/search",
    status_code=status.HTTP_200_OK,
    response_model=SearchResultResponse,
    responses={
        status.HTTP_404_NOT_FOUND: {"model": ErrorResponse},
        status.HTTP_500_INTERNAL_SERVER_ERROR: {"model": ErrorResponse},
    },
)
async def search_by_embedding(task_id: str, query: str, top_k: int = 15):
    """
    Search for relevant relations using embeddings.

    Args:
        task_id (str): The unique identifier for the task.
        query (str): The search query.
        top_k (int): The number of top results to return.
    Returns:
        List of relevant relations.
    """
    query_embedding = await embedding_service.generate_embeddings(query)

    results = postgres_service.search_by_embedding(
        task_id=task_id, embedding=query_embedding, top_k=top_k
    )

    return SearchResultResponse(query=query, results=results)
