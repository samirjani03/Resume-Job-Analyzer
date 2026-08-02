from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import List, Optional
import re
from app.database import get_db
from app.models.db_models import CandidateResume
from app.schemas.schemas import CandidateResponse
from app.services.document_parser import DocumentParser
from app.services.pii_redactor import PIIRedactor
from app.services.llm_analyzer import llm_analyzer
from app.services.vector_store import vector_store

DEGREE_KEYWORDS = ["bachelor", "master", "phd", "b.s", "b.sc", "b.tech", "m.s", "m.sc", "m.tech", "degree", "university", "college", "gpa", "diploma", "education"]

def extract_clean_candidate_name(raw_text: str, parsed_profile: dict, filename: str) -> str:
    """Extracts a human candidate name, strictly excluding academic degrees and university headers."""
    clean_filename = filename.rsplit('.', 1)[0].replace('_', ' ').replace('-', ' ').title()
    clean_filename = re.sub(r'\b(resume|cv|profile|final|updated|doc|pdf)\b', '', clean_filename, flags=re.IGNORECASE).strip()

    # 1. Match explicit "Name: Jordan Smith" on a line
    for line in raw_text.splitlines():
        line_str = line.strip()
        if not line_str:
            continue
        m = re.search(r'(?:name|candidate)\s*:\s*([A-Za-z\s\.\-]{2,35})', line_str, re.IGNORECASE)
        if m:
            val = m.group(1).strip().title()
            if not any(dk in val.lower() for dk in DEGREE_KEYWORDS) and len(val) >= 2:
                return val

    # 2. Check parsed profile candidate_name
    p_name = (parsed_profile.get("candidate_name") or "").strip()
    if p_name and p_name.lower() != "candidate":
        if not any(dk in p_name.lower() for dk in DEGREE_KEYWORDS) and len(p_name) <= 35:
            return p_name.title()

    # 3. Check lines near top for candidate name (excluding degree headers)
    for line in raw_text.splitlines()[:5]:
        line_str = line.strip()
        if not line_str:
            continue
        if any(dk in line_str.lower() for dk in DEGREE_KEYWORDS):
            continue
        if any(w in line_str.lower() for w in ["resume", "curriculum", "email", "@", "phone", "http", "skills", "experience", "role"]):
            continue
        if re.match(r'^[A-Za-z\s\.\-]{3,35}$', line_str):
            return line_str.title()

    return clean_filename if (clean_filename and not any(dk in clean_filename.lower() for dk in DEGREE_KEYWORDS)) else "Candidate"

router = APIRouter(prefix="/resumes", tags=["Resumes"])

@router.post("/upload", response_model=List[CandidateResponse])
async def upload_resumes(
    files: List[UploadFile] = File(...),
    redact_pii: bool = Form(False),
    db: Session = Depends(get_db)
):
    saved_candidates = []
    
    for file in files:
        file_bytes = await file.read()
        try:
            raw_text = DocumentParser.parse_document(file.filename, file_bytes)
        except Exception as e:
            continue  # Skip unparseable files gracefully
        
        if not raw_text.strip():
            continue

        sanitized_text = raw_text
        if redact_pii:
            sanitized_text, _ = PIIRedactor.redact(raw_text)

        parsed_profile = await llm_analyzer.parse_open_schema_profile(sanitized_text, is_job=False)
        candidate_name = extract_clean_candidate_name(sanitized_text, parsed_profile, file.filename)

        candidate_db = CandidateResume(
            candidate_name=candidate_name,
            file_name=file.filename,
            file_type=file.filename.split('.')[-1].upper(),
            raw_text=raw_text,
            sanitized_text=sanitized_text if redact_pii else raw_text,
            pii_redacted=redact_pii,
            parsed_profile=parsed_profile
        )
        db.add(candidate_db)
        db.commit()
        db.refresh(candidate_db)

        # Index in vector store
        vector_store.add_candidate_resume(
            candidate_id=candidate_db.id,
            text=sanitized_text,
            metadata={"candidate_name": candidate_name, "file_name": file.filename}
        )

        saved_candidates.append(candidate_db)

    if not saved_candidates:
        raise HTTPException(status_code=400, detail="No valid resumes could be processed.")

    return saved_candidates

@router.get("/", response_model=List[CandidateResponse])
def list_resumes(db: Session = Depends(get_db)):
    return db.query(CandidateResume).order_by(CandidateResume.created_at.desc()).all()
