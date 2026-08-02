from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Dict, Any
from app.database import get_db
from app.models.db_models import CandidateResume
from app.services.vector_store import vector_store

router = APIRouter(prefix="/search", tags=["Search"])

@router.get("/")
def search_candidates(
    q: str = Query(..., description="Natural language search query e.g. 'FastAPI developers with Docker'"),
    db: Session = Depends(get_db)
):
    """Semantic vector search across candidate resumes."""
    candidates = db.query(CandidateResume).all()
    if not candidates:
        return {"query": q, "results": []}

    results = []
    for cand in candidates:
        sim = vector_store.compute_similarity(q, cand.sanitized_text or cand.raw_text)
        if sim >= 25.0:  # Threshold for search relevance
            results.append({
                "candidate_id": cand.id,
                "candidate_name": cand.candidate_name,
                "file_name": cand.file_name,
                "relevance_score": sim,
                "summary": f"Matched capabilities for query '{q}' with {sim}% semantic relevance.",
                "capabilities": cand.parsed_profile.get("capabilities", []) if cand.parsed_profile else []
            })

    results.sort(key=lambda x: x["relevance_score"], reverse=True)
    return {"query": q, "total_matches": len(results), "results": results}
