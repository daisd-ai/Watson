from api.core.settings import PostgresSettings
from api.database.models import Base
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker


def _create_database_if_missing() -> None:
    admin_engine = create_engine(
        PostgresSettings.admin_dsn,
        isolation_level="AUTOCOMMIT",
        pool_pre_ping=True,
        future=True,
    )
    try:
        with admin_engine.connect() as conn:
            exists = conn.execute(
                text("SELECT 1 FROM pg_database WHERE datname = :db_name"),
                {"db_name": PostgresSettings.db},
            ).scalar()
            if not exists:
                conn.execute(text(f'CREATE DATABASE "{PostgresSettings.db}"'))
    finally:
        admin_engine.dispose()


engine = create_engine(PostgresSettings.dsn, pool_pre_ping=True, future=True)
SessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False, future=True)


def init_db() -> None:
    _create_database_if_missing()
    with engine.begin() as conn:
        conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
        Base.metadata.create_all(bind=conn)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
