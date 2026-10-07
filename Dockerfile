# syntax=docker/dockerfile:1
# ============================================================
# TalentMatch AI — single-image build (Way 2)
#   Stage 1: build the React frontend
#   Stage 2: Python runtime serving API + frontend on :8000
# ============================================================

# ---------- Stage 1: frontend ----------
FROM node:20-alpine AS frontend
WORKDIR /build
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
# Same-origin API: FastAPI inside this image serves /api/v1, so no CORS needed.
ENV VITE_API_BASE=/api/v1
RUN npm run build

# ---------- Stage 2: backend + static ----------
FROM python:3.11-slim
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

# Non-root user — best practice (never run containers as root)
RUN useradd --create-home --shell /usr/sbin/nologin app

# Dependencies first (cached layer: only re-runs when requirements change)
COPY backend/requirements.txt ./requirements.txt
RUN pip install -r requirements.txt

# Application code + built frontend
COPY backend/app ./app
COPY --from=frontend /build/dist ./dist

# ---- Container-specific settings (local `python start.py` is unaffected) ----
# REQUIRE_PROVIDER=true -> app asks each user to save a provider key in Settings
#   (Gemini / OpenRouter / Ollama Cloud...). Ollama is NOT bundled in this image;
#   to use your host's Ollama anyway, run with:
#   -e REQUIRE_PROVIDER=false -e OLLAMA_BASE_URL=http://host.docker.internal:11434
# Everything durable lives on /data (mounted as a Docker volume by compose):
#   /data/talentmatch.db        SQLite database
#   /data/.encryption_key       provider-key encryption key (auto-generated)
#   /data/chroma_db             vector store
#   /data/... cache dirs        embedding model cache (HOME=/data)
ENV SERVE_FRONTEND=true \
    REQUIRE_PROVIDER=true \
    ALLOWED_ORIGINS="*" \
    DATABASE_URL=sqlite:////data/talentmatch.db \
    CHROMA_PERSIST_DIR=/data/chroma_db \
    ENCRYPTION_KEY_FILE=/data/.encryption_key \
    FASTEMBED_CACHE_PATH=/data/fastembed_cache \
    HOME=/data

RUN mkdir -p /data && chown -R app:app /data /app
USER app

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD python -c "import urllib.request as u; u.urlopen('http://127.0.0.1:8000/health', timeout=4)"

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
