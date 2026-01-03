import gc
from typing import List

import torch
from api.core.logging import logger
from api.core.settings import WatsonSettings
from api.exceptions.watson_exceptions import ProcessingException
from api.models.internal import EvidencePNGenerationResult


class EmbeddingsWorker:
    def __init__(self, task_id: str):
        from vllm import LLM

        self.task_id = task_id
        self.embedding_model = LLM(
            model=WatsonSettings.embedding_model,
            enforce_eager=True,
            gpu_memory_utilization=WatsonSettings.gpu_memory_utilization,
        )

        self.embedding_instruction = (
            "Given a relation retrieve relevant relations that match the query"
        )

    def __del__(self):
        if hasattr(self, "embedding_model"):
            self.embedding_model.llm_engine.engine_core.shutdown()
            del self.embedding_model
        gc.collect()
        torch.cuda.empty_cache()
        torch.cuda.synchronize()

    def _extract_relations(
        self, annotated_data: List[EvidencePNGenerationResult]
    ) -> List[str]:
        relations = []
        for node in annotated_data:
            for chunk in node.annotated_chunks:
                if not chunk.annotated_relations:
                    continue
                for relation in chunk.annotated_relations:
                    relations.append(
                        f"Relation: {relation.relation} Substrates: {relation.substrates} Modifiers: {relation.modifiers} Products: {relation.products} Evidence: {relation.evidence}"
                    )
        return relations

    def _get_detailed_instruct(self, query: str) -> str:
        return f"Instruct: {self.embedding_instruction}\nQuery:{query}"

    def _run_embedding(self, relations: List[str]) -> List[List[float]]:
        detailed_relations = [
            self._get_detailed_instruct(relation) for relation in relations
        ]
        outputs = self.embedding_model.embed(detailed_relations)
        embeddings = [output.outputs.embedding for output in outputs]

        return embeddings

    def _match_embeddings_to_relations(
        self,
        annotated_data: List[EvidencePNGenerationResult],
        embeddings: List[List[float]],
    ) -> None:
        embedding_index = 0
        for node in annotated_data:
            for chunk in node.annotated_chunks:
                if not chunk.annotated_relations:
                    continue
                for relation in chunk.annotated_relations:
                    relation.embedding = embeddings[embedding_index]
                    embedding_index += 1

    def generate_embeddings(
        self, annotated_data: List[EvidencePNGenerationResult]
    ) -> List[EvidencePNGenerationResult]:
        try:
            logger.info(f"Starting embedding generation for task {self.task_id}")
            relations = self._extract_relations(annotated_data)

            logger.info(
                f"Extracted {len(relations)} relations for embedding generation for task {self.task_id}"
            )
            embeddings = self._run_embedding(relations)

            logger.info(
                f"Generated embeddings for {len(embeddings)} relations for task {self.task_id}"
            )
            self._match_embeddings_to_relations(annotated_data, embeddings)
            return annotated_data
        except Exception as e:
            logger.error(
                f"Error during embedding generation for task {self.task_id}: {str(e)}"
            )
            raise ProcessingException(
                f"Error during embedding generation: {str(e)}"
            ) from e
