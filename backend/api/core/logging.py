"""
Logging configuration for the embeddings service.
"""

import logfire
from api.core.settings import WatsonSettings

logfire.configure(
    service_name=WatsonSettings.service_name,
    send_to_logfire=False,
)

logger = logfire
