from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List, Dict, Any
from app.database import get_db
from app.models.db_models import AnalysisResult, JobDescription

router = APIRouter(prefix="/history", tags=["History"])

@router.get("/")
def get_analysis_history(db: Session = Depends(get_db)):
    analyses = db.query(AnalysisResult).order_by(AnalysisResult.created_at.desc()).limit(20).all()
    history = []
    
    for item in analyses:
        job_title = "Single Resume Analysis (Student Mode)"
        if item.job_id:
            job = db.query(JobDescription).filter(JobDescription.id == item.job_id).first()
            if job:
                job_title = job.title

        candidate_count = len(item.candidate_ids) if item.candidate_ids else 0
        top_score = 0
        if item.candidate_rankings and len(item.candidate_rankings) > 0:
            top_score = item.candidate_rankings[0].get("overall_match_score", 0)

        history.append({
            "id": item.id,
            "mode": item.mode,
            "job_title": job_title,
            "candidate_count": candidate_count,
            "top_match_score": top_score,
            "created_at": item.created_at
        })

    return history
