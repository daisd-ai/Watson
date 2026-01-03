"""
Custom exceptions for the PDF Converter service.
"""

from typing import Optional


class WatsonException(Exception):
    """Base exception for all Watson service related errors."""

    def __init__(
        self,
        message: str,
        status_code: int = 500,
        error_code: Optional[str] = None,
        details: Optional[dict] = None,
    ):
        self.message = message
        self.status_code = status_code
        self.error_code = error_code or self.__class__.__name__
        self.details = details or {}
        super().__init__(self.message)

    def to_dict(self) -> dict:
        """Convert exception to dictionary for API responses."""
        return {
            "error": self.error_code,
            "message": self.message,
            "details": self.details,
        }


class FileUploadException(WatsonException):
    """Exception raised when file upload fails."""

    def __init__(
        self,
        message: str = "File upload failed",
        filename: Optional[str] = None,
        file_size: Optional[int] = None,
    ):
        details = {}
        if filename:
            details["filename"] = filename
        if file_size:
            details["file_size_bytes"] = file_size

        super().__init__(message=message, status_code=400, details=details)


class TaskNotFoundException(WatsonException):
    """Exception raised when task is not found."""

    def __init__(
        self,
        message: str = "Task not found",
        task_id: Optional[str] = None,
    ):
        details = {}
        if task_id:
            details["task_id"] = task_id

        super().__init__(message=message, status_code=404, details=details)


class FileNotFoundException(WatsonException):
    """Exception raised when a file is not found."""

    def __init__(
        self, message: str = "File not found", file_path: Optional[str] = None
    ):
        details = {}
        if file_path:
            details["file_path"] = file_path

        super().__init__(message=message, status_code=404, details=details)


class ProcessingException(WatsonException):
    """Exception raised when Watson processing fails."""

    def __init__(
        self,
        message: str = "Watson processing failed",
        original_error: Optional[Exception] = None,
        task_id: Optional[str] = None,
    ):
        details = {}
        if original_error:
            details["original_error"] = str(original_error)
            details["error_type"] = type(original_error).__name__
        if task_id:
            details["task_id"] = task_id

        super().__init__(message=message, status_code=500, details=details)


class StorageException(WatsonException):
    """Exception raised when storage operations fail."""

    def __init__(
        self,
        message: str = "Storage operation failed",
        storage_type: Optional[str] = None,
        operation: Optional[str] = None,
    ):
        details = {}
        if storage_type:
            details["storage_type"] = storage_type
        if operation:
            details["operation"] = operation

        super().__init__(message=message, status_code=500, details=details)


class ServiceUnavailableException(WatsonException):
    """Exception raised when a service is unavailable."""

    def __init__(self, message: str = "Service is unavailable"):
        super().__init__(message=message, status_code=503)


class ChunkerException(WatsonException):
    """Exception raised when chunking documents fails."""

    def __init__(
        self,
        message: str = "Document chunking failed",
        original_error: Optional[Exception] = None,
        task_id: Optional[str] = None,
    ):
        details = {}
        if original_error:
            details["original_error"] = str(original_error)
            details["error_type"] = type(original_error).__name__
        if task_id:
            details["task_id"] = task_id

        super().__init__(message=message, status_code=500, details=details)


class ChunkNotFoundException(WatsonException):
    """Exception raised when a chunk is not found."""

    def __init__(
        self,
        message: str = "Chunk not found",
        chunk_id: Optional[str] = None,
    ):
        details = {}
        if chunk_id:
            details["chunk_id"] = chunk_id

        super().__init__(message=message, status_code=404, details=details)


class EvidenceNotFoundException(WatsonException):
    """Exception raised when an evidence is not found."""

    def __init__(
        self,
        message: str = "Evidence not found",
        evidence_id: Optional[str] = None,
    ):
        details = {}
        if evidence_id:
            details["evidence_id"] = evidence_id

        super().__init__(message=message, status_code=404, details=details)


class GraphNotFoundException(WatsonException):
    """Exception raised when a graph is not found."""

    def __init__(
        self,
        message: str = "Graph not found",
        graph_id: Optional[str] = None,
    ):
        details = {}
        if graph_id:
            details["graph_id"] = graph_id

        super().__init__(message=message, status_code=404, details=details)


class PostgresException(WatsonException):
    """Exception raised for PostgreSQL related errors."""

    def __init__(
        self,
        message: str = "PostgreSQL operation failed",
        original_error: Optional[Exception] = None,
    ):
        details = {}
        if original_error:
            details["original_error"] = str(original_error)
            details["error_type"] = type(original_error).__name__

        super().__init__(message=message, status_code=500, details=details)


class EmbeddingsException(WatsonException):
    """Exception raised for Embeddings related errors."""

    def __init__(
        self,
        message: str = "Embeddings operation failed",
        original_error: Optional[Exception] = None,
    ):
        details = {}
        if original_error:
            details["original_error"] = str(original_error)
            details["error_type"] = type(original_error).__name__

        super().__init__(message=message, status_code=500, details=details)
