from datetime import datetime
from typing import List, Literal, Optional, Tuple

from pydantic import BaseModel, Field


class UploadedFile(BaseModel):
    """Model representing an uploaded file."""

    filename: str = Field(..., description="Original filename")
    file_size: Optional[int] = Field(None, description="File size in bytes")
    content_type: Optional[str] = Field(None, description="File content type")
    storage_path: Optional[str] = Field(None, description="Storage path in MinIO")
    file_url: Optional[str] = Field(None, description="Access URL for the file")


class FullTaskResponse(BaseModel):
    """Response model for task information."""

    task_id: str = Field(..., description="Unique task identifier")
    task_name: str = Field(None, description="Name of the task")
    stage: Optional[str] = Field(None, description="Current task stage")
    task_description: str = Field(None, description="Description of the task")
    status: str = Field(..., description="Current task status")
    files: list[str] = Field(..., description="List of uploaded files")
    error: Optional[str] = Field(None, description="Error message if failed")
    created_at: Optional[datetime] = Field(None, description="Task creation time")
    updated_at: Optional[datetime] = Field(None, description="Last update time")


class SimpleTaskResponse(BaseModel):
    """Response model for a simplified task information."""

    task_id: str = Field(..., description="Unique task identifier")
    task_name: Optional[str] = Field(None, description="Name of the task")
    stage: Optional[str] = Field(None, description="Current task stage")
    status: str = Field(..., description="Current task status")
    error: Optional[str] = Field(None, description="Error message if failed")


class FileUploadResponse(BaseModel):
    """Response model for file upload."""

    task_id: str = Field(..., description="Unique task identifier")
    files: list[UploadedFile] = Field(..., description="List of uploaded files")
    status: str = Field(..., description="Initial task status")
    message: str = Field(..., description="Success message")


class TaskListResponse(BaseModel):
    """Response model for task list."""

    tasks: List[SimpleTaskResponse] = Field(..., description="List of tasks")
    total: int = Field(..., description="Total number of tasks")
    limit: int = Field(..., description="Applied limit")
    offset: int = Field(..., description="Applied offset")


class HealthResponse(BaseModel):
    """Response model for health check."""

    status: str = Literal["UP", "DOWN"]
    service: str = Field(..., description="Service name")
    version: str = Field(..., description="Service version")


class FileDownloadResponse(BaseModel):
    """Response model for file download."""

    file: bytes = Field(..., description="File content in bytes")


class FileChunkResponse(BaseModel):
    """Response model for a file chunk."""

    file_name: str = Field(..., description="Name of the file")
    chunks: List[str] = Field(..., description="List of text chunks")


class ResultResponse(BaseModel):
    """Response model for task result."""

    task_id: str = Field(..., description="Unique task identifier")
    files: List[FileChunkResponse] = Field(..., description="List of file chunks")


class RelationResponse(BaseModel):
    """Response model for a relation."""

    id: str = Field(..., description="Unique relation identifier")
    text: str = Field(..., description="Relation text")
    evidence: str = Field(..., description="Evidence supporting the relation")
    substrates: List[str] = Field(..., description="List of substrate compounds")
    modifiers: List[str] = Field(..., description="List of modifier compounds")
    products: List[str] = Field(..., description="List of product compounds")


class ChunkRelationsResponse(BaseModel):
    """Response model for relations within a chunk."""

    chunk_id: str = Field(..., description="Unique chunk identifier")
    file_name: str = Field(..., description="Name of the source file")
    content: str = Field(..., description="Full chunk text")
    summary: str = Field(..., description="Chunk summary if available")
    relations: List[RelationResponse] = Field(
        ..., description="List of relations in the chunk"
    )


class SingleSearchResult(BaseModel):
    """Model representing a single search result."""

    relation_id: str = Field(..., description="Unique relation identifier")
    chunk_id: str = Field(..., description="Unique chunk identifier")
    relation_text: str = Field(..., description="Text of the relation")
    evidence: str = Field(..., description="Evidence supporting the relation")
    substrates: List[str] = Field(..., description="List of substrate compounds")
    modifiers: List[str] = Field(..., description="List of modifier compounds")
    products: List[str] = Field(..., description="List of product compounds")
    similarity_score: float = Field(..., description="Similarity score")


class SearchResultResponse(BaseModel):
    """Response model for search results."""

    query: str = Field(..., description="Search query string")
    results: List[SingleSearchResult] = Field(
        ..., description="List of single search results"
    )
