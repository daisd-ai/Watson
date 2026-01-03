from contextlib import asynccontextmanager

from api.core.logging import logger
from api.core.settings import WatsonSettings
from api.database.session import init_db
from api.middleware.error_handlers import register_exception_handlers
from api.routers.routers import main_router
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield


app = FastAPI(
    title=WatsonSettings.service_name,
    description="Service for Petri Net generation",
    version=WatsonSettings.service_version,
    root_path="/",
    lifespan=lifespan,
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
logger.instrument_fastapi(app)

register_exception_handlers(app)

app.include_router(main_router)
