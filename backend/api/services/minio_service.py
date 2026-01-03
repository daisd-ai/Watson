import io

from api.core.logging import logger
from api.core.settings import MinioSettings
from api.exceptions.watson_exceptions import (
    FileNotFoundException,
    StorageException,
)
from minio import Minio
from minio.error import S3Error


class MinIOService:
    """Service for MinIO operations."""

    def __init__(self):
        self.client = Minio(
            MinioSettings.minio_endpoint,
            access_key=MinioSettings.minio_access_key,
            secret_key=MinioSettings.minio_secret_key,
            secure=MinioSettings.minio_secure,
        )
        self.bucket = MinioSettings.minio_bucket

    async def ensure_bucket_exists(self) -> bool:
        """Ensure the bucket exists, create if not."""
        try:
            if not self.client.bucket_exists(self.bucket):
                self.client.make_bucket(self.bucket)
                logger.info(f"Bucket '{self.bucket}' created successfully")
            else:
                logger.info(f"Bucket '{self.bucket}' already exists")
            return True
        except S3Error as e:
            logger.error(f"Error ensuring bucket exists: {str(e)}")
            raise StorageException(
                message=f"Failed to ensure bucket exists: {str(e)}",
                storage_type="minio",
                operation="ensure_bucket",
            ) from e

    async def upload_file(
        self, object_name: str, file_content: bytes, content_type: str
    ) -> str:
        """Upload file to MinIO."""
        try:
            file_size = len(file_content)
            self.client.put_object(
                bucket_name=self.bucket,
                object_name=object_name,
                data=io.BytesIO(file_content),
                length=file_size,
                content_type=content_type,
            )

            file_url = (
                f"http://{MinioSettings.minio_endpoint}/{self.bucket}/{object_name}"
            )
            logger.info(f"File uploaded successfully: {object_name}")
            return file_url

        except S3Error as e:
            logger.error(f"Error uploading file {object_name}: {str(e)}")
            raise StorageException(
                message=f"Failed to upload file: {str(e)}",
                storage_type="minio",
                operation="upload",
            ) from e

    async def download_file(self, object_name: str) -> bytes:
        """Download file from MinIO."""
        try:
            response = self.client.get_object(self.bucket, object_name)
            content = response.read()
            response.close()
            response.release_conn()
            return content

        except S3Error as e:
            if e.code == "NoSuchKey":
                logger.warning(f"File not found: {object_name}")
                raise FileNotFoundException(f"File not found: {object_name}")
            else:
                logger.error(f"Error downloading file {object_name}: {str(e)}")
                raise StorageException(
                    message=f"Failed to download file: {str(e)}",
                    storage_type="minio",
                    operation="download",
                ) from e

    def download_file_sync(self, object_name: str) -> bytes:
        """Download file from MinIO synchronously."""
        try:
            response = self.client.get_object(self.bucket, object_name)
            content = response.read()
            response.close()
            response.release_conn()
            return content

        except S3Error as e:
            if e.code == "NoSuchKey":
                logger.warning(f"File not found: {object_name}")
                raise FileNotFoundException(f"File not found: {object_name}")
            else:
                logger.error(f"Error downloading file {object_name}: {str(e)}")
                raise StorageException(
                    message=f"Failed to download file: {str(e)}",
                    storage_type="minio",
                    operation="download",
                ) from e


minio_service = MinIOService()
