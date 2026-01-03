import uuid
from typing import List

from api.database import models
from api.database.session import SessionLocal
from api.exceptions.watson_exceptions import PostgresException
from api.models.internal import EvidencePNGenerationResult
from sqlalchemy import exists, func, or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, selectinload


def _get_or_create_compound_cache(db: Session):
    cache: dict[str, models.Compound] = {}

    def get_or_create(name: str) -> models.Compound:
        normalized = name.strip()
        if not normalized:
            raise ValueError("Compound name cannot be empty")
        if normalized in cache:
            return cache[normalized]
        instance = db.scalar(
            select(models.Compound).where(models.Compound.name == normalized)
        )
        if instance is None:
            instance = models.Compound(name=normalized)
            db.add(instance)
            try:
                db.flush()
            except IntegrityError:
                db.rollback()
                instance = db.scalar(
                    select(models.Compound).where(models.Compound.name == normalized)
                )
        cache[normalized] = instance
        return instance

    return get_or_create


def save_task_results(task_id: str, results: List[EvidencePNGenerationResult]) -> None:
    """Persist processed task outputs into Postgres (task, files, chunks, relations, compounds)."""
    with SessionLocal() as db:
        with db.begin():
            task = db.get(models.Task, task_id)
            if task is None:
                raise PostgresException(
                    message=f"Task with ID {task_id} does not exist"
                )

            existing_files = {
                f.filename: f
                for f in db.scalars(
                    select(models.File).where(models.File.task_id == task_id)
                ).all()
            }

            get_compound = _get_or_create_compound_cache(db)

            for file_result in results:
                file_row = existing_files.get(file_result.file_name)
                if file_row is None:
                    raise PostgresException(
                        message=f"File {file_result.file_name} not found for task {task_id}, available files: {list(existing_files.keys())}"
                    )

                for pn_chunk in file_result.annotated_chunks:
                    chunk_row = models.Chunk(
                        id=pn_chunk.chunk.id,
                        file_id=file_row.id,
                        content=pn_chunk.chunk.text,
                        summary=pn_chunk.chunk.summary,
                    )
                    db.add(chunk_row)
                    db.flush()

                    if not pn_chunk.annotated_relations:
                        continue

                    for rel in pn_chunk.annotated_relations:
                        relation_row = models.Relation(
                            id=rel.id,
                            chunk_id=chunk_row.id,
                            text=rel.relation,
                            evidence=rel.evidence,
                            embedding=rel.embedding,
                        )
                        db.add(relation_row)

                        substrate_ids: set[int] = set()
                        modifier_ids: set[int] = set()
                        product_ids: set[int] = set()

                        for substrate in rel.substrates or []:
                            compound = get_compound(substrate)
                            if compound.id in substrate_ids:
                                continue
                            substrate_ids.add(compound.id)
                            relation_row.substrates.append(compound)

                        for modifier in rel.modifiers or []:
                            compound = get_compound(modifier)
                            if compound.id in modifier_ids:
                                continue
                            modifier_ids.add(compound.id)
                            relation_row.modifiers.append(compound)

                        for product in rel.products or []:
                            compound = get_compound(product)
                            if compound.id in product_ids:
                                continue
                            product_ids.add(compound.id)
                            relation_row.products.append(compound)


def find_chunk_with_relations(task_id: str, chunk_id: str):
    """Return a chunk with its relations and related compounds eagerly loaded."""
    with SessionLocal() as db:
        stmt = (
            select(models.Chunk)
            .where(models.Chunk.id == chunk_id)
            .where(models.File.task_id == task_id)
            .options(
                selectinload(models.Chunk.file),
                selectinload(models.Chunk.relations).selectinload(
                    models.Relation.substrates
                ),
                selectinload(models.Chunk.relations).selectinload(
                    models.Relation.modifiers
                ),
                selectinload(models.Chunk.relations).selectinload(
                    models.Relation.products
                ),
            )
        )
        return db.scalar(stmt)


def search_compound(task_id: str, name: str):
    """Find compounds used by relations belonging to a given task, filtered by name."""
    with SessionLocal() as db:
        name_filter = models.Compound.name.ilike(f"%{name}%")

        rel_in_task = (
            exists()
            .where(models.relation_substrates.c.compound_id == models.Compound.id)
            .where(models.relation_substrates.c.relation_id == models.Relation.id)
            .where(models.Relation.chunk_id == models.Chunk.id)
            .where(models.Chunk.file_id == models.File.id)
            .where(models.File.task_id == task_id)
        )

        modifier_in_task = (
            exists()
            .where(models.relation_modifiers.c.compound_id == models.Compound.id)
            .where(models.relation_modifiers.c.relation_id == models.Relation.id)
            .where(models.Relation.chunk_id == models.Chunk.id)
            .where(models.Chunk.file_id == models.File.id)
            .where(models.File.task_id == task_id)
        )

        product_in_task = (
            exists()
            .where(models.relation_products.c.compound_id == models.Compound.id)
            .where(models.relation_products.c.relation_id == models.Relation.id)
            .where(models.Relation.chunk_id == models.Chunk.id)
            .where(models.Chunk.file_id == models.File.id)
            .where(models.File.task_id == task_id)
        )

        stmt = select(models.Compound).where(
            name_filter & or_(rel_in_task, modifier_in_task, product_in_task)
        )
        return db.scalars(stmt).all()


