import gc
from typing import List

import torch
from api.core.logging import logger
from api.core.settings import WatsonSettings
from api.exceptions.watson_exceptions import ProcessingException
from api.models.internal import EvidencePNGenerationResult


class ChunkSummarizer:
    def __init__(self, task_id: str):
        from transformers import AutoTokenizer
        from vllm import LLM, SamplingParams

        logger.info("Initializing ChunkSummarizer")
        self.task_id = task_id
        self.sampling_params = SamplingParams(
            temperature=0,
            max_tokens=128,
        )
        self.llm = LLM(
            model=WatsonSettings.cs_model,
            tensor_parallel_size=WatsonSettings.tensor_parallel_size,
            gpu_memory_utilization=WatsonSettings.gpu_memory_utilization,
            enforce_eager=True,
        )
        self.tokenizer = AutoTokenizer.from_pretrained(WatsonSettings.cs_model)

    def __del__(self):
        if hasattr(self, "llm"):
            self.llm.llm_engine.engine_core.shutdown()
            del self.llm
        gc.collect()
        torch.cuda.empty_cache()
        torch.cuda.synchronize()

    def _prepare_prompts(self, nodes: List[EvidencePNGenerationResult]) -> list[str]:
        prompts = []
        for node in nodes:
            for chunk in node.annotated_chunks:
                messages = [
                    {
                        "role": "user",
                        "content": f"""
                        Summarize the following biomedical text in one sentence, focusing on the main finding or claim, while preserving scientific accuracy and avoiding unnecessary details.
                        Text: {chunk.chunk.text}
                        """,
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

    def _match_responses_to_chunks(
        self, nodes: List[EvidencePNGenerationResult], responses: list[str]
    ) -> List[EvidencePNGenerationResult]:
        response_idx = 0
        for node in nodes:
            for chunk in node.annotated_chunks:
                chunk.chunk.summary = responses[response_idx]
                response_idx += 1

        return nodes

    def summarize_chunks(
        self, evidences: List[EvidencePNGenerationResult]
    ) -> List[EvidencePNGenerationResult]:
        """
        Summarize the chunks in the provided PN generation results.

        Args:
            pn_generation_results: List of EvidencePNGenerationResult objects.

        Returns:
            List of EvidencePNGenerationResult objects with chunks summarized.
        """
        try:
            prompts = self._prepare_prompts(evidences)
            logger.info(f"Prepared {len(prompts)} prompts for chunks summarization")

            responses = self._run_inference(prompts)
            logger.info(f"Received {len(responses)} responses from LLM")

            evidence_results = self._match_responses_to_chunks(evidences, responses)
            logger.info("Matched responses to chunks successfully")

            return evidence_results
        except Exception as e:
            logger.error(
                f"Error during summarization for task {self.task_id}: {str(e)}"
            )
            raise ProcessingException(f"Error during summarization: {str(e)}") from e
