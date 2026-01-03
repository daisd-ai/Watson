from datetime import datetime

from api.core.settings import TaskStage, TaskStatus, WatsonSettings
from pgvector.sqlalchemy import Vector
from sqlalchemy import (
    Column,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Table,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


class Base(DeclarativeBase):
    pass


# --- association tables for relation and compound (role-specific) ---
relation_substrates = Table(
    "relation_substrates",
    Base.metadata,
    Column(
        "relation_id",
        String,
        ForeignKey("relations.id", ondelete="CASCADE"),
        primary_key=True,
    ),
    Column(
        "compound_id", ForeignKey("compounds.id", ondelete="CASCADE"), primary_key=True
    ),
)

relation_modifiers = Table(
    "relation_modifiers",
    Base.metadata,
    Column(
        "relation_id",
        String,
        ForeignKey("relations.id", ondelete="CASCADE"),
        primary_key=True,
    ),
    Column(
        "compound_id", ForeignKey("compounds.id", ondelete="CASCADE"), primary_key=True
    ),
)

relation_products = Table(
    "relation_products",
    Base.metadata,
    Column(
        "relation_id",
        String,
        ForeignKey("relations.id", ondelete="CASCADE"),
        primary_key=True,
    ),
    Column(
        "compound_id", ForeignKey("compounds.id", ondelete="CASCADE"), primary_key=True
    ),
)


class Task(Base):
    __tablename__ = "tasks"

    id: Mapped[str] = mapped_column(
        String, primary_key=True, index=True, nullable=False, unique=True
    )
    files: Mapped[list["File"]] = relationship(
        back_populates="task", cascade="all, delete-orphan", passive_deletes=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )
    name: Mapped[str] = mapped_column(String, nullable=False)
    description: Mapped[str] = mapped_column(Text)
    status: Mapped[str] = mapped_column(
        String,
        nullable=False,
        default=TaskStatus.created.value,
    )
    stage: Mapped[str] = mapped_column(
        String,
        nullable=False,
        default=TaskStage.converting_pdfs.value,
    )
    error: Mapped[str | None] = mapped_column(Text)


class File(Base):
    __tablename__ = "files"

    id: Mapped[str] = mapped_column(String, primary_key=True, index=True, unique=True)
    task_id: Mapped[str] = mapped_column(
        ForeignKey("tasks.id", ondelete="CASCADE"), nullable=False, index=True
    )
    filename: Mapped[str] = mapped_column(String, nullable=False)
    storage_path: Mapped[str] = mapped_column(String, nullable=False)

    task: Mapped[Task] = relationship(back_populates="files")
    chunks: Mapped[list["Chunk"]] = relationship(
        back_populates="file", cascade="all, delete-orphan", passive_deletes=True
    )


class Chunk(Base):
    __tablename__ = "chunks"

    id: Mapped[str] = mapped_column(String, primary_key=True, index=True)
    file_id: Mapped[int] = mapped_column(
        ForeignKey("files.id", ondelete="CASCADE"), nullable=False, index=True
    )
    content: Mapped[str] = mapped_column(Text, nullable=False)
    summary: Mapped[str | None] = mapped_column(Text)

    file: Mapped[File] = relationship(back_populates="chunks")
    relations: Mapped[list["Relation"]] = relationship(
        back_populates="chunk", cascade="all, delete-orphan", passive_deletes=True
    )


class Relation(Base):
    __tablename__ = "relations"

    id: Mapped[str] = mapped_column(String, primary_key=True, index=True)
    chunk_id: Mapped[str] = mapped_column(
        ForeignKey("chunks.id", ondelete="CASCADE"), nullable=False, index=True
    )
    text: Mapped[str] = mapped_column(String, nullable=False)
    evidence: Mapped[str | None] = mapped_column(Text)
    embedding: Mapped[list[float] | None] = mapped_column(
        Vector(WatsonSettings.embedding_dim)
    )

    chunk: Mapped[Chunk] = relationship(back_populates="relations")
    substrates: Mapped[list["Compound"]] = relationship(
        secondary=relation_substrates, back_populates="substrate_relations"
    )
    modifiers: Mapped[list["Compound"]] = relationship(
        secondary=relation_modifiers, back_populates="modifier_relations"
    )
    products: Mapped[list["Compound"]] = relationship(
        secondary=relation_products, back_populates="product_relations"
    )


class Compound(Base):
    __tablename__ = "compounds"
    __table_args__ = (UniqueConstraint("name", name="uq_compounds_name"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String, nullable=False)

    substrate_relations: Mapped[list[Relation]] = relationship(
        secondary=relation_substrates, back_populates="substrates"
    )
    modifier_relations: Mapped[list[Relation]] = relationship(
        secondary=relation_modifiers, back_populates="modifiers"
    )
    product_relations: Mapped[list[Relation]] = relationship(
        secondary=relation_products, back_populates="products"
    )
