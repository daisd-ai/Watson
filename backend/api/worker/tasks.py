from api.core.logging import logger
from api.core.settings import TaskStage, TaskStatus
from api.exceptions.watson_exceptions import ProcessingException
from api.models.responses import UploadedFile
from api.services.postgres_service import (
    save_task_results,
    update_task_error,
    update_task_stage,
    update_task_status,
)
from api.worker.celery_app import celery_app
from api.worker.chunk_summarizer import ChunkSummarizer
from api.worker.chunker import Chunker
from api.worker.embeddings import EmbeddingsWorker
from api.worker.evidence_finder import EvidenceFinder
from api.worker.pdf_converter import PDFConverter
from api.worker.pn_generator import PNGenerator


@celery_app.task
def create_pn_from_pdfs_task(task_id: str, uploaded_files: list[dict]):
    """
    Process PDF file and convert to markdown.

    Args:
        task_id: Unique task identifier
        file_path: Path to file in MinIO (bucket/object_name format)
    """
    try:
        logger.info(f"Starting PDF processing for task {task_id}")
        update_task_status(task_id, TaskStatus.in_progress.value)
        update_task_stage(task_id, TaskStage.converting_pdfs.value)

        uploaded_files = [UploadedFile(**file) for file in uploaded_files]
        pdf_converter = PDFConverter(task_id)
        markdown = pdf_converter.convert_pdfs_to_markdown(uploaded_files)
        del pdf_converter
        logger.info(f"PDF processing completed for task {task_id}")

        logger.info(f"Chunking documents for task {task_id}")
        update_task_stage(task_id, TaskStage.chunking_documents.value)
        chunker = Chunker(task_id)
        nodes = chunker.chunk_documents(markdown)
        logger.info(f"Chunking completed for task {task_id}")

        logger.info(f"Generating Petri nets for task {task_id}")
        update_task_stage(task_id, TaskStage.pn_generation.value)
        pn_generator = PNGenerator(task_id)
        pn_generation_result = pn_generator.generate_pns(nodes)
        del pn_generator
        logger.info(f"Petri net generation completed for task {task_id}")

        logger.info(f"Finding evidence for task {task_id}")
        update_task_stage(task_id, TaskStage.evidence_finding.value)
        evidence_finder = EvidenceFinder(task_id)
        evidence_results = evidence_finder.find_evidence(pn_generation_result)
        del evidence_finder
        logger.info(f"Evidence finding completed for task {task_id}")

        logger.info(f"Summarizing chunks for task {task_id}")
        update_task_stage(task_id, TaskStage.summarization.value)
        summarizer = ChunkSummarizer(task_id)
        summarized_results = summarizer.summarize_chunks(evidence_results)
        del summarizer
        logger.info(f"Chunk summarization completed for task {task_id}")

        logger.info(f"Generating embeddings for task {task_id}")
        update_task_stage(task_id, TaskStage.embedding.value)
        embeddings_worker = EmbeddingsWorker(task_id)
        embedded_output = embeddings_worker.generate_embeddings(summarized_results)
        del embeddings_worker

        logger.info(f"Processing completed successfully for task {task_id}")

        save_task_results(task_id, embedded_output)

        update_task_status(task_id, TaskStatus.completed.value)

        logger.info(f"Processing completed successfully for task {task_id}")
    except Exception as e:
        logger.error(f"Error in processing for task {task_id}: {str(e)}")
        update_task_status(task_id, TaskStatus.failed.value)
        update_task_error(task_id, str(e))
        raise ProcessingException(
            message=f"Processing failed: {str(e)}",
            original_error=e,
            task_id=task_id,
        ) from e
