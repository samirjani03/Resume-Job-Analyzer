from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
from datetime import datetime

# --- Job Schemas ---
class JobDescriptionCreate(BaseModel):
    title: Optional[str] = "Backend Engineer"
    company: Optional[str] = None
    raw_text: str

class JobDescriptionResponse(BaseModel):
    id: int
    title: str
    company: Optional[str] = None
    raw_text: str
    parsed_profile: Optional[Dict[str, Any]] = None
    created_at: datetime

    class Config:
        from_attributes = True

# --- Candidate Schemas ---
class CandidateResponse(BaseModel):
    id: int
    candidate_name: Optional[str] = "Candidate"
    file_name: str
    file_type: str
    pii_redacted: bool
    parsed_profile: Optional[Dict[str, Any]] = None
    created_at: datetime

    class Config:
        from_attributes = True

# --- Evidence & Score Schemas ---
class EvidenceItem(BaseModel):
    category: str
    score: int  # 0 to 100
    confidence: str  # "High", "Medium", "Low"
    rationale: str
    resume_quotes: List[str] = []
    jd_requirements: List[str] = []

class SkillGapItem(BaseModel):
    skill: str
    status: str  # "Matched", "Partial", "Missing"
    similarity_percentage: Optional[int] = None
    found_evidence: Optional[str] = None
    recommendation: str

class RedFlagItem(BaseModel):
    flag_type: str  # "Career Gap", "Unquantified Claim", "Buzzword Stuffing", "Job Hopping"
    description: str
    evidence: str
    severity: str  # "Low", "Medium", "High"

class StudentRoadmapItem(BaseModel):
    priority: int  # 1 (Highest) to N
    category: str  # "Missing Skill", "High-Impact Project", "Bullet Rewrite", "Quantification", "Keyword", "Evidence Gap"
    title: str
    action_description: str
    suggested_rewrite: Optional[str] = None
    rationale: str
    estimated_impact: str  # e.g., "+8% Match Score"

# --- Analysis Schemas ---
class AnalysisRequest(BaseModel):
    mode: str = Field(default="recruiter", description="'recruiter' or 'student'")
    job_id: Optional[int] = None
    candidate_ids: List[int]
    redact_pii: bool = False
    target_role: Optional[str] = Field(default=None, description="Optional target role for Student Mode e.g. 'Data Scientist'")
    target_jd_text: Optional[str] = Field(default=None, description="Optional target Job Description text for Student Mode")

class CandidateRanking(BaseModel):
    candidate_id: int
    candidate_name: str
    file_name: str
    overall_match_score: int
    recommendation: str  # "Shortlist", "Consider", "Not Recommended"
    key_strengths: List[str]
    key_gaps: List[str]

class SideBySideComparison(BaseModel):
    candidate_a: str
    candidate_b: str
    dimension_comparison: Dict[str, Any]
    verdict_summary: str

class AnalysisResponse(BaseModel):
    id: int
    mode: str
    job_id: Optional[int] = None
    candidate_rankings: List[CandidateRanking]
    multi_rubric: Dict[str, Dict[str, int]]  # Candidate ID -> Rubric Dimension -> Score
    evidence_breakdown: Dict[str, List[EvidenceItem]]
    skill_gap_matrix: Dict[str, List[SkillGapItem]]
    red_flags: Dict[str, List[RedFlagItem]]
    side_by_side: Optional[SideBySideComparison] = None
    student_roadmap: Optional[Dict[str, List[StudentRoadmapItem]]] = None  # Candidate ID -> Roadmap
    student_mentorship_data: Optional[Dict[str, Any]] = None  # Rich pro mentorship suite
    created_at: datetime

    class Config:
        from_attributes = True
