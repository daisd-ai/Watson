from api.exceptions.watson_exceptions import (
    ChunkNotFoundException,
)
from api.models.error_responses import ErrorResponse
from api.models.responses import (
    ChunkRelationsResponse,
    FileChunkResponse,
    RelationResponse,
    ResultResponse,
)
from api.services import postgres_service
from fastapi import APIRouter, status

results_router = APIRouter()


@results_router.get(
    "/results/tasks/{task_id}",
    status_code=status.HTTP_200_OK,
    response_model=ResultResponse,
    responses={
        status.HTTP_404_NOT_FOUND: {"model": ErrorResponse},
        status.HTTP_500_INTERNAL_SERVER_ERROR: {"model": ErrorResponse},
    },
)
async def get_task_results(task_id: str):
    files = postgres_service.get_files_with_chunks(task_id)
    if not files:
        raise ChunkNotFoundException(f"No results found for task ID: {task_id}")

    file_responses = []
    for file in files:
        chunk_ids = [chunk.id for chunk in file.chunks]
        file_response = FileChunkResponse(file_name=file.filename, chunks=chunk_ids)
        file_responses.append(file_response)

    return ResultResponse(task_id=task_id, files=file_responses)


@results_router.get(
    "/results/{task_id}/chunks/{chunk_id}",
    status_code=status.HTTP_200_OK,
    response_model=ChunkRelationsResponse,
    responses={
        status.HTTP_404_NOT_FOUND: {"model": ErrorResponse},
        status.HTTP_500_INTERNAL_SERVER_ERROR: {"model": ErrorResponse},
    },
)
async def chunks(task_id: str, chunk_id: str):
    chunk = postgres_service.find_chunk_with_relations(task_id, chunk_id)

    if not chunk:
        return ChunkRelationsResponse(chunk_id=chunk_id, relations=[])

    relation_responses = []
    substrates: set[str] = set()
    modifiers: set[str] = set()
    products: set[str] = set()
    edges = []

    for rel in chunk.relations:
        relation_response = RelationResponse(
            id=rel.id,
            text=rel.text,
            evidence=rel.evidence,
            substrates=[compound.name for compound in rel.substrates],
            modifiers=[compound.name for compound in rel.modifiers],
            products=[compound.name for compound in rel.products],
        )
        relation_responses.append(relation_response)

    return ChunkRelationsResponse(
        chunk_id=chunk_id,
        file_name=chunk.file.filename,
        content=chunk.content,
        summary=chunk.summary,
        relations=relation_responses,
    )
