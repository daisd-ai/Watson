ARG CUDA_VERSION=12.4.1

FROM nvidia/cuda:${CUDA_VERSION}-devel-ubuntu22.04

RUN apt-get update && apt-get install -y \
    python3-pip curl

RUN pip install uv

ENV UV_HTTP_TIMEOUT=500
RUN uv pip install \
    "vllm==0.13.0" \
    "flashinfer-python==0.5.3" \
    --system

ENTRYPOINT ["vllm", "serve"]
