import json
import sqlite3
import os
from typing import List, Dict, Any
from app.config import settings

class LightweightVectorStore:
    """
    Robust, Windows-compatible vector store backed by SQLite.
    Avoids native C++ gRPC DLL blocks while delivering fast cosine vector similarity.
    """
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(LightweightVectorStore, cls).__new__(cls)
            cls._instance._init_db()
        return cls._instance

    def _init_db(self):
        os.makedirs(settings.CHROMA_PERSIST_DIR, exist_ok=True)
        self.db_path = os.path.join(settings.CHROMA_PERSIST_DIR, "vectors.db")
        self._model = None

        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS vector_documents (
                    id TEXT PRIMARY KEY,
                    collection TEXT NOT NULL,
                    text_content TEXT NOT NULL,
                    embedding_json TEXT NOT NULL,
                    metadata_json TEXT NOT NULL
                )
            """)
            conn.commit()

    @property
    def model(self):
        """Lazy load embedding model on demand."""
        if self._model is None:
            try:
                from sentence_transformers import SentenceTransformer
                self._model = SentenceTransformer("all-MiniLM-L6-v2")
            except Exception:
                self._model = False
        return self._model if self._model is not False else None

    def _get_embedding(self, text: str) -> List[float]:
        m = self.model
        if m:
            return m.encode(text).tolist()
        
        # Fast fallback 384-dim normalized vector representation
        words = text.lower().split()
        vec = [0.0] * 384
        for word in words:
            hash_val = hash(word) % 384
            vec[hash_val] += 1.0
        norm = (sum(v * v for v in vec)) ** 0.5 or 1.0
        return [v / norm for v in vec]

    def add_job_description(self, job_id: int, text: str, metadata: Dict[str, Any]):
        embedding = self._get_embedding(text)
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute(
                "INSERT OR REPLACE INTO vector_documents (id, collection, text_content, embedding_json, metadata_json) VALUES (?, ?, ?, ?, ?)",
                (f"job_{job_id}", "jobs", text, json.dumps(embedding), json.dumps(metadata))
            )
            conn.commit()

    def add_candidate_resume(self, candidate_id: int, text: str, metadata: Dict[str, Any]):
        embedding = self._get_embedding(text)
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute(
                "INSERT OR REPLACE INTO vector_documents (id, collection, text_content, embedding_json, metadata_json) VALUES (?, ?, ?, ?, ?)",
                (f"cand_{candidate_id}", "resumes", text, json.dumps(embedding), json.dumps(metadata))
            )
            conn.commit()

    def compute_similarity(self, text_a: str, text_b: str) -> float:
        """Returns cosine similarity percentage (0.0% to 100.0%)."""
        emb_a = self._get_embedding(text_a)
        emb_b = self._get_embedding(text_b)
        
        dot = sum(a * b for a, b in zip(emb_a, emb_b))
        norm_a = (sum(a * a for a in emb_a)) ** 0.5
        norm_b = (sum(b * b for b in emb_b)) ** 0.5
        
        if norm_a == 0 or norm_b == 0:
            return 0.0
        
        cosine_sim = dot / (norm_a * norm_b)
        return round(max(0.0, min(1.0, (cosine_sim + 1) / 2)) * 100, 1)

vector_store = LightweightVectorStore()
