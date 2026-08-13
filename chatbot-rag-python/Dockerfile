# python:3.12-slim (Debian, glibc), not an alpine base - torch/scipy/
# numpy only ship prebuilt wheels for glibc-based Linux. An alpine
# (musl) base would force pip to compile them from source, which is
# slow and sometimes fails outright for torch specifically. No
# multi-stage build here, unlike the Node services' Dockerfiles -
# almost everything installed below (torch, sentence-transformers, ...)
# is a runtime dependency, not a build-only tool, so splitting
# build/runtime stages wouldn't meaningfully shrink the final image.
FROM python:3.12-slim

WORKDIR /app

# libgomp1 - PyTorch's CPU backend links against libgomp (OpenMP) at
# runtime; python:3.12-slim doesn't include it by default, and its
# absence only shows up as an import-time crash the first time
# something actually calls into torch, not at `pip install` time.
RUN apt-get update \
    && apt-get install -y --no-install-recommends libgomp1 \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Bakes the all-MiniLM-L6-v2 embedding model weights into the image at
# build time (see embeddings.py's comment on why the model is loaded
# once at import time, not per-request). Without this, the *first* real
# request after a fresh deploy pays for a HuggingFace Hub download -
# network-dependent and rate-limited, exactly what a staging container
# shouldn't need at boot.
RUN python -c "from sentence_transformers import SentenceTransformer; SentenceTransformer('all-MiniLM-L6-v2')"

COPY chat_router.py chunking.py database.py embeddings.py main.py ./

# Runs as an unprivileged user - no reason this process needs root
# inside the container.
RUN useradd --create-home appuser
USER appuser

EXPOSE 8001

# No --reload here - that's watchfiles' dev-only file-watching (see
# README.md's "Run" section), pointless in a built image whose source
# never changes after the image is built. DATABASE_URL/INTERNAL_API_KEY
# are still hardcoded in main.py/database.py at this point (see
# README.md's "Where this is headed") - this image runs the app as-is,
# it doesn't fix that on its own.
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8001"]
