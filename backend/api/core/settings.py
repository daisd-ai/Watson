from enum import Enum

from pydantic import Field
from pydantic_settings import BaseSettings


class WatsonSettings(BaseSettings):
    service_name: str = "Watson Service"
    service_version: str = "1.0.0"
    chunk_size: int = 512
    chunk_overlap: int = 0
    llm_model: str = "daisd-ai/cannary-re-reasoning-v2"
    temperature: float = 0.6
    max_tokens: int = 8096
    tensor_parallel_size: int = 1
    gpu_memory_utilization: float = 0.7
    max_model_len: int = 10000
    embedding_model: str = Field(..., alias="EMBEDDING_MODEL")
    vllm_container: str = Field(..., alias="VLLM_CONTAINER_NAME")
    vllm_port: int = Field(..., alias="VLLM_PORT")
    embedding_dim: int = 1024
    be_model: str = "daisd-ai/be-0.6B"
    cs_model: str = "Qwen/Qwen3-4B-Instruct-2507"

    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
        "case_sensitive": False,
        "extra": "ignore",
    }


class TaskStatus(str, Enum):
    created = "created"
    in_progress = "processing"
    completed = "completed"
    failed = "failed"


class TaskStage(str, Enum):
    converting_pdfs = "converting_pdfs"
    chunking_documents = "chunking_documents"
    pn_generation = "pn_generation"
    entity_linking = "entity_linking"
    evidence_finding = "evidence_finding"
    summarization = "summarization"
    embedding = "embedding"


class CelerySettings(BaseSettings):
    broker_transport: str = "amqp"
    broker_user: str = Field(..., alias="RABBIT_USER")
    broker_pass: str = Field(..., alias="RABBIT_PASSWORD")
    broker_host: str = Field(..., alias="RABBITMQ_CONTAINER_NAME")
    broker_port: int = Field(..., alias="RABBIT_PORT_1")
    broker_queue: str = "default"
    celery_task_always_eager: bool = False
    celery_worker_log_color: bool = False
    celery_worker_concurrency: int = 1

    # Heartbeat and connection settings
    broker_heartbeat: int = 0  # Disable heartbeat
    broker_connection_retry: bool = True
    broker_connection_retry_on_startup: bool = True
    broker_connection_max_retries: int = 5

    # Task acknowledgment settings
    task_acks_late: bool = True  # Acknowledge task after completion
    task_reject_on_worker_lost: bool = True
    task_time_limit: int = 2400  # 40 minutes hard limit
    task_soft_time_limit: int = 1200  # 20 minutes soft limit

    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
        "case_sensitive": False,
        "extra": "ignore",
    }


class MinioSettings(BaseSettings):
    minio_host: str = Field(..., alias="MINIO_CONTAINER_NAME")
    minio_port: int = Field(..., alias="MINIO_PORT")
    minio_access_key: str = Field(..., alias="MINIO_ACCESS_KEY")
    minio_secret_key: str = Field(..., alias="MINIO_SECRET_KEY")
    minio_secure: bool = Field(..., alias="MINIO_SECURE")
    minio_bucket: str = Field(..., alias="MINIO_BUCKET")

    @property
    def minio_endpoint(self) -> str:
        return f"{self.minio_host}:{self.minio_port}"

    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
        "case_sensitive": False,
        "extra": "ignore",
    }


class PostgresSettings(BaseSettings):
    host: str = Field(..., alias="POSTGRES_HOST")
    port: int = Field(5432, alias="POSTGRES_PORT")
    db: str = Field(..., alias="POSTGRES_DB")
    user: str = Field(..., alias="POSTGRES_USER")
    password: str = Field(..., alias="POSTGRES_PASSWORD")

    @property
    def dsn(self) -> str:
        return f"postgresql+psycopg2://{self.user}:{self.password}@{self.host}:{self.port}/{self.db}"

    @property
    def admin_dsn(self) -> str:
        return f"postgresql+psycopg2://{self.user}:{self.password}@{self.host}:{self.port}/postgres"

    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
        "case_sensitive": False,
        "extra": "ignore",
    }


WatsonSettings = WatsonSettings()
CelerySettings = CelerySettings()
MinioSettings = MinioSettings()
PostgresSettings = PostgresSettings()
