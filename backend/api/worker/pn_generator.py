import gc
import uuid
from typing import List, Optional

import torch
from api.core.logging import logger
from api.core.settings import WatsonSettings
from api.exceptions.watson_exceptions import ProcessingException
from api.models.internal import ChunkingResult, PNChunk, PNGenerationResult, PNRelation


class PNGenerator:
    def __init__(self, task_id: str):
        from transformers import AutoTokenizer
        from vllm import LLM, SamplingParams

        self.task_id = task_id
        self.llm_model = WatsonSettings.llm_model
        self.sampling_params = SamplingParams(
            temperature=WatsonSettings.temperature,
            max_tokens=WatsonSettings.max_tokens,
        )
        logger.info(f"Initializing {self.llm_model} LLM")
        self.llm = LLM(
            model=self.llm_model,
            tensor_parallel_size=WatsonSettings.tensor_parallel_size,
            gpu_memory_utilization=WatsonSettings.gpu_memory_utilization,
            max_model_len=WatsonSettings.max_model_len,
            enforce_eager=True,
        )
        self.tokenizer = AutoTokenizer.from_pretrained(self.llm_model)

    def __del__(self):
        if hasattr(self, "llm"):
            self.llm.llm_engine.engine_core.shutdown()
            del self.llm
        gc.collect()
        torch.cuda.empty_cache()
        torch.cuda.synchronize()

    def _prepare_prompts(self, nodes: list[ChunkingResult]) -> list[str]:
        """
        Prepare prompts for the LLM by formatting the input chunks.

        Args:
            nodes: List of ChunkingResult objects containing the input text
            tokenizer: AutoTokenizer instance for text tokenization

        Returns:
            List of formatted prompts for the LLM
        """
        prompts = []
        for node in nodes:
            for chunk in node.chunks:
                messages = [
                    {
                        "role": "user",
                        "content": f"Your task is to analyze the provided biomedical/biochemical text and extract all relations relevant for Petri net modeling. Each relation includes a biomedical or biochemical reaction, transformation, or interaction and should be represented by a short phrase that captures the interaction. Do not speculate, extract only those relations that clearly appear in the text.\n{chunk.text}",
                    }
                ]
                prompt = self.tokenizer.apply_chat_template(
                    messages, tokenize=False, add_generation_prompt=True
                )
                prompts.append(prompt)

        return prompts

    def _run_llm(self, prompts) -> list[str]:
        outputs = self.llm.generate(prompts, self.sampling_params)
        relations = [output.outputs[0].text for output in outputs]

        return relations

    @staticmethod
    def _parse_relation_text(relation_text: str) -> Optional[PNRelation]:
        """
        Parse a single relation text block into a Relation object.

        Args:
            relation_text: A text block containing relation information

        Returns:
            Relation object if parsing succeeds, None if parsing fails
        """
        relation_lines = relation_text.split("\n")

        # Check if we have the minimum required number of lines
        if len(relation_lines) < 4:
            return None

        try:
            # Extract values after the colon for each line
            parsed_values = []
            for line in relation_lines:
                if ":" not in line:
                    return None
                value = line.split(":", 1)[1].strip()
                parsed_values.append(value)

            # Parse the relation name (first line, no colon splitting needed)
            relation_name = relation_lines[0]

            # Parse substrates from the second line
            substrates_raw = parsed_values[1]
            substrates = [
                substrate.strip()
                for substrate in substrates_raw.split(";")
                if substrate.strip()
            ]

            # Parse modifiers from the third line (including "-" as valid)
            modifiers_raw = parsed_values[2]
            if modifiers_raw.lower() == "none":
                modifiers = []
            else:
                modifiers = [
                    modifier.strip()
                    for modifier in modifiers_raw.split(";")
                    if modifier.strip() or modifier.strip() == "-"
                ]

            # Parse products from the fourth line
            products_raw = parsed_values[3]
            products = [
                product.strip()
                for product in products_raw.split(";")
                if product.strip()
            ]

            return PNRelation(
                id=str(uuid.uuid4()),
                relation=relation_name,
                substrates=substrates,
                modifiers=modifiers,
                products=products,
            )

        except (IndexError, ValueError) as e:
            logger.warning(
                f"Failed to parse relation text {relation_text} with error: {str(e)}"
            )
            return None

    def _process_response_data(
        self, response_text: str
    ) -> tuple[List[PNRelation], int]:
        """
        Process a response text containing multiple relations.

        Args:
            response_text: Raw response text containing relation data

        Returns:
            Tuple of (list of parsed relations, number of parsing errors)
        """
        # reasoning model case
        if "\n\n**\nFinal Answer:\n" in response_text:
            response_text = response_text.split("\n\n**\nFinal Answer:\n")[1]

        if "<think>" in response_text and "</think>" in response_text:
            response_text = response_text.split("</think>")[1]
            response_text = response_text.replace("<answer>", "").replace(
                "</answer>", ""
            )

        # Skip responses that explicitly state no relations
        if response_text == "There are no relations in this text.":
            return [], 0

        # Clean the response text and split into individual relation blocks
        cleaned_response = response_text.strip()
        relation_blocks = cleaned_response.split("\n\n")

        parsed_relations = []
        parsing_errors = 0

        for relation_block in relation_blocks:
            parsed_relation = self._parse_relation_text(relation_block)

            if parsed_relation is not None:
                parsed_relations.append(parsed_relation)
            else:
                parsing_errors += 1

        return parsed_relations, parsing_errors

    def _format_relations(
        self, relations: List[str], nodes: list[ChunkingResult]
    ) -> List[PNGenerationResult]:
        """
        Format the extracted relations for output.

        Args:
            relations: List of raw relation strings from the LLM
            nodes: List of chunking results

        Returns:
            List of PNGenerationResult objects containing formatted relations
        """
        total_errors = 0
        all_parsed_relations = []

        for scope in relations:
            relations_for_item, errors_for_item = self._process_response_data(scope)

            all_parsed_relations.append(relations_for_item)
            total_errors += errors_for_item

        logger.info(
            f"Generated {sum([len(relations) for relations in all_parsed_relations])} Petri net relations with {total_errors} parsing errors."
        )

        index = 0
        png_results = []
        for node in nodes:
            annotated_chunks = []
            for chunk in node.chunks:
                relations = (
                    all_parsed_relations[index]
                    if index < len(all_parsed_relations)
                    else []
                )
                annotated_chunks.append(
                    PNChunk(
                        chunk=chunk,
                        relations=relations,
                    )
                )
                index += 1

            png_results.append(
                PNGenerationResult(
                    file_name=node.file_name,
                    annotated_chunks=annotated_chunks,
                )
            )

        return png_results

    def generate_pns(self, nodes: list[ChunkingResult]) -> List[PNGenerationResult]:
        """
        Generate Petri nets from the chunked documents.

        Args:
            nodes: List of chunked documents

        Returns:
            List of generated Petri nets
        """
        try:
            logger.info(f"Starting Petri net generation for task {self.task_id}")
            prompts = self._prepare_prompts(nodes)

            logger.info("Extracting relations")
            relations = self._run_llm(prompts)

            logger.info("Formatting extracted relations")
            png_results = self._format_relations(relations, nodes)

            return png_results
        except Exception as e:
            logger.error(
                f"Error generating Petri nets for task {self.task_id}: {str(e)}"
            )
            raise ProcessingException(
                message=f"Error generating Petri nets for task {self.task_id}",
                original_error=e,
                task_id=self.task_id,
            ) from e
