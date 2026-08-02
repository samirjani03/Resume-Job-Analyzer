# TalentMatch AI: Decision-Support Resume Screening & Personal Career Mentor
## Implementation Plan & Complete Specification (Updated Blueprint)

TalentMatch AI is a production-grade, local, privacy-first decision-support platform designed for recruiters and candidates/students. It avoids rigid section hardcoding and generic AI wrapper tropes, delivering explainable, evidence-backed capability scoring and actionable career mentorship.

---

## 1. Core Design Philosophy & Key Adjustments

### 🎯 Key Engineering Directives
1. **Decision-Support System, Not an AI Wrapper**:
   - Primary goal for Recruiters: Provide transparent evidence on whom to interview and why.
   - Primary goal for Students/Candidates: Serve as a **Personal Career Mentor**, providing an actionable roadmap with estimated score impacts.
2. **Dynamic Semantic Profiling (No Hardcoded Resume Sections)**:
   - Real resumes differ significantly (e.g., Open Source, Research, Patents, Publications, Leadership, Hackathons, Custom Headings).
   - The LLM parses both JD and Resume into a **flexible, open-schema semantic profile** with canonical fields plus dynamically discovered sections.
   - Scoring evaluates **demonstrated capabilities and concrete evidence**, never the arbitrary presence of specific section headers.
3. **Evidence-Backed Explainable Scoring**:
   - Every metric includes exact quotes/snippets from the resume and JD explaining point additions/deductions alongside a **Confidence Level** (High/Medium/Low).
4. **Student Mode: Personal Career Mentor & Actionable Roadmap**:
   - Transformed from a plain scorecard to a mentoring experience.
   - Every single-resume analysis culminates in a dedicated **"What You Should Do Next"** section written in simple, clear English.
   - Includes prioritized, high-impact recommendations:
     - Missing skills & recommended learning path
     - High-impact project ideas tailored to fill capability gaps
     - Weak resume bullet rewrites & achievement quantification suggestions
     - Missing JD keywords & evidence gaps for claimed skills
     - **Estimated Impact Score** (e.g., `+8% Match Score`, `+12% ATS Clarity`) and rationale for every recommendation.
5. **Robust Handling of Non-Traditional Resumes**:
   - Incomplete, unconventional, creative, or senior executive resumes are evaluated fairly based on overall evidence without penalty for missing conventional sections.

### ❌ Removed Features
- ❌ **Targeted Interview Question Generator (Module 7)**: Removed as per request to maintain focus on candidate evaluation and career mentoring.
- ❌ **Gimmicky Features**: No generic chatbots, personality/astrology profiling, culture-fit scoring, salary predictions, or AI praise generators.

---

## 2. Updated Feature Matrix

| Module | Feature Name | Mode | Purpose & Description |
| :--- | :--- | :--- | :--- |
| **M1** | Dynamic Document Ingestion | Dual | PDF/DOCX parsing with optional PII Redaction and open-schema semantic extraction. |
| **M2** | Semantic Vector Matching | Recruiter | Hybrid BGE-M3 vector embeddings in ChromaDB evaluating candidate-to-JD capability alignment. |
| **M3** | Capability & Skill Gap Matrix | Dual | Identifies Matched, Partial (with similarity %), and Missing skills with upskilling recommendations. |
| **M4** | Explainable Evidence Scoring | Dual | Multi-criteria rubric with confidence scores, rationale, and exact text evidence. |
| **M5** | Natural Language Recruiter Search | Recruiter | Query candidates in plain English (*"FastAPI developers with Docker and 2+ yrs experience"*). |
| **M6** | Candidate Side-by-Side Comparison | Recruiter | Multi-column side-by-side analysis comparing candidate capabilities, trade-offs, and hiring recommendations. |
| **M7** | AI Red Flag & Anomaly Detection | Recruiter | Flags unexplained gaps, unquantified claims, buzzword stuffing, and job-hopping without bias. |
| **M8** | Interactive Career Timeline | Dual | Visual progression map inferred dynamically from candidate milestone evidence. |
| **M9** | Executive Recruiter Dashboard | Recruiter | Overview statistics, score distribution, candidate leaderboard, and CSV export. |
| **M10**| **Personal Career Mentor ("What You Should Do Next")** | Student | Actionable roadmap with bullet rewrites, high-impact project ideas, keyword additions, and estimated score impacts (+X%). |
| **M11**| Analysis History & Session Store | Dual | Persistent SQLite storage via SQLAlchemy to reload past screening jobs or student resume runs. |

---

## 3. Architecture & Data Flow

