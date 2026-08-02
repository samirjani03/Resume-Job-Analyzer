# 📄 TalentMatch AI: Decision-Support Resume Screening & Personal Career Mentor

**TalentMatch AI** is a production-grade, local, privacy-first recruitment screening and candidate evaluation platform built with **FastAPI**, **React 19**, **Tailwind CSS v4**, **SQLite**, and local/cloud **Ollama** LLMs.

It provides dual-mode functionality for both **Recruiters** (batch screening, multi-criteria rubric scoring, red flag alerts, evidence rationale, side-by-side candidate comparison) and **Students/Candidates** (single-resume optimization with an actionable *"What You Should Do Next"* roadmap and estimated score impact indicators).

---

## 🚀 Beginner Step-by-Step Setup Guide (After `git clone`)

If you just cloned this repository, follow these exact step-by-step commands to get everything running in under 3 minutes:

### Prerequisites
Ensure you have installed:
1. **Python 3.11 or 3.12** ([python.org](https://www.python.org/))
2. **Node.js (v18+) & NPM** ([nodejs.org](https://nodejs.org/))
3. **Ollama** ([ollama.com](https://ollama.com/))

---

### Step 1: Start & Pull Ollama Model
Open a terminal window and run:
```bash
# Download default model (or any model like deepseek-r1:8b / llama3.3)
ollama pull qwen2.5
```
*(Note: No separate embedding download is required—vector embeddings are handled automatically via SentenceTransformers).*

---

### Step 2: Setup & Launch Backend Server
Open a terminal in the project root directory (`Resume-Job-Analyzer`):

```powershell
# 1. Create Python Virtual Environment (First time only)
python -m venv backend/venv

# 2. Install Backend Dependencies (First time only)
backend/venv/Scripts/pip install -r backend/requirements.txt

# 3. Launch Backend Server
cd .\backend\
.\venv\Scripts\activate (windows)
uvicorn app.main:app --reload --port 8000
```
*(Backend runs live on **`http://localhost:8000`**)*

---

### Step 3: Setup & Launch Frontend Server
Open a **second** terminal window in the project root directory:

```powershell
# 1. Navigate to frontend folder
cd frontend

# 2. Install Frontend NPM Packages (First time only)
npm install

# 3. Launch Frontend Dev Server
npm run dev
```
*(Frontend runs live on **`http://localhost:5173`**)*

---

### Step 4: Launch the Entire Project with One Command
Open a terminal in the project root directory and run:

```powershell
python start.py
```

This single command starts **everything**:
- 🦙 **Ollama** — launches `ollama serve` on **`http://localhost:11434`** (only if it isn't already running)
- 🚀 **Backend** — FastAPI server on **`http://localhost:8000`**
- 🎨 **Frontend** — React + Vite dev server on **`http://localhost:5173`**

Press `Ctrl+C` to stop all services cleanly.

---

### Step 5: Open App in Browser
Open your browser and navigate to:
- 🌐 **Web Dashboard**: [`http://localhost:5173`](http://localhost:5173)
- 📖 **Interactive REST API Docs**: [`http://localhost:8000/api/v1/docs`](http://localhost:8000/api/v1/docs)
- ❤️ **Backend Health Check**: [`http://localhost:8000/health`](http://localhost:8000/health)

---

## ☁️ How to Switch Ollama Models (Local or Cloud/Remote)

You can use **any model** supported by Ollama (e.g. `qwen2.5`, `llama3.3`, `deepseek-r1:8b`, `ParagonAI/voldemort-codex-cloud-preview:gemma4`).

Open **[backend/app/config.py](file:///c:/Users/janis/Desktop/Resume-Job-Analyzer/backend/app/config.py#L14)** and update line 14:
```python
OLLAMA_MODEL: str = "qwen2.5:latest"  # Change to any Ollama model tag
```

---

## 📚 Complete Command Reference & Explanations

| Command | Category | What It Does |
| :--- | :--- | :--- |
| `python start.py` | Backend | Starts the FastAPI backend server on `http://localhost:8000`. |
| `.\start-backend` | Backend | Alternative Windows script to start the backend server. |
| `cd frontend` → `npm run dev` | Frontend | Starts the React 19 + Vite frontend dev server on `http://localhost:5173`. |
| `cd frontend` → `npm run build` | Frontend | Compiles React frontend into production static files in `frontend/dist/`. |
| `ollama serve` | AI Engine | Launches the local Ollama background server. |
| `ollama pull qwen2.5` | AI Engine | Downloads the Qwen 2.5 8B LLM model locally. |
| `ollama list` | AI Engine | Displays all local LLM models currently downloaded. |
| `ollama run qwen2.5` | AI Engine | Starts an interactive chat with the model inside your terminal. |

---

## 🛡️ Key Features & Architecture

- **Dual-Mode System**: Recruiter screening (batch analysis, rubric radar, evidence quotes, red flags, side-by-side comparison) + Student Mentor Mode ("What You Should Do Next" roadmap with `+X%` score impact indicators).
- **Dynamic Open-Schema Extraction**: Evaluates capabilities without assuming rigid section titles (supports *Open Source*, *Hackathons*, *Research*, *Publications*, *Leadership*, etc.).
- **Evidence-Backed & Confidence Scoring**: Scores backed by exact quotes from resumes and JDs with explicit confidence ratings (`High`/`Medium`/`Low`).
- **Interactive Career Timeline**: Visual progression of candidate career milestones.
- **Privacy-First & Offline**: Supports optional PII scrubbing (emails, phone numbers, names) prior to LLM processing.
- **Reporting**: Export candidate rankings to `.csv` and student mentorship roadmaps to `.md`.