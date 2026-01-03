FROM python:3.11-slim-bookworm

RUN apt-get update \
    && apt-get install -y libgl1 libglib2.0-0 curl wget git procps \
    && rm -rf /var/lib/apt/lists/*

RUN pip install uv

WORKDIR /app

COPY ./requirements.txt /tmp/requirements.txt
RUN uv pip install -r /tmp/requirements.txt --system

COPY api/ /app/api/
COPY .env /app/.env
