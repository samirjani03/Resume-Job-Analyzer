from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database import get_db
from app.models.db_models import JobDescription
from app.schemas.schemas import JobDescriptionCreate, JobDescriptionResponse
from app.services.document_parser import DocumentParser
from app.services.llm_analyzer import llm_analyzer
from app.services.vector_store import vector_store

router = APIRouter(prefix="/jobs", tags=["Jobs"])

@router.post("/", response_model=JobDescriptionResponse)
async def create_job(
    title: Optional[str] = Form("Backend Engineer"),
    company: Optional[str] = Form(None),
    raw_text: Optional[str] = Form(None),
    file: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db)
):
    text_content = ""
    if file:
        file_bytes = await file.read()
        text_content = DocumentParser.parse_document(file.filename, file_bytes)
    elif raw_text:
        text_content = raw_text.strip()
    else:
        raise HTTPException(status_code=400, detail="Must provide either text or file for Job Description.")

    if not text_content:
        raise HTTPException(status_code=400, detail="Extracted Job Description text is empty.")

    parsed_profile = await llm_analyzer.parse_open_schema_profile(text_content, is_job=True)

    job_db = JobDescription(
        title=title or parsed_profile.get("canonical_title", "Backend Engineer"),
        company=company,
        raw_text=text_content,
        parsed_profile=parsed_profile
    )
    db.add(job_db)
    db.commit()
    db.refresh(job_db)

    # Store in ChromaDB vector store
    vector_store.add_job_description(
        job_id=job_db.id,
        text=text_content,
        metadata={"title": job_db.title}
    )

    return job_db

@router.get("/", response_model=List[JobDescriptionResponse])
def list_jobs(db: Session = Depends(get_db)):
    return db.query(JobDescription).order_by(JobDescription.created_at.desc()).all()

@router.get("/{job_id}", response_model=JobDescriptionResponse)
def get_job(job_id: int, db: Session = Depends(get_db)):
    job = db.query(JobDescription).filter(JobDescription.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job Description not found.")
    return job
