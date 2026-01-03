import gc
import io

import torch
from api.core.logging import logger
from api.exceptions.watson_exceptions import (
    FileNotFoundException,
    ProcessingException,
    StorageException,
)
from api.models.internal import PDFConversionResult
from api.models.responses import UploadedFile
from api.services.minio_service import minio_service
from docling.datamodel.base_models import DocumentStream
from docling.document_converter import DocumentConverter


class PDFConverter:
    def __init__(self, task_id: str):
        self.task_id = task_id
        self.converter = DocumentConverter()

    def __del__(self):
        if hasattr(self, "converter"):
            del self.converter
        gc.collect()
        torch.cuda.empty_cache()
        torch.cuda.synchronize()

    def convert_pdfs_to_markdown(
        self, uploaded_files: list[UploadedFile]
    ) -> list[PDFConversionResult]:
        """
        Convert a list of PDF files to Markdown format.

        Args:
            uploaded_files: List of uploaded PDF files.
        """
        try:
            markdown = []

            for file in uploaded_files:
                bucket_name, object_name = file.storage_path.split("/", 1)

                logger.info(f"Downloading file from MinIO: {bucket_name}/{object_name}")
                pdf_content = minio_service.download_file_sync(file.storage_path)
                file_stream = io.BytesIO(pdf_content)
                logger.info(f"Converting file to Markdown: {file.filename}")
                markdown.append(
                    PDFConversionResult(
                        file_name=file.filename,
                        content=self.converter.convert(
                            DocumentStream(name=file.filename, stream=file_stream)
                        ).document.export_to_markdown(),
                    )
                )

            return markdown
        except StorageException as e:
            logger.error(f"Storage error for task {self.task_id}: {str(e)}")
            raise ProcessingException(
                message=f"Storage error during PDF processing: {str(e)}",
                original_error=e,
                task_id=self.task_id,
            ) from e
        except FileNotFoundException as e:
            logger.error(f"File not found for task {self.task_id}: {file.storage_path}")
            raise ProcessingException(
                message=f"File not found: {file.storage_path}",
                original_error=e,
                task_id=self.task_id,
            ) from e
