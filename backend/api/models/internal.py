from dataclasses import dataclass
from typing import List, Optional, Tuple


@dataclass
class PDFConversionResult:
    file_name: str
    content: str


@dataclass
class Chunk:
    id: str
    text: str
    summary: Optional[str] = None


@dataclass
class ChunkingResult:
    file_name: str
    chunks: List[Chunk]


@dataclass
class PNRelation:
    id: str
    relation: str
    substrates: Optional[List[str]] = None
    modifiers: Optional[List[str]] = None
    products: Optional[List[str]] = None


@dataclass
class PNChunk:
    chunk: Chunk
    relations: Optional[List[PNRelation]] = None


@dataclass
class PNGenerationResult:
    file_name: str
    annotated_chunks: List[PNChunk]


@dataclass
class EvidencePNRelation:
    id: str
    relation: str
    evidence: str
    substrates: Optional[List[Tuple[str, str]]] = None
    modifiers: Optional[List[Tuple[str, str]]] = None
    products: Optional[List[Tuple[str, str]]] = None
    embedding: Optional[List[float]] = None


@dataclass
class EvidencePNChunk:
    chunk: Chunk
    annotated_relations: Optional[List[EvidencePNRelation]] = None


@dataclass
class EvidencePNGenerationResult:
    file_name: str
    annotated_chunks: List[EvidencePNChunk]
