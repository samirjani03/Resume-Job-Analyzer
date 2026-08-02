# TalentMatch AI: Complete Implementation Walkthrough

TalentMatch AI (Decision-Support Resume Screening & Personal Career Mentor) is fully built, configured, and verified across both backend and frontend.

---

## 1. System Overview & Architecture

```
+-------------------------------------------------------------------+
|                    React 19 + Vite Frontend                       |
|   (Tailwind CSS v4 + Lucide Icons + Recharts + Glassmorphism UI)  |
+----------------------------------+--------------------------------+
                                   | REST APIs (JSON / Form Data)
                                   v
+-------------------------------------------------------------------+
|                      FastAPI Backend (Python 3.11)                 |
|  +---------------------+  +--------------------+  +------------+  |
|  | Document Extractor  |  | PII Masking Engine |  | Open-Schema|  |
|  | PyMuPDF / docx      |  | Presidio/Regex     |  | Parser     |  |
|  +----------+----------+  +---------+----------+  +-----+------+  |
+-------------|-----------------------|-------------------|---------+
              v                       v                   v
+-------------------------------------------------------------------+
|                     AI Subsystem & Vector Store                   |
|  +----------------------+   +----------------------------------+  |
|  | SQLite Vector Store  |   | Ollama LLM Engine                |  |
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

## 2. Key Features Delivered

1. **Dual-Mode System**:
   - **Recruiter Mode**: Upload Job Description + Batch Resumes (PDF/DOCX/TXT) to get candidate leaderboard, multi-criteria rubric radar/bar charts, evidence quotes, red flag alerts, side-by-side comparison modal, and CSV ranking export.
   - **Student Mentor Mode**: Upload a single resume to receive a dedicated **"What You Should Do Next"** actionable roadmap featuring prioritized step-by-step advice, Before -> After bullet rewrites, missing JD keywords, and estimated score impacts (`+12% Match Score`, `+8% ATS`).
2. **Dynamic Open-Schema Profiling (No Hardcoded Sections)**:
   - Parses resumes into flexible capability profiles accommodating non-standard sections (e.g. *Open Source*, *Hackathons*, *Research*, *Publications*, *Leadership*, *Volunteering*, *Patents*).
3. **Evidence-Backed & Confidence Scoring**:
   - Every metric score is fully explainable with exact resume quotes and JD requirements alongside an explicit **Confidence Level** (`High`/`Medium`/`Low`).
4. **Interactive Career Timeline**:
   - Displays dynamic career milestones (Role, Year, Organization, Summary) in candidate inspection popups.
5. **Natural Language Recruiter Search**:
   - Semantic query bar allowing recruiters to search candidate pools in plain English (*"Show candidates with FastAPI and 2+ years experience"*).
6. **Privacy & PII Redaction Pipeline**:
   - Option to automatically scrub candidate emails, phone numbers, links, and names prior to LLM processing.
7. **Windows AppLocker Compatible Vector Store**:
   - Custom `LightweightVectorStore` backed by SQLite and SentenceTransformers, avoiding native C++ gRPC DLL blocks under enterprise Windows policies.

---

## 3. Verification & Build Confirmation

- **React Frontend Production Build**:
  - Command: `npm run build` in `frontend/`
  - **Result**: `✓ built in 292ms` with **0 errors**.
- **FastAPI Backend Server**:
  - Verified endpoints `/health` (`status: healthy`), `/jobs`, `/resumes`, `/analyze`, `/search`, and `/history`.

---

## 4. How to Run TalentMatch AI

### One-Command Launch (Recommended)
From the project root, run:

```powershell
cd c:\Users\janis\Desktop\Resume-Job-Analyzer
python start.py
```

This starts **everything** — Ollama (`ollama serve` on `http://localhost:11434`), the FastAPI backend on `http://localhost:8000`, and the React/Vite frontend on `http://localhost:5173`. Press `Ctrl+C` to stop all services.

### Manual Launch (Alternative)

**Step 1: Start FastAPI Backend**
```powershell
cd c:\Users\janis\Desktop\Resume-Job-Analyzer
backend\venv\Scripts\python -m uvicorn app.main:app --app-dir backend --reload --port 8000
```

**Step 2: Start React Frontend Dev Server**
```powershell
cd c:\Users\janis\Desktop\Resume-Job-Analyzer\frontend
npm run dev
```

Open **`http://localhost:5173`** in your browser to experience **TalentMatch AI**!
