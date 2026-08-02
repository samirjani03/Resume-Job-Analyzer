from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Dict, Any, Optional
from app.database import get_db
from app.models.db_models import JobDescription, CandidateResume, AnalysisResult
from app.schemas.schemas import AnalysisRequest, AnalysisResponse
from app.services.llm_analyzer import llm_analyzer

router = APIRouter(prefix="/analyze", tags=["Analysis"])

@router.post("/", response_model=AnalysisResponse)
async def run_analysis(request: AnalysisRequest, db: Session = Depends(get_db)):
    candidates = db.query(CandidateResume).filter(CandidateResume.id.in_(request.candidate_ids)).all()
    if not candidates:
        raise HTTPException(status_code=404, detail="Selected candidates not found.")

    job_text = ""
    job = None

    if request.target_jd_text and request.target_jd_text.strip():
        job_text = request.target_jd_text.strip()
    elif request.target_role and request.target_role.strip():
        job_text = f"Target Role: {request.target_role.strip()}. Requires core domain competencies, relevant project portfolio, and practical experience in {request.target_role.strip()}."
    elif request.job_id:
        job = db.query(JobDescription).filter(JobDescription.id == request.job_id).first()
        if job:
            job_text = job.raw_text

    if request.mode == "recruiter" and not job_text:
        job_text = "Software Engineer position requiring experience with Python, API development, databases, version control, and problem solving."
    elif request.mode == "student" and not job_text:
        job_text = "AUTO_DETECT"  # Instructs LLM to auto-detect domain from candidate resume

    rankings = []
    multi_rubric = {}
    evidence_breakdown = {}
    skill_gap_matrix = {}
    red_flags = {}
    student_roadmaps = {}
    student_mentorship_suites = {}

    for cand in candidates:
        cand_text = cand.sanitized_text if request.redact_pii and cand.sanitized_text else cand.raw_text
        
        eval_res = await llm_analyzer.analyze_candidate_match(
            candidate_text=cand_text,
            job_text=job_text,
            mode=request.mode
        )

        cand_id_str = str(cand.id)
        
        rankings.append({
            "candidate_id": cand.id,
            "candidate_name": cand.candidate_name,
            "file_name": cand.file_name,
            "overall_match_score": eval_res.get("overall_match_score", 75),
            "recommendation": eval_res.get("recommendation", "Consider"),
            "key_strengths": eval_res.get("key_strengths", []),
            "key_gaps": eval_res.get("key_gaps", [])
        })

        multi_rubric[cand_id_str] = eval_res.get("rubric", {})
        evidence_breakdown[cand_id_str] = eval_res.get("evidence_breakdown", [])
        skill_gap_matrix[cand_id_str] = eval_res.get("skill_gaps", [])
        red_flags[cand_id_str] = eval_res.get("red_flags", [])
        
        if request.mode == "student":
            student_roadmaps[cand_id_str] = eval_res.get("student_roadmap", [])
            student_mentorship_suites[cand_id_str] = eval_res.get("student_mentorship_suite", {})

    rankings.sort(key=lambda x: x["overall_match_score"], reverse=True)

    side_by_side_res = None
    if request.mode == "recruiter" and len(candidates) >= 2:
        c1, c2 = rankings[0], rankings[1]
        side_by_side_res = {
            "candidate_a": c1["candidate_name"],
            "candidate_b": c2["candidate_name"],
            "dimension_comparison": {
                "Overall Score": {c1["candidate_name"]: f"{c1['overall_match_score']}%", c2["candidate_name"]: f"{c2['overall_match_score']}%"},
                "Recommendation": {c1["candidate_name"]: c1["recommendation"], c2["candidate_name"]: c2["recommendation"]},
                "Top Strengths": {c1["candidate_name"]: ", ".join(c1["key_strengths"][:2]), c2["candidate_name"]: ", ".join(c2["key_strengths"][:2])}
            },
            "verdict_summary": f"Rank #1 {c1['candidate_name']} ({c1['overall_match_score']}%) is recommended over {c2['candidate_name']} ({c2['overall_match_score']}%) due to higher capability alignment and evidence depth."
        }

    analysis_db = AnalysisResult(
        mode=request.mode,
        job_id=request.job_id if request.job_id else None,
        candidate_ids=request.candidate_ids,
        candidate_rankings=rankings,
        multi_rubric=multi_rubric,
        evidence_breakdown=evidence_breakdown,
        skill_gap_matrix=skill_gap_matrix,
        red_flags=red_flags,
        side_by_side=side_by_side_res,
        student_roadmap=student_roadmaps if request.mode == "student" else None,
        student_mentorship_data=student_mentorship_suites if request.mode == "student" else None
    )
    db.add(analysis_db)
    db.commit()
    db.refresh(analysis_db)

    return analysis_db

@router.get("/{analysis_id}", response_model=AnalysisResponse)
def get_analysis(analysis_id: int, db: Session = Depends(get_db)):
    result = db.query(AnalysisResult).filter(AnalysisResult.id == analysis_id).first()
    if not result:
        raise HTTPException(status_code=404, detail="Analysis result not found.")
    return result
