import uuid

from api.core.logging import logger
from api.exceptions.watson_exceptions import FileUploadException
from api.models.responses import UploadedFile
from api.services.minio_service import minio_service
from fastapi import UploadFile


async def validate_files(files: list[UploadFile]) -> bool:
    """
    Validate the uploaded files.

    Args:
        files (list[UploadFile]): The list of uploaded files.

    Returns:
        FileUploadResponse: The response containing the validation results.
    """
    for file in files:
        if not file.filename:
            raise FileUploadException(message="No filename provided")

        if not file.content_type or not file.content_type.startswith("application/pdf"):
            raise FileUploadException(
                message="Only PDF files are allowed", filename=file.filename
            )

    if len(set([file.filename for file in files])) != len(files):
        raise FileUploadException(message="Duplicate filenames are not allowed")

    return True


async def upload_files(files: list[UploadedFile]) -> list[str]:
    await minio_service.ensure_bucket_exists()

    uploaded_files = []
    task_id = str(uuid.uuid4())

    for file in files:
        file_content = await file.read()
        file_size = len(file_content)

        object_name = f"{task_id}/{file.filename}"
        content_type = file.content_type or "application/pdf"

        logger.info(
            "Processing file upload",
            extra={
                "task_id": task_id,
                "filename": object_name,
                "file_size": file_size,
                "content_type": content_type,
            },
        )

        file_url = await minio_service.upload_file(
            object_name=object_name,
            file_content=file_content,
            content_type=content_type,
        )

        uploaded_files.append(
            UploadedFile(
                filename=file.filename,
                file_size=file_size,
                content_type=content_type,
                storage_path=object_name,
                file_url=file_url,
            )
        )

    return task_id, uploaded_files