```
+-------------------------------------------------------------------+
|                    React 19 + Vite Frontend                       |
|   (Tailwind CSS v4 + Lucide Icons + Recharts + Shadcn UI Components)  |
+----------------------------------+--------------------------------+
                                   | REST APIs (JSON / Form Data)
                                   v
+-------------------------------------------------------------------+
|                      FastAPI Backend (Python 3.12)                 |
|  +---------------------+  +--------------------+  +------------+  |
|  | Document Extractor  |  | PII Masking Engine |  | Open-Schema|  |
|  | PyMuPDF / docx      |  | Presidio/Regex     |  | Parser     |  |
|  +----------+----------+  +---------+----------+  +-----+------+  |
+-------------|-----------------------|-------------------|---------+
              v                       v                   v
+-------------------------------------------------------------------+
|                     AI Subsystem & Vector Store                   |
|  +----------------------+   +----------------------------------+  |
|  | ChromaDB Vector Store|   | Ollama LLM Engine                |  |
|  | BGE-M3 Embeddings    |   | Dynamic Profile & Evidence Prompts|  |
|  +----------------------+   +----------------------------------+  |
+----------------------------------+--------------------------------+
                                   | SQLAlchemy ORM
                                   v
+-------------------------------------------------------------------+
|                     SQLite Database (Local Dev)                    |
|    (Jobs, Resumes, Open-Schema Profiles, Mentorship Plans, History)|
+-------------------------------------------------------------------+
```

---

## 4. Open-Schema JSON Representation Example

Instead of rigid fields, resume and JD semantic profiles use flexible JSON models:

```json
{
  "candidate_profile": {
    "canonical_info": { "name": "Samir Jani", "contact": "[REDACTED]" },
    "capabilities": [
      { "domain": "Backend Systems", "skill": "FastAPI", "proficiency_evidence": "Built REST APIs for 10k daily users", "confidence": "High" },
      { "domain": "Containers", "skill": "Docker", "proficiency_evidence": "Podman & Docker containerization in production", "confidence": "High" }
    ],
    "dynamic_sections": [
      { "heading": "Open Source Contributions", "content": "Maintained FastAPI plugin repository with 200+ stars" },
      { "heading": "Hackathons & Awards", "content": "1st place in National AI Hackathon 2024" }
    ]
  }
}
```

---

## 5. Phased Implementation Roadmap

### Phase 1: Dynamic Ingestion & Database Infrastructure
- Python 3.12 FastAPI backend setup with SQLAlchemy models supporting flexible JSON fields for dynamic sections.
- PyMuPDF and `python-docx` parsing pipeline + optional PII redactor.

### Phase 2: Vector Search & Evidence Engine
- ChromaDB setup with BGE-M3 embeddings for semantic capability matching.
- Ollama LLM prompt engineering for open-schema profiling, evidence extraction, confidence rating, and red flag detection.
- Build Student Mode **Career Mentor Engine**: Generates "What You Should Do Next" action items with estimated score impacts (+X%).

### Phase 3: Modern React 19 Frontend
- Recruiter Dashboard: Decision-first layout (Leaderboard, Side-by-Side comparison, Evidence drawers, NL Search bar).
- Student Dashboard: Career Mentor UI with actionable roadmap cards, bullet rewriters, and score impact indicators.

### Phase 4: Persistence, CSV/PDF Export & Verification
- History session management in SQLite.
- Automated API test suite & manual end-to-end evaluation using diverse resume formats (creative, academic, senior, student).

---

## User Review Required

> [!IMPORTANT]
> **Key Updated Design Principles Approved:**
> 1. **Dynamic Section Extraction**: No hardcoded section assumptions; supports Open Source, Research, Hackathons, Leadership, etc.
> 2. **Evidence & Confidence Scoring**: Every score backed by exact resume text + confidence levels.
> 3. **Student Mentor Mode**: Replaced scorecard with "What You Should Do Next" actionable roadmap (+X% impact estimates per suggestion).
> 4. **Module 7 Removed**: Interview Question Generator removed to keep product razor-focused on decision-support and career mentorship.

---

## Verification Plan

### Automated & API Tests
1. **Dynamic Schema Extractor**: Test extraction against resumes with non-standard section headers (e.g. "Community Leadership", "Selected Publications").
2. **Mentorship Engine Output**: Verify that Student Mode returns structured "What You Should Do Next" items with estimated score impacts and bullet rewrite examples.
3. **ChromaDB Capability Match**: Verify semantic distance matching for related skills (e.g., Podman vs. Docker).

### Manual Verification
1. **Recruiter Workflow Test**: Upload 4 resumes + 1 JD -> Verify ranking, side-by-side drawer, evidence popups, and red flags.
2. **Student Mentor Workflow Test**: Upload 1 resume without JD -> Verify career mentorship roadmap, bullet rewrites, and impact estimates.
