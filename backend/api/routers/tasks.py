from typing import Optional

from api.core.settings import TaskStatus
from api.exceptions.watson_exceptions import (
    TaskNotFoundException,
)
from api.models.error_responses import ErrorResponse
from api.models.responses import FullTaskResponse, TaskListResponse
from api.services.postgres_service import get_simple_task, list_tasks
from fastapi import APIRouter, Query, status

tasks_router = APIRouter()


@tasks_router.get(
    "/tasks",
    status_code=status.HTTP_200_OK,
    response_model=TaskListResponse,
    responses={
        status.HTTP_500_INTERNAL_SERVER_ERROR: {"model": ErrorResponse},
    },
)
async def get_tasks(
    status: Optional[TaskStatus] = Query(
        None, description="Filter by task status (optional)"
    ),
    limit: Optional[int] = Query(
        10, ge=1, le=100, description="Maximum number of tasks to return"
    ),
    skip: Optional[int] = Query(0, ge=0, description="Number of tasks to skip"),
    order: Optional[int] = Query(
        -1,
        description="Order of tasks based on updated_at field (-1 for desc, 1 for asc)",
    ),
):
    """
    Get a list of tasks.
    """
    query = {}
    if status is not None:
        query["status"] = status

    results = list_tasks(query=query.get("status"), skip=skip, limit=limit, order=order)
    return TaskListResponse(
        tasks=results["tasks"], total=results["total"], limit=limit, offset=skip
    )


@tasks_router.get(
    "/tasks/{task_id}",
    status_code=status.HTTP_200_OK,
    response_model=FullTaskResponse,
    responses={
        status.HTTP_404_NOT_FOUND: {"model": ErrorResponse},
        status.HTTP_500_INTERNAL_SERVER_ERROR: {"model": ErrorResponse},
    },
)
async def get_task(task_id: str):
    """
    Get a specific task by ID.
    """
    result = get_simple_task(task_id)

    if not result:
        raise TaskNotFoundException(task_id=task_id)

    return FullTaskResponse(**result)