def get_files_with_chunks(task_id: str):
    """Return all files for a task, each with its chunks eagerly loaded."""
    with SessionLocal() as db:
        stmt = (
            select(models.File)
            .where(models.File.task_id == task_id)
            .options(selectinload(models.File.chunks))
        )
        return db.scalars(stmt).unique().all()


def create_task(task_id: str, task_data: dict) -> None:
    """Create a new task entry in the database."""
    with SessionLocal() as db:
        with db.begin():
            files = []
            for file in task_data["files"]:
                file_row = models.File(
                    id=uuid.uuid4(),
                    task_id=task_id,
                    filename=file["storage_path"].split("/")[-1],
                    storage_path=file["storage_path"],
                )
                db.add(file_row)
                files.append(file_row)

            task = models.Task(
                id=task_id,
                name=task_data.get("name"),
                description=task_data.get("description"),
                status=task_data.get("status"),
                files=files,
            )
            db.add(task)


def update_task_status(task_id: str, status: str) -> None:
    """Update the status of an existing task."""
    with SessionLocal() as db:
        with db.begin():
            db.query(models.Task).filter(models.Task.id == task_id).update(
                {"status": status}
            )


def update_task_error(task_id: str, error_message: str) -> None:
    """Update the error message of an existing task."""
    with SessionLocal() as db:
        with db.begin():
            db.query(models.Task).filter(models.Task.id == task_id).update(
                {"error": error_message}
            )


def update_task_stage(task_id: str, stage: str) -> None:
    """Update the stage of an existing task."""
    with SessionLocal() as db:
        with db.begin():
            db.query(models.Task).filter(models.Task.id == task_id).update(
                {"stage": stage}
            )


def get_simple_task(task_id: str) -> dict | None:
    """Get a simple representation of a task by its ID."""
    with SessionLocal() as db:
        task = db.get(models.Task, task_id)
        if task is None:
            return None
        return {
            "task_id": task.id,
            "status": task.status,
            "stage": task.stage,
            "error": task.error,
            "task_name": task.name,
            "task_description": task.description,
            "files": [f.storage_path for f in task.files],
            "created_at": task.created_at,
            "updated_at": task.updated_at,
        }


def list_tasks(query: str, skip: int, limit: int, order: int) -> List[dict]:
    """List tasks with pagination and optional filtering."""
    with SessionLocal() as db:
        stmt = select(models.Task)

        if query:
            stmt = stmt.where(models.Task.status == query)
            total_stmt = (
                select(func.count())
                .select_from(models.Task)
                .where(models.Task.status == query)
            )
        else:
            total_stmt = select(func.count()).select_from(models.Task)

        total = db.scalar(total_stmt)

        if order == -1:
            stmt = stmt.order_by(models.Task.updated_at.desc())
        else:
            stmt = stmt.order_by(models.Task.updated_at.asc())

        stmt = stmt.offset(skip).limit(limit)

        tasks = db.scalars(stmt).all()
        return {
            "tasks": [
                {
                    "task_id": task.id,
                    "status": task.status,
                    "stage": task.stage,
                    "error": task.error,
                    "task_name": task.name,
                }
                for task in tasks
            ],
            "total": total,
        }


def search_by_embedding(task_id: str, embedding: List[float], top_k: int) -> List[dict]:
    """Search relations by embedding similarity within a task."""
    with SessionLocal() as db:
        distance_expr = models.Relation.embedding.cosine_distance(embedding)
        similarity_expr = (1 - distance_expr).label("similarity")

        stmt = (
            select(models.Relation, similarity_expr)
            .join(models.Chunk, models.Relation.chunk_id == models.Chunk.id)
            .join(models.File, models.Chunk.file_id == models.File.id)
            .where(models.File.task_id == task_id)
            .order_by(distance_expr.asc())
            .limit(top_k)
        )

        results = []
        for relation, similarity in db.execute(stmt):
            results.append(
                {
                    "relation_id": relation.id,
                    "chunk_id": relation.chunk_id,
                    "relation_text": relation.text,
                    "evidence": relation.evidence,
                    "substrates": [c.name for c in relation.substrates],
                    "modifiers": [c.name for c in relation.modifiers],
                    "products": [c.name for c in relation.products],
                    "similarity_score": similarity,
                }
            )
        return results
