from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from datetime import datetime
from typing import Optional

from app.database import get_db
from app.models.db_models import CandidateResume, InterviewSession, JobDescription
from app.schemas.schemas import (
    InterviewAnswerRequest,
    InterviewEndRequest,
    InterviewMessageOut,
    InterviewSendReportsRequest,
    InterviewSendReportsResponse,
    InterviewSessionOut,
    InterviewStartRequest,
)
from app.core.deps import enforce_quota, get_device_id, provider_context
from app.services.providers.base import ProviderContext
from app.services.interview import interview_service, report_dispatcher

router = APIRouter(prefix="/interviews", tags=["Interviews"])


def _assert_owned(session: InterviewSession, device_id: Optional[str]) -> None:
    if session.device_id and device_id and session.device_id != device_id:
        raise HTTPException(status_code=403, detail="Interview session not found.")


def _payload(db: Session, session: InterviewSession) -> InterviewSessionOut:
    cand = db.query(CandidateResume).filter(CandidateResume.id == session.candidate_id).first()
    job = None
    if session.job_id:
        job = db.query(JobDescription).filter(JobDescription.id == session.job_id).first()
    return InterviewSessionOut(
        session_id=session.id,
        status=session.status,
        mode=session.mode,
        total_questions=session.total_questions,
        candidate_name=(cand.candidate_name if cand else None) or "Candidate",
        job_title=(job.title if job else None),
        messages=[
            InterviewMessageOut(
                id=m.id, role=m.role, content=m.content, question_no=m.question_no
            )
            for m in session.messages
        ],
        report=session.report,
        created_at=session.created_at,
    )


@router.post("/start", response_model=InterviewSessionOut)
async def start_interview(
    request: InterviewStartRequest,
    db: Session = Depends(get_db),
    _quota: None = Depends(enforce_quota),
    device_id: Optional[str] = Depends(get_device_id),
    ctx: ProviderContext = Depends(provider_context),
):
    """Creates an interview session and asks the tailored opening question."""
    candidate = (
        db.query(CandidateResume)
        .filter(CandidateResume.id == request.candidate_id)
        .first()
    )
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found.")

    job = None
    if request.job_id:
        job = db.query(JobDescription).filter(JobDescription.id == request.job_id).first()

    if request.mode not in ("recruiter", "student"):
        raise HTTPException(status_code=422, detail="mode must be 'recruiter' or 'student'.")

    session = await interview_service.start(
        db=db,
        candidate=candidate,
        job=job,
        question_count=request.question_count,
        mode=request.mode,
        ctx=ctx,
        device_id=device_id,
    )
    return _payload(db, session)


@router.post("/{session_id}/answer", response_model=InterviewSessionOut)
async def answer_interview(
    session_id: int,
    request: InterviewAnswerRequest,
    db: Session = Depends(get_db),
    _quota: None = Depends(enforce_quota),
    device_id: Optional[str] = Depends(get_device_id),
    ctx: ProviderContext = Depends(provider_context),
):
    """Submits a candidate answer. Returns either the next AI question, or — after the
    final answer — the full session with the verified report attached."""
    session = (
        db.query(InterviewSession).filter(InterviewSession.id == session_id).first()
    )
    if not session:
        raise HTTPException(status_code=404, detail="Interview session not found.")
    _assert_owned(session, device_id)
    if session.status != "active":
        raise HTTPException(
            status_code=409,
            detail="Interview already completed. Fetch the session to view the report.",
        )

    session, _finished = await interview_service.answer(
        db=db, session=session, answer=request.answer, ctx=ctx
    )
    return _payload(db, session)


@router.post("/{session_id}/end", response_model=InterviewSessionOut)
async def end_interview(
    session_id: int,
    request: InterviewEndRequest,
    http_request: Request,
    db: Session = Depends(get_db),
    device_id: Optional[str] = Depends(get_device_id),
    ctx: ProviderContext = Depends(provider_context),
):
    """End an active interview early.

    action='report' -> stop asking and score the answers already given (>=1).
    action='discard' -> abandon the session with no report (never quota-gated).
    """
    session = (
        db.query(InterviewSession).filter(InterviewSession.id == session_id).first()
    )
    if not session:
        raise HTTPException(status_code=404, detail="Interview session not found.")
    _assert_owned(session, device_id)
    if session.status != "active":
        raise HTTPException(
            status_code=409,
            detail="Interview already ended. Fetch the session to view it.",
        )

    if request.action == "discard":
        session.status = "abandoned"
        session.completed_at = datetime.utcnow()
        db.commit()
        db.refresh(session)
        return _payload(db, session)

    answered = sum(1 for m in session.messages if m.role == "candidate")
    if answered < 1:
        raise HTTPException(
            status_code=409,
            detail="Answer at least one question before ending with a report.",
        )
    # Scoring runs an LLM call, so the report path must respect the daily quota.
    enforce_quota(request=http_request, db=db, device_id=device_id)
    session = await interview_service.end_early(db=db, session=session, ctx=ctx)
    return _payload(db, session)


@router.get("/{session_id}", response_model=InterviewSessionOut)
def get_interview(
    session_id: int,
    db: Session = Depends(get_db),
    device_id: Optional[str] = Depends(get_device_id),
):
    """Full transcript + report for any session (audit trail for the recruiter)."""
    session = (
        db.query(InterviewSession).filter(InterviewSession.id == session_id).first()
    )
    if not session:
        raise HTTPException(status_code=404, detail="Interview session not found.")
    _assert_owned(session, device_id)
    return _payload(db, session)


@router.post("/{session_id}/send-reports", response_model=InterviewSendReportsResponse)
async def send_reports(
    session_id: int,
    request: InterviewSendReportsRequest,
    db: Session = Depends(get_db),
    device_id: Optional[str] = Depends(get_device_id),
):
    """Recruiter-gated release: dispatches candidate + recruiter report emails via
    Resend (when configured) or returns downloadable HTML drafts."""
    session = (
        db.query(InterviewSession).filter(InterviewSession.id == session_id).first()
    )
    if not session:
        raise HTTPException(status_code=404, detail="Interview session not found.")
    _assert_owned(session, device_id)
    if not session.report:
        raise HTTPException(status_code=409, detail="No report available yet.")

    cand = db.query(CandidateResume).filter(CandidateResume.id == session.candidate_id).first()
    result = await report_dispatcher.send(
        report=session.report,
        candidate_name=(cand.candidate_name if cand else None) or "Candidate",
        candidate_email=request.candidate_email,
        recruiter_email=request.recruiter_email,
    )
    return InterviewSendReportsResponse(**result)
