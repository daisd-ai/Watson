import uuid

from api.core.logging import logger
from api.core.settings import WatsonSettings
from api.exceptions.watson_exceptions import ChunkerException
from api.models.internal import Chunk, ChunkingResult, PDFConversionResult


class Chunker:
    def __init__(self, task_id: str):
        self.task_id = task_id

    @staticmethod
    def _remove_white_characters(text: str) -> str:
        """Removes all white characters from a text string."""
        return text.replace("\n", " ").replace("\t", " ").replace("\r", " ")

    @staticmethod
    def _remove_multiple_whitespaces(text: str) -> str:
        """Removes multiple whitespaces from a text string."""
        return " ".join(text.split())

    @staticmethod
    def _remove_references(text: str) -> str:
        """Removes references from a text string."""
        if "## references" in text.lower():
            return text[: text.lower().rindex("references")]
        return text

    @staticmethod
    def _remove_keywords(text: str) -> str:
        """Removes text up to keywords from a text string."""
        if "keywords" in text.lower():
            return text[text.lower().index("keywords") :]
        return text

    def _sentence_chunking(self, documents: list[PDFConversionResult]) -> list:
        """
        Perform sentence chunking on the documents using a sentence splitter.
        This method splits documents into sentences based on the specified chunk size.
        """
        from llama_index.core import Document
        from llama_index.core.node_parser import SentenceSplitter

        logger.info("Starting sentence chunking for documents")
        splitter = SentenceSplitter(
            chunk_size=WatsonSettings.chunk_size,
            chunk_overlap=WatsonSettings.chunk_overlap,
            paragraph_separator="## ",
        )

        clean_documents = [self._remove_references(i.content) for i in documents]
        clean_documents = [self._remove_keywords(i) for i in clean_documents]
        clean_documents = [self._remove_white_characters(i) for i in clean_documents]
        clean_documents = [
            self._remove_multiple_whitespaces(i) for i in clean_documents
        ]
        documents = [
            Document(text=text, metadata={"file_name": doc.file_name})
            for text, doc in zip(clean_documents, documents)
        ]

        nodes = splitter.get_nodes_from_documents(documents)
        logger.info(f"Generated {len(nodes)} nodes from documents")

        return nodes

    def chunk_documents(
        self, documents: list[PDFConversionResult]
    ) -> list[ChunkingResult]:
        """
        Chunk the documents into smaller pieces for processing.
        """
        try:
            nodes = self._sentence_chunking(documents)

            result = {}
            for node in nodes:
                content = node.get_content()
                content_id = str(uuid.uuid4())
                file_name = node.metadata["file_name"]

                if file_name not in result:
                    result[file_name] = []

                result[file_name].append(Chunk(id=content_id, text=content))

            return [
                ChunkingResult(file_name=file_name, chunks=chunks)
                for file_name, chunks in result.items()
            ]
        except Exception as e:
            logger.error(f"Chunking failed for task {self.task_id}: {str(e)}")
            raise ChunkerException(
                message=f"Chunking failed: {str(e)}",
                original_error=e,
                task_id=self.task_id,
            ) from e
