from api.core.logging import logger
from api.core.settings import WatsonSettings
from api.exceptions.watson_exceptions import ServiceUnavailableException
from api.models.error_responses import ErrorResponse
from api.models.responses import HealthResponse
from api.services.minio_service import minio_service
from fastapi import APIRouter, status

health_router = APIRouter()


@health_router.get(
    "/health",
    response_model=HealthResponse,
    status_code=status.HTTP_200_OK,
    responses={
        status.HTTP_503_SERVICE_UNAVAILABLE: {"model": ErrorResponse},
        status.HTTP_500_INTERNAL_SERVER_ERROR: {"model": ErrorResponse},
    },
)
async def health_check():
    try:
        minio_health = await minio_service.ensure_bucket_exists()
        if all(
            [
                minio_health,
            ]
        ):
            status = "UP"
        else:
            status = "DOWN"
        return HealthResponse(
            status=status,
            service=WatsonSettings.service_name,
            version=WatsonSettings.service_version,
        )

    except Exception as e:
        logger.error(f"Health check failed: {str(e)}")
        raise ServiceUnavailableException()
