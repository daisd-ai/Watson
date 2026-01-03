from api.routers.files import files_router
from api.routers.health import health_router
from api.routers.results import results_router
from api.routers.search import search_router
from api.routers.tasks import tasks_router
from fastapi import APIRouter

main_router = APIRouter()
main_router.include_router(files_router, tags=["Files"])
main_router.include_router(health_router, tags=["Health"])
main_router.include_router(tasks_router, tags=["Tasks"])
main_router.include_router(results_router, tags=["Results"])
main_router.include_router(search_router, tags=["Search"])
