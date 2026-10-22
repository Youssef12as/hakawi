FROM python:3.12-slim-bookworm

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    NVIDIA_VISIBLE_DEVICES=all \
    NVIDIA_DRIVER_CAPABILITIES=compute,utility \
    HF_HUB_OFFLINE=1 \
    TRANSFORMERS_OFFLINE=1 \
    TOKENIZERS_PARALLELISM=false

RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg libsndfile1 gcc \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY requirements.txt ./
RUN python -m pip install --no-cache-dir -r requirements.txt && python -m pip check

# prepare_assets.py must be run before building. Both tokenizers are included.
COPY models/ ./models/
COPY pre_existing_voices/ ./pre_existing_voices/
COPY server.py audio_utils.py preflight.py ./

EXPOSE 8000
CMD ["python", "server.py"]
