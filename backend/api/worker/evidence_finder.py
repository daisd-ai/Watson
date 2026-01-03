import gc
from typing import List

import torch
from api.core.logging import logger
from api.core.settings import WatsonSettings
from api.exceptions.watson_exceptions import ProcessingException
from api.models.internal import (
    EvidencePNChunk,
    EvidencePNGenerationResult,
    EvidencePNRelation,
    PNGenerationResult,
)


class EvidenceFinder:
    def __init__(self, task_id: str):
        from transformers import AutoTokenizer
        from vllm import LLM, SamplingParams

        logger.info("Initializing EvidenceFinder")
        self.task_id = task_id
        self.sampling_params = SamplingParams(
            temperature=0,
            max_tokens=WatsonSettings.chunk_size,
        )
        self.llm = LLM(
            model=WatsonSettings.be_model,
            tensor_parallel_size=WatsonSettings.tensor_parallel_size,
            gpu_memory_utilization=WatsonSettings.gpu_memory_utilization,
            enforce_eager=True,
        )
        self.tokenizer = AutoTokenizer.from_pretrained(WatsonSettings.be_model)

    def __del__(self):
        if hasattr(self, "llm"):
            self.llm.llm_engine.engine_core.shutdown()
            del self.llm
        gc.collect()
        torch.cuda.empty_cache()
        torch.cuda.synchronize()

    def _prepare_prompts(self, nodes: List[PNGenerationResult]) -> list[str]:
        prompts = []
        for node in nodes:
            for chunk in node.annotated_chunks:
                if not chunk.relations:
                    continue

                for relation in chunk.relations:
                    messages = [
                        {
                            "role": "user",
                            "content": chunk.chunk.text,
                        },
                        {
                            "role": "assistant",
                            "content": "I read the text.",
                        },
                        {
                            "role": "user",
                            "content": f"Which part of the text supports {relation.relation}?",
                        },
                    ]
                    prompt = self.tokenizer.apply_chat_template(
                        messages, tokenize=False, add_generation_prompt=True
                    )
                    prompts.append(prompt)

        return prompts

    def _run_inference(self, prompts: list[str]) -> list[str]:
        """
        Run inference on the LLM with the provided prompts.

        Args:
            prompts: List of prompts to process.

        Returns:
            List of generated responses from the LLM.
        """
        outputs = self.llm.generate(prompts, self.sampling_params)
        responses = [output.outputs[0].text for output in outputs]
        return responses

    def _match_responses_to_relations(
        self, nodes: List[PNGenerationResult], responses: list[str]
    ) -> List[EvidencePNGenerationResult]:
        response_idx = 0
        results_with_evidence = []
        for node in nodes:
            annotated_chunks = []
            for chunk in node.annotated_chunks:
                if not chunk.relations:
                    continue

                annotated_relations = []
                for relation in chunk.relations:
                    response = responses[response_idx]
                    response_idx += 1
                    evidence_relation = EvidencePNRelation(
                        id=relation.id,
                        relation=relation.relation,
                        substrates=relation.substrates,
                        modifiers=relation.modifiers,
                        products=relation.products,
                        evidence=response.strip() if response.strip() else None,
                    )

                    annotated_relations.append(evidence_relation)
                annotated_chunks.append(
                    EvidencePNChunk(
                        chunk=chunk.chunk,
                        annotated_relations=annotated_relations,
                    )
                )
            results_with_evidence.append(
                EvidencePNGenerationResult(
                    file_name=node.file_name,
                    annotated_chunks=annotated_chunks,
                )
            )
        return results_with_evidence

    def find_evidence(
        self, pn_generation_results: List[PNGenerationResult]
    ) -> List[EvidencePNGenerationResult]:
        """
        Find evidence for the relations in the provided PN generation results.

        Args:
            pn_generation_results: List of PNGenerationResult objects.

        Returns:
            List of EvidencePNGenerationResult objects with evidence annotations.
        """
        try:
            prompts = self._prepare_prompts(pn_generation_results)
            logger.info(f"Prepared {len(prompts)} prompts for evidence finding")

            responses = self._run_inference(prompts)
            logger.info(f"Received {len(responses)} responses from LLM")

            evidence_results = self._match_responses_to_relations(
                pn_generation_results, responses
            )
            logger.info("Matched responses to relations successfully")

            return evidence_results
        except Exception as e:
            logger.error(
                f"Error during evidence finding for task {self.task_id}: {str(e)}"
            )
            raise ProcessingException(f"Error during evidence finding: {str(e)}") from e
