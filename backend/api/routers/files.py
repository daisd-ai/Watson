from api.core.logging import logger
from api.core.settings import TaskStatus
from api.exceptions.watson_exceptions import (
    FileUploadException,
    StorageException,
    WatsonException,
)
from api.models.error_responses import ErrorResponse, ValidationErrorResponse
from api.models.responses import FileUploadResponse
from api.services.files_service import upload_files, validate_files
from api.services.minio_service import minio_service
from api.services.postgres_service import create_task
from api.worker.tasks import create_pn_from_pdfs_task
from fastapi import APIRouter, Form, UploadFile, status
from fastapi.responses import Response

files_router = APIRouter()


@files_router.post(
    "/files",
    response_model=FileUploadResponse,
    status_code=status.HTTP_202_ACCEPTED,
    responses={
        status.HTTP_400_BAD_REQUEST: {"model": ValidationErrorResponse},
        status.HTTP_413_REQUEST_ENTITY_TOO_LARGE: {"model": ErrorResponse},
        status.HTTP_500_INTERNAL_SERVER_ERROR: {"model": ErrorResponse},
    },
)
async def upload_file(
    task_name: str = Form(...),
    task_description: str = Form(...),
    files: list[UploadFile] = ...,
):
    """
    Upload a PDF file for processing.

    Returns:
        FileUploadResponse: Contains task ID and file information

    Raises:
        FileUploadException: When file upload validation fails
        StorageException: When storage operations fail
    """
    try:
        await validate_files(files)

        task_id, uploaded_files = await upload_files(files)

        task_data = {
            "name": task_name,
            "description": task_description,
            "files": [file.dict() for file in uploaded_files],
            "status": TaskStatus.created.value,
        }

        create_task(task_id=task_id, task_data=task_data)

        create_pn_from_pdfs_task.delay(
            task_id, [file.dict() for file in uploaded_files]
        )

        logger.info(
            "Files upload completed successfully",
            extra={
                "id": task_id,
                "files": uploaded_files,
            },
        )

        return FileUploadResponse(
            task_id=task_id,
            files=uploaded_files,
            status=TaskStatus.created.value,
            message="Files uploaded successfully and processing started",
        )

    except FileUploadException:
        raise
    except StorageException:
        raise
    except Exception as e:
        logger.exception(
            "Unexpected error during files upload",
            exc_info=e,
            extra={
                "files": uploaded_files,
            },
        )
        raise WatsonException("Unexpected error during files upload")


@files_router.get(
    "/files/{file_path:path}",
    status_code=status.HTTP_200_OK,
    responses={
        status.HTTP_404_NOT_FOUND: {"model": ErrorResponse},
        status.HTTP_500_INTERNAL_SERVER_ERROR: {"model": ErrorResponse},
    },
)
async def download_file(file_path: str):
    """
    Download a PDF file by its file path.

    Args:
        file_path (str): The path of the file to download.

    Returns:
        FileDownloadResponse: Contains the file content in bytes.

    Raises:
        FileNotFoundException: If the file is not found.
    """
    file_content = await minio_service.download_file(file_path)
    return Response(
        content=file_content,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"attachment; filename={file_path.split('/')[-1]}"
        },
    )
