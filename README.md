# 📄 TalentMatch AI: Decision-Support Resume Screening & Personal Career Mentor

**TalentMatch AI** is a production-grade, local, privacy-first recruitment screening and candidate evaluation platform built with **FastAPI**, **React 19**, **Tailwind CSS v4**, **SQLite**, and local/cloud **Ollama** LLMs.

It provides dual-mode functionality for both **Recruiters** (batch screening, multi-criteria rubric scoring, red flag alerts, evidence rationale, side-by-side candidate comparison) and **Students/Candidates** (single-resume optimization with an actionable *"What You Should Do Next"* roadmap and estimated score impact indicators).

---

## 🌐 Hosted Quick Start (No Installation Needed)

Anyone can use **TalentMatch AI in the browser** — no clone, no Python, no Ollama install.

1. Open the hosted app URL (Vercel).
2. Click **⚙ AI Provider** in the top bar.
3. Choose a provider and paste your own API key:
   - **Google Gemini** — free key at [aistudio.google.com/apikey](https://aistudio.google.com/apikey)
   - **OpenRouter** — free key at [openrouter.ai/keys](https://openrouter.ai/keys) (free models end in `:free`)
   - **Ollama Cloud** — key at [ollama.com/settings/keys](https://ollama.com/settings/keys)
   - **Ollama Local / Custom URL** — only when you run the app on the same machine as Ollama
4. Click **Test**, then **Save & Use**. Keys are encrypted at rest (Fernet AES) and only the last 4 characters are ever shown again.

Your AI usage is billed to **your own key** (many models are free). The platform enforces a per-device daily quota (default 20 analyses) in hosted mode.

**Hosting stack (all free tier):** Vercel (frontend) + Render (backend) + Supabase/Neon Postgres (keys & quota). See [Deployment](#-deployment-render--vercel--supabase) below.

---

## 🐳 Run with Docker (one container, one command)

Runs the **entire app** (API + built React frontend) in a single container — no Python, no Node, no Ollama install needed.

### 🐣 Absolute beginner — do exactly this, in order

1. **Install Docker Desktop** from [docker.com/products/docker-desktop](https://www.docker.com/products/docker-desktop/) (free). Restart your computer if it asks.
2. **Get this project:** `git clone <repo-url>` (or download the ZIP from GitHub and extract it).
3. **Open a terminal inside the project folder** — shortcut: in File Explorer, click the folder's address bar, type `cmd`, press Enter.
4. **Start the app** (first run downloads everything ≈ 3–10 min):
   ```bash
   docker compose up -d --build
   ```
5. Wait until it says `Started`, then open **http://localhost:8000** in your browser.
6. Click **⚙ AI Provider** → choose **Google Gemini** or **OpenRouter** (free key) → **Test** → **Save & Use**.

Done. Repeat runs only need step 4 without `--build` (`docker compose up -d`).

**Word meanings (so the commands stop looking alien):**

| Word | Meaning | Analogy |
|---|---|---|
| **Image** | The baked, ready-to-run package of the whole app | like an `.exe` installer |
| **Container** | A running instance of the image | like that program running in Task Manager |
| **Volume** | A folder Docker manages *outside* the container, plugged into it at `/data` | like a USB stick — unplug/replace the container, files stay |
| **`docker compose up`** | "build if needed, start it" | power button |
| **`docker compose down`** | "stop it" | power off (your files stay) |

> Prefer clicking over typing? **Docker Desktop** (the app you installed) has *Containers* and *Volumes* tabs that show the same things with start/stop/delete buttons.

### 🔁 The first commands you'll ever use

```bash
docker compose up -d --build   # 1st run: build + start in background
docker compose up -d           # later runs: start again (fast, no rebuild)
docker compose down            # stop — data is KEPT
```

### 🧰 CHEAT SHEET — "I want to change something simple"

Do any edit in a plain text editor, save, then run `docker compose up -d` (it re-creates the container with your new settings automatically).

| I want to… | Do this |
|---|---|
| Use a different port (8000 → 8080) | create `.env` in the project root with `PORT=8080` |
| Allow more AI analyses per day | `.env` → `DAILY_QUOTA=50` |
| Pin my own encryption key | `.env` → `ENCRYPTION_KEY=<your Fernet key>` (leave empty to use the auto-generated file) |
| Send interview emails via Resend | `.env` → `RESEND_API_KEY=...`, `RECIPIENT_CANDIDATE=...` |
| See what the app is doing | `docker compose logs -f` (exit with `Ctrl+C`) |
| Restart the app | `docker compose restart` |
| Apply code changes I just pulled | `docker compose up -d --build` |
| **Erase everything and start fresh** | `docker compose down -v` |
| Back up the database to my PC | `docker cp talentmatch:/data/talentmatch.db ./talentmatch-backup.db` |
| Restore a database backup | `docker cp ./talentmatch-backup.db talentmatch:/data/talentmatch.db` then `docker compose restart` |
| See my encryption key | `docker exec talentmatch cat /data/.encryption_key` |
| Peek inside the container | `docker exec talentmatch sh` (type `exit` to leave) |
| Run my own local Ollama with it | `docker compose down` first, then `docker compose run -p 8000:8000 -e REQUIRE_PROVIDER=false -e OLLAMA_BASE_URL=http://host.docker.internal:11434 app` |
| Update after new code is pushed | `git pull` then `docker compose up -d --build` |
| Stop the app but keep it ready | `docker compose down` (later: `docker compose up -d`) |

All settings above live in an optional **`.env`** file in the project root (one `NAME=value` per line). Docker Compose reads it automatically — no other wiring needed. [`.env.example`](.env.example) lists every variable with comments.

### Where Docker stores your data (persistent volume)

You never create the volume yourself — the first `docker compose up` auto-creates the named volume `resume-job-analyzer_talentmatch-data` and plugs it into the container at **`/data`**. It survives container rebuilds and image upgrades; only `docker compose down -v` deletes it.

- List volumes: `docker volume ls`
- Show its real location on your PC: `docker volume inspect resume-job-analyzer_talentmatch-data`

| File in the volume | What it is |
|---|---|
| `/data/talentmatch.db` | SQLite database (resumes, analyses, interviews, history) |
| `/data/.encryption_key` | **Encryption key for saved provider API keys** (auto-generated on first run) |
| `/data/chroma_db/` | Vector store (semantic search) |
| `/data/fastembed_cache/` | Embedding model cache (avoids re-downloading) |

**🔑 Finding the encryption key:** the app generates it automatically — you never have to create it.
- Inside the container: `docker exec talentmatch cat /data/.encryption_key`
- On the host: Docker Desktop → *Volumes* → the volume above → *Browse* (or `docker volume inspect resume-job-analyzer_talentmatch-data` for the path)

⚠️ Back this key up if you back up `talentmatch.db` — without it, saved provider keys cannot be decrypted. (If you set the `ENCRYPTION_KEY` env var in `.env`, that value is used instead of the file.) In non-Docker local runs the same key lives at `backend/.encryption_key`.

Your normal **`python start.py`** workflow (Ollama + backend + Vite dev servers) is completely unaffected — Docker settings only exist inside the image.

---

## 🚀 Beginner Step-by-Step Setup Guide (After `git clone`)

If you just cloned this repository, follow these exact step-by-step commands to get everything running in under 3 minutes:

### Prerequisites
Ensure you have installed:
1. **Python 3.11 or 3.12** ([python.org](https://www.python.org/))
2. **Node.js (v18+) & NPM** ([nodejs.org](https://nodejs.org/))
3. **Ollama** ([ollama.com](https://ollama.com/))

---
*(Note: If you want simplest running approach, go to step 4).*
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

## ☁️ How to Switch AI Providers (Local or Cloud)

TalentMatch AI supports **4 providers** — switch anytime from the **⚙ AI Provider** settings in the UI:

| Provider | Key needed? | Works hosted? | Default model |
| :--- | :--- | :--- | :--- |
| **Google Gemini** | Yes (free) | ✅ | `gemini-2.5-flash` |
| **OpenRouter** | Yes (free) | ✅ | `meta-llama/llama-3.3-70b-instruct:free` |
| **Ollama Cloud** | Yes (free) | ✅ | `gpt-oss:120b` |
| **Ollama Local / Custom URL** | No | ❌ (your machine only) | `ParagonAI/voldemort-codex-cloud-preview:gemma4` |

For **local dev without the UI**, the legacy config still works — open **[backend/app/config.py](file:///c:/Users/janis/Desktop/Resume-Job-Analyzer/backend/app/config.py#L18)** and set:
```python
OLLAMA_MODEL: str = "qwen2.5:latest"  # Change to any Ollama model tag
OLLAMA_BASE_URL: str = "http://localhost:11434"
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

---

## 🎙️ AI Interview (Chat Interview + Dual Report)

A chat-based conversational interview that runs entirely inside the app: a human-sounding AI interviewer asks 3–6 tailored questions (built from the uploaded resume + job description), challenges vague or dodged answers with follow-ups, then scores the session and produces **two reports**:

- **Candidate Feedback** — interview score /100, recommendation badge, metric bars (communication, technical depth, critical thinking, role alignment), and coaching ("what you did well", "where to improve", "next steps").
- **Recruiter Verdict** — Proceed / Hold headline, rationale, resume-consistency check, claim verification (Verified / Unsupported / Contradicted with evidence quotes), strengths, development areas, and flags.
- **Transcript** — the full conversation.

Reports are **never emailed automatically**. A recruiter clicks *Release Reports* and either types emails (sent via [Resend](https://resend.com) REST API when `RESEND_API_KEY` is configured) or downloads polished standalone `.html` drafts when email is not configured.

Interview UX guardrails:
- **End Interview** button (not just the X) → choose *End & get report* (stops early, scores the answers given, min 1) or *Discard* (abandoned, no report) or *Keep going*.
- **Close (X) = pause**: the active session is stored in `sessionStorage` and the interview reopens exactly where you left it, even after a refresh. Starting a new interview auto-archives the previous one (`abandoned`).
- **Anti-paste**: pasting and right-click are blocked in the answer box (type your own answer); copy stays enabled everywhere else.
- **Exports**: report → *Copy summary* / *Markdown* / *JSON*; transcript → *HTML* / *.md*.
- **Answer cap**: 2000 characters. **Quota**: remaining daily AI calls shown in the header, with a friendly block at 0.

Entry points:
- **Recruiter mode**: `AI Interview` in the leaderboard Actions column, or `Launch AI Interview` inside the candidate audit modal.
- **Student mode**: `Mock Interview` button in the mentorship hero banner (`mode=student`, no job required).

```bash
# Optional email delivery (Render free tier blocks SMTP, so Resend's HTTP API is used)
RESEND_API_KEY=re_xxx
EMAIL_FROM="TalentMatch AI <onboarding@resend.dev>"
RECIPIENT_CANDIDATE=candidate@example.com   # optional fallback recipients
RECIPIENT_RECRUITER=recruiter@example.com
```

API: `POST /api/v1/interviews/start`, `POST /api/v1/interviews/{id}/answer`, `POST /api/v1/interviews/{id}/end` (`{"action": "report" | "discard"}`), `GET /api/v1/interviews/{id}`, `POST /api/v1/interviews/{id}/send-reports` (all device-locked and quota-counted; the evaluation counts as part of the daily `DAILY_QUOTA` budget — raise it if interviews are frequent).

---

## 🕸️ Codebase Knowledge Graph (Graphify)

Graphify builds a navigable graph of the source code and documentation in this repository. The committed graph is under `graphify-out/`; open `graphify-out/graph.html` in a browser, read `graphify-out/GRAPH_REPORT.md`, or query `graphify-out/graph.json` with the CLI.

### One-time setup on Windows

Run these commands from the repository root in PowerShell:

```powershell
# Install/upgrade the Graphify CLI in uv's isolated tool environment
uv tool install --upgrade graphifyy

# Add the Graphify skill and repository instructions for VS Code Copilot Chat
graphify vscode install
```

Graphify's CLI is isolated from the application's existing `backend\venv`; do not create another project environment or install Graphify into the backend environment. Reload VS Code after installing the skill if `/graphify` is not available in Copilot Chat.

### Build the full graph with the assistant model

In VS Code Copilot Chat, open this repository and run:

```text
/graphify .
```

This runs Graphify's full workflow: detect files, extract code structure locally, use the assistant model for semantic extraction of docs/images, combine and cluster the graph, and generate the report and HTML. Graphify respects `.gitignore`; ignored planning/prompt files and generated/runtime folders are not included.

`graphify extract .` is the separate headless CLI workflow. It also parses code locally, but semantic extraction of this repository's docs/images requires an API key or an explicitly configured backend. Running it without one reports `no LLM API key found`; it cannot call the model in Copilot Chat. Do not substitute a cloud Ollama model if you want the assistant model to do semantic extraction.

### Build a code-only graph from PowerShell

For a local, deterministic graph of source code without semantic document/image extraction:

```powershell
graphify extract . --code-only
graphify cluster-only . --no-label
```

This produces a useful code graph without an API key. It does not include semantic facts from docs/images. Use `/graphify .` in Copilot Chat for the full graph with the assistant model. After source changes, `graphify update .` refreshes the structural code graph; rerun `/graphify .` when you also need to refresh docs or images. For an intentional full rebuild after deleting or renaming files, use the full `/graphify .` workflow.

### Use and refresh the graph

```powershell
graphify query "How does resume analysis flow through the backend?"
graphify path "upload_resumes()" "LLMAnalyzer"
graphify explain "LLMAnalyzer"
graphify diagnose multigraph
```

For full semantic processing without a provider key, use `/graphify .` in VS Code Copilot Chat so the assistant model handles docs and images. `graphify update .` refreshes the structural code graph without an LLM; rerun `/graphify .` when you also need to refresh semantic content.

### Graphify output files

| File | Purpose |
| :--- | :--- |
| `graphify-out/graph.html` | Interactive graph visualization |
| `graphify-out/GRAPH_REPORT.md` | Human-readable concepts, communities, and suggested questions |
| `graphify-out/graph.json` | Full queryable knowledge graph |
| `graphify-out/manifest.json` | Source manifest used for incremental updates |

---

## 🚢 Deployment (Render + Vercel + Supabase) — Free

### 1. Prepare secrets
Generate one encryption key (used by Render):
```bash
python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
```

### 2. Backend → Render
1. Create a free account at [render.com](https://render.com).
2. **New → Web Service** → connect your GitHub repo.
3. Render detects `render.yaml` (or configure manually):
   - **Runtime:** Python · **Root Directory:** `backend`
   - **Build:** `pip install --no-cache-dir -r requirements.txt`
   - **Start:** `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
4. Add env vars in the Render dashboard:
   - `ENCRYPTION_KEY` = your generated key
   - `REQUIRE_PROVIDER` = `true`
   - `DAILY_QUOTA` = `20`
   - `ALLOWED_ORIGINS` = `https://<yourapp>.vercel.app`
   - `DATABASE_URL` = Supabase Postgres URL *(below)*
5. Note your API URL, e.g. `https://talentmatch-backend.onrender.com`.

### 3. Database → Supabase (free Postgres)
1. Create a free project at [supabase.com](https://supabase.com).
2. In **Project Settings → Database → Connection string**, copy the **URI/PSQL** URL.
3. Paste it into Render as `DATABASE_URL`. The app creates its tables on first start.
   > SQLite files on Render free tier are wiped on restart — use Postgres for hosted persistence.

### 4. Frontend → Vercel
1. Create a free account at [vercel.com](https://vercel.com) → **Import repo**.
2. **Root Directory:** `frontend` · Framework preset: **Vite** (auto-detected).
3. Add env var: `VITE_API_BASE = https://talentmatch-backend.onrender.com/api/v1`.
4. Deploy. Users visit `https://<yourapp>.vercel.app`.

### 5. Keep Render awake (free)
Render free services sleep after 15 min idle → first request cold-starts (~30–60s).
Create a free monitor at [cron-job.org](https://cron-job.org) hitting `https://talentmatch-backend.onrender.com/health` every 10 minutes.

> `render.yaml`, `Dockerfile`, `.env.example` and `frontend/vercel.json` are committed; you can also use the "Render Blueprint" import to skip manual env setup.