FROM postgres:18.1-trixie

RUN apt-get update \
    && apt-get install -y postgresql-18-pgvector \
    && rm -rf /var/lib/apt/lists/*
