from pydantic_settings import BaseSettings
import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent

class Settings(BaseSettings):
    PROJECT_NAME: str = "TalentMatch AI"
    API_V1_STR: str = "/api/v1"
    
    # SQLite Database URL
    DATABASE_URL: str = f"sqlite:///{BASE_DIR / 'talentmatch.db'}"
    
    # ChromaDB Vector Store Path
    CHROMA_PERSIST_DIR: str = str(BASE_DIR / "chroma_db")
    
    # Ollama Settings
    OLLAMA_BASE_URL: str = "http://localhost:11434"
    OLLAMA_MODEL: str = "ParagonAI/voldemort-codex-cloud-preview:gemma4"  # Falls back gracefully to llama3.1:8b or qwen3 if available
    EMBEDDING_MODEL: str = "BAAI/bge-m3"  # Fallback to sentence-transformers/all-MiniLM-L6-v2 if BGE-M3 download takes time
    
    # Upload limits
    MAX_UPLOAD_SIZE_MB: int = 15
    ALLOWED_EXTENSIONS: set = {".pdf", ".docx", ".txt"}

    class Config:
        case_sensitive = True

settings = Settings()
