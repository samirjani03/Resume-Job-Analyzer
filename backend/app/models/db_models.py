from sqlalchemy import Column, Integer, String, Text, DateTime, JSON, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base

class JobDescription(Base):
    __tablename__ = "job_descriptions"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False, default="Untitled Position")
    company = Column(String(255), nullable=True)
    raw_text = Column(Text, nullable=False)
    parsed_profile = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    analyses = relationship("AnalysisResult", back_populates="job")


class CandidateResume(Base):
    __tablename__ = "candidate_resumes"

    id = Column(Integer, primary_key=True, index=True)
    candidate_name = Column(String(255), nullable=True, default="Unknown Candidate")
    file_name = Column(String(255), nullable=False)
    file_type = Column(String(50), nullable=False)
    raw_text = Column(Text, nullable=False)
    sanitized_text = Column(Text, nullable=True)
    pii_redacted = Column(Boolean, default=False)
    parsed_profile = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class ApiKey(Base):
    """Encrypted per-device AI provider configuration. Key material is never stored plain."""
    __tablename__ = "api_keys"

    id = Column(Integer, primary_key=True, index=True)
    device_id = Column(String(64), nullable=False, index=True)
    provider = Column(String(50), nullable=False)
    enc_key = Column(Text, nullable=True)          # Fernet token; NULL for Ollama local
    base_url = Column(String(512), nullable=True)  # Ollama local/cloud override
    model_default = Column(String(255), nullable=True)
    last4 = Column(String(8), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class UsageLog(Base):
    """One row per successful LLM call — powers the daily quota counter."""
    __tablename__ = "usage_logs"

    id = Column(Integer, primary_key=True, index=True)
    device_id = Column(String(64), nullable=True, index=True)
    provider = Column(String(50), nullable=True)
    model = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)


class AnalysisResult(Base):
    __tablename__ = "analysis_results"

    id = Column(Integer, primary_key=True, index=True)
    mode = Column(String(50), nullable=False, default="recruiter")
    job_id = Column(Integer, ForeignKey("job_descriptions.id"), nullable=True)
    candidate_ids = Column(JSON, nullable=False)
    
    # Combined results payload - matched exact Pydantic schema field names
    candidate_rankings = Column(JSON, nullable=True)
    multi_rubric = Column(JSON, nullable=True)
    evidence_breakdown = Column(JSON, nullable=True)
    skill_gap_matrix = Column(JSON, nullable=True)
    red_flags = Column(JSON, nullable=True)
    side_by_side = Column(JSON, nullable=True)
    student_roadmap = Column(JSON, nullable=True)
    student_mentorship_data = Column(JSON, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)

    job = relationship("JobDescription", back_populates="analyses")
