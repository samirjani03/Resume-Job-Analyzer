import os
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from app.config import settings, BASE_DIR
from app.database import engine, Base
from app.models import db_models  # Ensures models are registered
from app.api import jobs, resumes, analyze, search, history, interviews, settings as settings_api

# Create database tables automatically on startup
Base.metadata.create_all(bind=engine)


def _find_dist() -> Path | None:
    """Built React app, if present: backend/dist (Docker) or frontend/dist (local)."""
    for cand in (Path(BASE_DIR) / "dist", Path(BASE_DIR).parent / "frontend" / "dist"):
        if (cand / "index.html").is_file():
            return cand
    return None


# Option A: FastAPI serves the built React app ONLY when SERVE_FRONTEND=true
# (set exclusively inside the Docker image). `python start.py` never sets it,
# so local behavior stays exactly as before.
DIST_DIR = _find_dist() if os.environ.get("SERVE_FRONTEND", "").strip().lower() in ("1", "true", "yes") else None

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url=f"{settings.API_V1_STR}/docs"
)

# CORS: default allows all (local dev); production locks to ALLOWED_ORIGINS (comma-separated env)
_allowed = [o.strip() for o in settings.ALLOWED_ORIGINS.split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed if _allowed != ["*"] else ["*"],
    allow_credentials=False if _allowed != ["*"] else True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routers
app.include_router(jobs.router, prefix=settings.API_V1_STR)
app.include_router(resumes.router, prefix=settings.API_V1_STR)
app.include_router(analyze.router, prefix=settings.API_V1_STR)
app.include_router(search.router, prefix=settings.API_V1_STR)
app.include_router(history.router, prefix=settings.API_V1_STR)
app.include_router(interviews.router, prefix=settings.API_V1_STR)
app.include_router(settings_api.router, prefix=settings.API_V1_STR)

@app.get("/")
def root():
    if DIST_DIR:
        return FileResponse(DIST_DIR / "index.html")
    return {
        "status": "online",
        "service": settings.PROJECT_NAME,
        "docs_url": f"{settings.API_V1_STR}/docs"
    }

@app.get("/health")
def health_check():
    return {"status": "healthy"}


# Mounted last so every API route above wins; serves /assets/* etc. in Docker.
if DIST_DIR:
    app.mount("/", StaticFiles(directory=str(DIST_DIR), html=True), name="frontend")
