from api.core.logging import logger
from api.core.settings import CelerySettings
from celery import Celery
from celery.signals import worker_init


@worker_init.connect()
def init_worker(*args, **kwargs):
    logger.instrument_celery()


celery_app = Celery("service")

celery_app.config_from_object(CelerySettings)

celery_app.conf.update(worker_hijack_root_logger=False)
celery_app.autodiscover_tasks(["api.worker.tasks"])
