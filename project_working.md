# 📘 TalentMatch AI: How the Project Works (Beginner Guide)

Welcome! This document is a simple, plain-English explanation of how **TalentMatch AI** is built, why the folder structure is organized this way, what every file does, and how information flows from the moment you click a button on the screen to the AI processing behind the scenes.

---

## 🧭 Table of Contents
1. [Why the Folder Structure is Designed This Way](#1-why-the-folder-structure-is-designed-this-way)
2. [File-by-File Breakdown (What Every File Does)](#2-file-by-file-breakdown-what-every-file-does)
3. [The Complete Project Data Flow (Step-by-Step Journey)](#3-the-complete-project-data-flow-step-by-step-journey)
4. [Core Functions & What They Do](#4-core-functions--what-they-do)
5. [Student Mentor Mode: Dynamic Pro Mentorship Suite & Tabbed UI](#5-student-mentor-mode-dynamic-pro-mentorship-suite--tabbed-ui)

---

## 1. Why the Folder Structure is Designed This Way

In modern production software engineering, we separate **Frontend** (what the user sees) from **Backend** (the logic, database, and AI processing). This pattern is called **Separation of Concerns**.

```
Resume-Job-Analyzer/
├── start.py                   <-- Root single-click launcher
├── start-backend.bat          <-- Windows batch runner
│
├── backend/                   <-- EVERYTHING Python, Database, & AI
│   ├── requirements.txt       <-- List of Python packages needed
│   └── app/
│       ├── main.py            <-- Entry point for backend server
│       ├── config.py          <-- Settings & model configuration
│       ├── database.py        <-- Database connection manager
│       ├── models/            <-- Database tables structure (SQLAlchemy)
│       ├── schemas/           <-- Data validation models (Pydantic)
│       ├── services/          <-- Heavy lifting helpers (PDF parsing, AI, Vectors, PII)
│       └── api/               <-- REST API routes (URLs that handle web requests)
│
└── frontend/                  <-- EVERYTHING User Interface (React 19 + Tailwind CSS)
    ├── package.json           <-- List of JavaScript packages needed
    ├── vite.config.js         <-- Frontend server & API proxy settings
    └── src/
        ├── main.jsx           <-- Entry point for React
        ├── App.jsx            <-- Main application layout & mode manager
        ├── services/api.js    <-- JavaScript fetch helpers that call backend URLs
        └── components/        <-- UI components (Navbar, Dashboards, Modals, Drawers)
```

---

## 5. Student Mentor Mode: Dynamic Pro Mentorship Suite & Tabbed UI

Student Mentor Mode has been upgraded into a **Pro AI Mentorship Suite** with a non-overcrowded **Categorized Tabbed Dashboard**:

### 📊 Clean Tabbed Navigation Layout:
- **Hero Banner**: Displays Candidate Name, Resume Type (`Cybersecurity Student`, `Full Stack Developer`), Confidence Level (`96%`), Overall Capability Score (`85%`), and quick action buttons (`Copy Summary`, `Download MD Report`).
- **Quick Stats Bar**: Interactive card bar giving a instant glance at Strengths, Top 5 Weaknesses, Skills to Learn, Recommended Projects, and ATS Score.
- **5 Categorized Navigation Tabs**:
  1. 📊 **Overview**: Resume Identity (Focus vs Weakness, Personality %, Target Role Predictions: Primary, Possible, Unlikely), Top 5 Things Holding You Back (Humanized 1..5), and Strongest Areas.
  2. 📄 **Resume & Rewrites**: Structured Enhancements (`Current → Problem → Better → Reason`), Buzzword Detector (`AI-powered (4x) → Say...`), and Action-Oriented Bullet Rewrites (`Before → After`).
  3. 🛠 **Skills & ATS Audit**: Skills You Should Learn (with difficulty, learning time, and why), ATS Audit Checklist, and Missing Keywords.
  4. 🚀 **Projects & Certs**: Recommended Next Projects (with difficulty stars, tech stack, resume impact `%`), and Recommended Certifications (differentiating Free vs Paid).
  5. 📚 **90-Day Roadmap**: Interactive 12-Week Execution Timeline (Week 1 to Week 12 master plan).
