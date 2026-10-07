"""
AI Interview Engine.

Turns a shortlisted candidate into a live conversational interview:
  1. One tailored opening question grounded in the resume + target role,
  2. Progressive follow-up questions that react to the candidate's answers,
  3. A verified evaluation producing a dual report (candidate coaching feedback
     + recruiter proceed/hold verdict) with claim-vs-resume consistency checks.

Every LLM call goes through llm_analyzer._call_llm so provider resolution,
encrypted key handling, quota logging and usage accounting stay identical to
the rest of the platform. Nothing else in the codebase is modified.
"""

from __future__ import annotations

import html
import json
import re
from dataclasses import replace
from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple

import httpx

from app.config import settings
from app.models.db_models import CandidateResume, InterviewMessage, InterviewSession, JobDescription
from app.services.llm_analyzer import llm_analyzer
from app.services.providers.base import ProviderContext


# --------------------------------------------------------------------------- #
# Prompt building blocks
# --------------------------------------------------------------------------- #

HUMAN_VOICE = """
VOICE & PRESENCE (this is what separates this interview from a chatbot — obey every line):
- You are a real, senior technical interviewer: 10+ years hiring engineers, warm but sharp,
  genuinely curious. You talk like a person, not a form.
- Natural spoken English, contractions, short sentences. Sound like you are in a room with them.
- Reference them by name occasionally (max once per message). Reference concrete things you
  can actually see in their resume or in their previous answer — never invent history.
- One thought per message. One question. Never stack two questions. Never say "Question 1 of 4".
- NEVER use markdown, asterisks, bullet lists, headers, numbering, or emojis.
- NEVER say "As an AI", "Welcome to this interview", "Thank you for your response" filler,
  "That's a great question", or any corporate-template phrasing.
- A short, natural acknowledgment of what they just said is good — but only if it adds
  something specific. Acknowledgment max one sentence, then move on.
- No meta-commentary about scoring, evaluation, or the system. You are simply interviewing.
""".strip()

OPENING_SYSTEM = HUMAN_VOICE + """

Your job right now: open the interview like a human would. Brief warm hello (one sentence),
then your FIRST and only question for this turn. The question must be specific to this
candidate's resume and the target role — pick the single most revealing thing to probe first
(a claimed skill, a project with real scope, a gap between the JD and their background).
Grounded, answerable in 2-4 sentences, and impossible to answer with a single word."""

OPENING_PROMPT = """Candidate name: {name}

Candidate resume:
{resume}

Target role / job description:
{job}

Write your opening message now (greeting + exactly one specific, tailored question).
Return STRICT JSON only: {{"message": "your full spoken message including the one question"}}"""

FOLLOWUP_SYSTEM = HUMAN_VOICE + """

You are mid-interview. You will see the transcript so far. Your job on this turn:
1) Read their LAST answer carefully — react to its substance in at most one sentence
   (probe a detail, challenge an assumption lightly, or connect it to their background).
2) Ask exactly ONE new question that goes deeper than before. Good follow-ups challenge
   specifics: "you said X — what broke first when you scaled that?", "what would you do
   differently now?", "walk me through the hardest bug in that project".
Never repeat a question already asked. Never ask what they already put on their resume
without pushing for depth, trade-offs, or personal contribution.
If their last answer was vague or dodged the question, say so plainly and press once."""

FOLLOWUP_PROMPT = """Target role / job description:
{job}

Transcript so far:
{transcript}

Question {current} of {total}. Write your next message now (short reaction + exactly one deeper question).
Return STRICT JSON only: {{"message": "your full spoken message including the one question"}}"""

EVAL_SYSTEM = """You are an elite technical interviewer producing a fair, evidence-based interview report.

NON-NEGOTIABLE RULES:
- Judge ONLY what the candidate actually said in this transcript, never what their resume claims
  they could have said.
- Every score must be justified by a SHORT VERBATIM QUOTE from their answer (evidence).
- Cross-check each significant claim in their answers against the resume: flag anything they
  assert in the interview that the resume does not support, and anything the resume claims
  that the interview did not confirm.
- Be honest, not flattering. Inflating scores destroys the product. A weak answer is weak.
- Score bands: 85-100 exceptional / hire immediately, 70-84 strong, 55-69 mixed with real
  gaps, 40-54 weak, below 40 inadequate.
- recommendation must match the interview_score: >=80 "Strong Proceed", 70-79 "Proceed",
  55-69 "Hold", <55 "Do Not Proceed".
- Write like a human professional: direct, specific, no buzzwords, no corporate padding.
  Candidate-facing text must be kind but truthful and genuinely useful for improvement.
  Recruiter-facing text must be crisp decision-support a hiring manager can act on in 10 seconds.
- Return STRICT JSON only, no markdown, no commentary outside the JSON."""

EVAL_PROMPT = """Candidate: {name}

Candidate resume:
{resume}

Target role / job description:
{job}

Interview transcript:
{transcript}

Produce the final interview report as STRICT JSON with this exact schema:
{{
  "recommendation": "Strong Proceed" | "Proceed" | "Hold" | "Do Not Proceed",
  "interview_score": 0-100,
  "communication_score": 0-100,
  "technical_depth_score": 0-100,
  "critical_thinking_score": 0-100,
  "role_alignment_score": 0-100,
  "resume_consistency": "Verified" | "Partially Verified" | "Inconsistent",
  "claim_checks": [
    {{"claim": "what they stated in the interview", "verdict": "Verified" | "Unsupported" | "Contradicted", "evidence": "short quote from their answer or resume line"}}
  ],
  "strengths": [
    {{"point": "specific strength", "evidence": "short verbatim quote from their answer"}}
  ],
  "improvements": [
    {{"point": "specific weakness or gap", "coaching": "one concrete, actionable sentence telling them exactly how to fix it"}}
  ],
  "candidate_feedback": {{
    "summary": "2-3 sentences, warm and honest, written person-to-person about how this interview went",
    "what_you_did_well": ["3-5 short specific bullets"],
    "where_to_improve": ["3-5 short specific bullets with concrete fixes"],
    "next_steps": ["2-4 actions to take before a real interview for this role"]
  }},
  "recruiter_verdict": {{
    "headline": "one-line verdict a hiring manager reads first",
    "proceed": true | false,
    "rationale": "1-2 sentences of decision-support grounded in the transcript",
    "flags": ["any concerns: inconsistency, vagueness, unverifiable claims"]
  }}
}}"""


# --------------------------------------------------------------------------- #
# Offline / LLM-failure fallbacks — interview never dead-ends
# --------------------------------------------------------------------------- #

FALLBACK_QUESTIONS = [
    "Hi {name}, thanks for making the time. Let's start with something concrete — "
    "walk me through the project you're most proud of on your resume, and what part of it "
    "you personally owned end to end.",

    "You mentioned {first_skill} earlier. Push on that for me: what was the hardest "
    "technical problem you hit while using it, and how did you actually solve it?",

    "Here's a scenario. You're two days from a deadline and a critical bug shows up in "
    "production that you can't reproduce locally. Walk me through your first hour, step by step.",

    "Tell me about a time you disagreed with a technical decision a teammate or manager made. "
    "What did you do, and what happened in the end?",

    "Looking at this role, where do you think your weakest area is compared to what they're "
    "asking for — and what are you actively doing about it?",

    "Last one. If I gave you access to our codebase on day one, what's the first thing you'd "
    "read, change, or ask about, and why?",
]

SKILL_CANDIDATES = [
    "Python", "FastAPI", "Django", "SQL", "PostgreSQL", "MongoDB", "React", "Node.js",
    "Docker", "Kubernetes", "AWS", "Git", "REST APIs", "TypeScript", "JavaScript",
    "Pandas", "TensorFlow", "Cybersecurity", "Linux", "CI/CD", "Redis", "GraphQL",
]


def _detect_skills(text: str) -> List[str]:
    low = (text or "").lower()
    return [s for s in SKILL_CANDIDATES if s.lower() in low]


class InterviewService:
    # ------------------------------ LLM plumbing --------------------------- #

    def _extract(self, raw: Optional[str]) -> Optional[Dict[str, Any]]:
        if not raw:
            return None
        cleaned = re.sub(r"```(?:json)?\s*", "", raw, flags=re.IGNORECASE).strip()
        try:
            match = re.search(r"\{.*\}", cleaned, re.DOTALL)
            if match:
                return json.loads(match.group(0))
        except Exception:
            pass
        return None

    async def _ask_json(
        self, prompt: str, system: str, ctx: ProviderContext, temperature: float
    ) -> Optional[Dict[str, Any]]:
        try:
            raw = await llm_analyzer._call_llm(prompt, system, replace(ctx, temperature=temperature))
            data = self._extract(raw)
            if data is None and raw:
                print(f"Interview JSON Parse Note: unparseable model output -> {raw[:400]!r}")
            return data
        except Exception as e:
            print(f"Interview LLM Note: {e}")
            return None

    async def _ask_text(
        self, prompt: str, system: str, ctx: ProviderContext, temperature: float
    ) -> str:
        try:
            raw = await llm_analyzer._call_llm(prompt, system, replace(ctx, temperature=temperature))
            return (raw or "").strip()
        except Exception as e:
            print(f"Interview LLM Note: {e}")
            return ""

    # ------------------------------ helpers -------------------------------- #

    @staticmethod
    def _transcript(session: InterviewSession) -> str:
        lines = []
        for m in session.messages:
            if m.role == "ai":
                q = f" (question {m.question_no})" if m.question_no else ""
                lines.append(f"INTERVIEWER{q}: {m.content}")
            else:
                lines.append(f"CANDIDATE: {m.content}")
        return "\n".join(lines)

    @staticmethod
    def _job_text(session: InterviewSession) -> str:
        if session.job_snapshot and session.job_snapshot.strip():
            return session.job_snapshot.strip()
        return (
            "Not provided. Infer the likely target role from the resume and interview the "
            "candidate as a general technical screening."
        )

    def _fallback_question(self, session: InterviewSession) -> str:
        asked = sum(1 for m in session.messages if m.role == "ai")
        name = "there"
        cand = _name_hint(session.resume_snapshot)
        if cand:
            name = cand
        skills = _detect_skills(session.resume_snapshot)
        first_skill = skills[0] if skills else "that project"
        idx = min(asked, len(FALLBACK_QUESTIONS) - 1)
        return FALLBACK_QUESTIONS[idx].format(name=name, first_skill=first_skill)

    def _fallback_report(self, session: InterviewSession) -> Dict[str, Any]:
        answers = [m.content for m in session.messages if m.role == "candidate"]
        words = [len(a.split()) for a in answers] or [0]
        avg = sum(words) / max(len(words), 1)
        depth = max(35, min(78, int(38 + avg * 0.9)))
        score = depth
        if score >= 80:
            rec = "Strong Proceed"
        elif score >= 70:
            rec = "Proceed"
        elif score >= 55:
            rec = "Hold"
        else:
            rec = "Do Not Proceed"
        skills = _detect_skills(session.resume_snapshot)
        top_skills = ", ".join(skills[:3]) or "the core stack"
        return {
            "recommendation": rec,
            "interview_score": score,
            "communication_score": max(35, min(80, int(40 + avg))),
            "technical_depth_score": depth,
            "critical_thinking_score": max(35, min(78, depth - 3)),
            "role_alignment_score": max(35, min(80, depth)),
            "resume_consistency": "Partially Verified",
            "claim_checks": [
                {
                    "claim": f"Candidate demonstrated working knowledge around {top_skills}",
                    "verdict": "Unsupported",
                    "evidence": "Automated check unavailable — AI evaluation could not be completed.",
                }
            ],
            "strengths": [
                {
                    "point": "Engaged with every question without dropping out of the conversation",
                    "evidence": (answers[0][:120] if answers else "Participated in the full session"),
                }
            ],
            "improvements": [
                {
                    "point": "Answers need more specific technical evidence",
                    "coaching": "For each claim, add one number or one concrete trade-off you personally made.",
                }
            ],
            "candidate_feedback": {
                "summary": (
                    "Thanks for completing the interview. Your effort came through, but some answers "
                    "stayed on the surface — dig into specifics next time and you'll score much higher."
                ),
                "what_you_did_well": [
                    "You stayed with the interview and answered every question",
                    f"Your background around {top_skills} is visible in your resume",
                ],
                "where_to_improve": [
                    "Back each claim with a real example, number, or trade-off",
                    "Structure answers: context, what you did, result",
                ],
                "next_steps": [
                    "Rehearse 3 STAR stories from your projects out loud",
                    "Re-run this mock interview after prepping your weakest area",
                ],
            },
            "recruiter_verdict": {
                "headline": f"{rec} — preliminary (automated fallback scoring)",
                "proceed": rec in ("Strong Proceed", "Proceed"),
                "rationale": (
                    "The AI evaluator was unreachable, so this is a rough signal based on answer "
                    "length and engagement only. Re-run the interview for a verified report."
                ),
                "flags": ["Unverified: AI evaluation unavailable at completion time"],
            },
            "_fallback": True,
        }

    # ------------------------------ session flow --------------------------- #

    async def start(
        self,
        db,
        candidate: CandidateResume,
        job: Optional[JobDescription],
        question_count: int,
        mode: str,
        ctx: ProviderContext,
        device_id: Optional[str],
    ) -> InterviewSession:
        # A device runs one interview at a time: anything left "active" is orphaned.
        if device_id:
            db.query(InterviewSession).filter(
                InterviewSession.device_id == device_id,
                InterviewSession.status == "active",
            ).update({"status": "abandoned"}, synchronize_session=False)
            db.commit()

        resume_text = (candidate.sanitized_text or candidate.raw_text or "").strip()
        job_text = (job.raw_text if job else "") or ""
        # Preserve the analyst's target-role / target-JD context for student mode.
        if not job_text and candidate.parsed_profile:
            role = candidate.parsed_profile.get("canonical_title") or ""
            if role:
                job_text = f"Target Role: {role}"

        session = InterviewSession(
            candidate_id=candidate.id,
            job_id=job.id if job else None,
            device_id=device_id,
            mode=mode,
            status="active",
            total_questions=max(3, min(question_count, 6)),
            resume_snapshot=resume_text[:12000],
            job_snapshot=job_text[:6000] or None,
        )
        db.add(session)
        db.commit()
        db.refresh(session)

        opening = await self._ask_json(
            OPENING_PROMPT.format(
                name=candidate.candidate_name or "Candidate",
                resume=resume_text[:4500],
                job=self._job_text(session)[:2500],
            ),
            OPENING_SYSTEM,
            ctx,
            temperature=0.65,
        )
        message = (opening or {}).get("message") or self._fallback_question(session)

        db.add(
            InterviewMessage(
                session_id=session.id, role="ai", content=message, question_no=1
            )
        )
        db.commit()
        db.refresh(session)
        return session

    async def answer(
        self, db, session: InterviewSession, answer: str, ctx: ProviderContext
    ) -> Tuple[InterviewSession, bool]:
        """Appends the candidate answer, then either asks the next question or evaluates.
        Returns (session, finished)."""
        answer = (answer or "").strip()[:2000]
        db.add(InterviewMessage(session_id=session.id, role="candidate", content=answer))
        db.commit()
        db.refresh(session)

        asked = sum(1 for m in session.messages if m.role == "ai")

        if asked < session.total_questions:
            nxt = await self._ask_json(
                FOLLOWUP_PROMPT.format(
                    job=self._job_text(session)[:2000],
                    transcript=self._transcript(session)[-6000:],
                    current=asked + 1,
                    total=session.total_questions,
                ),
                FOLLOWUP_SYSTEM,
                ctx,
                temperature=0.65,
            )
            message = (nxt or {}).get("message") or self._fallback_question(session)
            db.add(
                InterviewMessage(
                    session_id=session.id,
                    role="ai",
                    content=message,
                    question_no=asked + 1,
                )
            )
            db.commit()
            db.refresh(session)
            return session, False

        # All questions answered -> verified evaluation
        report = await self._evaluate(db, session, ctx)
        session.report = report
        session.status = "completed"
        session.completed_at = datetime.utcnow()
        db.commit()
        db.refresh(session)
        return session, True

    async def end_early(
        self, db, session: InterviewSession, ctx: ProviderContext
    ) -> InterviewSession:
        """Candidate stopped early: score the answers already given (min 1)."""
        report = await self._evaluate(db, session, ctx)
        session.report = report
        session.status = "completed"
        session.completed_at = datetime.utcnow()
        db.commit()
        db.refresh(session)
        return session

    async def _evaluate(
        self, db, session: InterviewSession, ctx: ProviderContext
    ) -> Dict[str, Any]:
        name = _name_hint(session.resume_snapshot) or "Candidate"
        raw = await self._ask_json(
            EVAL_PROMPT.format(
                name=name,
                resume=(session.resume_snapshot or "")[:4500],
                job=self._job_text(session)[:2500],
                transcript=self._transcript(session)[-7000:],
            ),
            EVAL_SYSTEM,
            ctx,
            temperature=0.15,
        )
        if not raw or not isinstance(raw.get("interview_score"), (int, float)):
            print(f"Interview Eval Note: unusable evaluation payload ({type(raw).__name__}) -> {str(raw)[:300]} — using fallback report")
            return self._fallback_report(session)
        return self._normalize_report(raw)

    @staticmethod
    def _normalize_report(raw: Dict[str, Any]) -> Dict[str, Any]:
        """Clamps and re-derives fields so the frontend can trust the shape."""
        def clamp(v: Any, default: int = 60) -> int:
            try:
                return max(0, min(100, int(v)))
            except Exception:
                return default

        score = clamp(raw.get("interview_score"))
        rec = str(raw.get("recommendation") or "").strip()
        if rec not in ("Strong Proceed", "Proceed", "Hold", "Do Not Proceed"):
            if score >= 80:
                rec = "Strong Proceed"
            elif score >= 70:
                rec = "Proceed"
            elif score >= 55:
                rec = "Hold"
            else:
                rec = "Do Not Proceed"

        rv = raw.get("recruiter_verdict") or {}
        cf = raw.get("candidate_feedback") or {}
        if not isinstance(rv, dict):
            rv = {}
        if not isinstance(cf, dict):
            cf = {}

        return {
            "recommendation": rec,
            "interview_score": score,
            "communication_score": clamp(raw.get("communication_score")),
            "technical_depth_score": clamp(raw.get("technical_depth_score")),
            "critical_thinking_score": clamp(raw.get("critical_thinking_score")),
            "role_alignment_score": clamp(raw.get("role_alignment_score")),
            "resume_consistency": raw.get("resume_consistency")
            if raw.get("resume_consistency") in ("Verified", "Partially Verified", "Inconsistent")
            else "Partially Verified",
            "claim_checks": raw.get("claim_checks") if isinstance(raw.get("claim_checks"), list) else [],
            "strengths": raw.get("strengths") if isinstance(raw.get("strengths"), list) else [],
            "improvements": raw.get("improvements") if isinstance(raw.get("improvements"), list) else [],
            "candidate_feedback": {
                "summary": cf.get("summary") or "",
                "what_you_did_well": cf.get("what_you_did_well") if isinstance(cf.get("what_you_did_well"), list) else [],
                "where_to_improve": cf.get("where_to_improve") if isinstance(cf.get("where_to_improve"), list) else [],
                "next_steps": cf.get("next_steps") if isinstance(cf.get("next_steps"), list) else [],
            },
            "recruiter_verdict": {
                "headline": rv.get("headline") or f"{rec} — interview score {score}/100",
                "proceed": bool(rv.get("proceed", rec in ("Strong Proceed", "Proceed"))),
                "rationale": rv.get("rationale") or "",
                "flags": rv.get("flags") if isinstance(rv.get("flags"), list) else [],
            },
            "_fallback": False,
        }


def _name_hint(resume_text: str) -> Optional[str]:
    """Best-effort first-line name extraction (offline, no LLM call)."""
    if not resume_text:
        return None
    degree_hits = ("bachelor", "master", "phd", "degree", "resume", "curriculum", "email", "@")
    for line in resume_text.splitlines()[:4]:
        line = line.strip()
        if not line or len(line) > 40:
            continue
        low = line.lower()
        if any(h in low for h in degree_hits):
            continue
        if re.fullmatch(r"[A-Za-z][A-Za-z .\-']{1,38}", line):
            return line
    return None


# --------------------------------------------------------------------------- #
# Report dispatch (Resend REST — works on hosts that block outbound SMTP)
# --------------------------------------------------------------------------- #

def _score_badge_color(rec: str) -> str:
    if rec in ("Strong Proceed", "Proceed"):
        return "#059669"
    if rec == "Hold":
        return "#d97706"
    return "#e11d48"


def _row(label: str, value: Any) -> str:
    return (
        f'<tr><td style="padding:9px 0;border-bottom:1px solid #1f2937;color:#9ca3af;'
        f'font:13px/1.4 Helvetica,Arial,sans-serif">{label}</td>'
        f'<td style="padding:9px 0;border-bottom:1px solid #1f2937;color:#fff;text-align:right;'
        f'font:700 13px/1.4 Helvetica,Arial,sans-serif">{value}</td></tr>'
    )


def _li(item: Any) -> str:
    if isinstance(item, dict):
        main = item.get("point") or item.get("claim") or str(item)
        extra = item.get("coaching") or item.get("evidence") or item.get("verdict") or ""
        txt = html.escape(str(main))
        if extra:
            txt += f'<br><span style="color:#9ca3af;font-size:12px">{html.escape(str(extra))}</span>'
        return (
            f'<li style="margin:0 0 8px;color:#e5e7eb;font:13px/1.5 Helvetica,Arial,sans-serif">'
            f'{txt}</li>'
        )
    return (
        f'<li style="margin:0 0 8px;color:#e5e7eb;font:13px/1.5 Helvetica,Arial,sans-serif">'
        f'{html.escape(str(item))}</li>'
    )


def build_candidate_email(report: Dict[str, Any], candidate_name: str) -> str:
    cf = report.get("candidate_feedback") or {}
    rec = report.get("recommendation", "")
    color = _score_badge_color(rec)
    well = "".join(_li(x) for x in cf.get("what_you_did_well", [])) or "<li>-</li>"
    imp = "".join(_li(x) for x in cf.get("where_to_improve", [])) or "<li>-</li>"
    steps = "".join(_li(x) for x in cf.get("next_steps", [])) or "<li>-</li>"
    summary = html.escape(str(cf.get("summary") or ""))
    return f"""<!doctype html><html><body style="margin:0;background:#0b0f19;padding:24px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;background:#111827;border:1px solid #1f2937;border-radius:16px;overflow:hidden">
<tr><td style="padding:26px 28px 6px;background:linear-gradient(135deg,#4f46e5,#7c3aed)">
<span style="color:#c7d2fe;font:700 12px Helvetica,Arial,sans-serif;letter-spacing:1.5px">TALENTMATCH AI</span>
<h1 style="margin:8px 0 2px;color:#fff;font:800 22px Helvetica,Arial,sans-serif">Your Interview Results</h1>
<p style="margin:0;color:#e0e7ff;font:13px Helvetica,Arial,sans-serif">{html.escape(candidate_name)}</p></td></tr>
<tr><td style="padding:22px 28px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
<td style="padding:14px;background:#0b0f19;border:1px solid #1f2937;border-radius:12px;text-align:center">
<div style="color:#9ca3af;font:11px Helvetica,Arial,sans-serif;letter-spacing:1px">INTERVIEW SCORE</div>
<div style="color:#fff;font:800 34px Helvetica,Arial,sans-serif">{report.get('interview_score','—')}<span style="font-size:16px;color:#6b7280">/100</span></div></td>
<td style="width:12px"></td>
<td style="padding:14px;background:#0b0f19;border:1px solid #1f2937;border-radius:12px;text-align:center">
<div style="color:#9ca3af;font:11px Helvetica,Arial,sans-serif;letter-spacing:1px">VERDICT</div>
<div style="color:{color};font:800 17px Helvetica,Arial,sans-serif;padding-top:6px">{html.escape(rec)}</div></td>
</tr></table>
{f'<p style="margin:18px 0 4px;color:#e5e7eb;font:14px/1.6 Helvetica,Arial,sans-serif">{summary}</p>' if summary else ''}
<h3 style="margin:22px 0 8px;color:#34d399;font:700 14px Helvetica,Arial,sans-serif">What you did well</h3>
<ul style="margin:0;padding-left:18px">{well}</ul>
<h3 style="margin:18px 0 8px;color:#fbbf24;font:700 14px Helvetica,Arial,sans-serif">Where to improve</h3>
<ul style="margin:0;padding-left:18px">{imp}</ul>
<h3 style="margin:18px 0 8px;color:#a78bfa;font:700 14px Helvetica,Arial,sans-serif">Your next steps</h3>
<ul style="margin:0;padding-left:18px">{steps}</ul>
<p style="margin:24px 0 0;color:#6b7280;font:12px/1.5 Helvetica,Arial,sans-serif">Generated by TalentMatch AI — decision-support feedback. Practice, then re-interview to see your score move.</p>
</td></tr></table></body></html>"""


def build_recruiter_email(report: Dict[str, Any], candidate_name: str) -> str:
    rv = report.get("recruiter_verdict") or {}
    rec = report.get("recommendation", "")
    color = _score_badge_color(rec)
    strengths = "".join(_li(x) for x in report.get("strengths", [])) or "<li>-</li>"
    improvements = "".join(_li(x) for x in report.get("improvements", [])) or "<li>-</li>"
    flags = "".join(_li(x) for x in rv.get("flags", [])) or "<li style=\"color:#6b7280\">None flagged</li>"
    checks = "".join(
        _li({"point": c.get("claim"), "coaching": f"{c.get('verdict')} — {c.get('evidence','')}"})
        for c in (report.get("claim_checks") or [])[:6]
    )
    return f"""<!doctype html><html><body style="margin:0;background:#0b0f19;padding:24px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:640px;margin:0 auto;background:#111827;border:1px solid #1f2937;border-radius:16px;overflow:hidden">
<tr><td style="padding:26px 28px 14px;background:#111827;border-bottom:1px solid #1f2937">
<span style="color:#a78bfa;font:700 11px Helvetica,Arial,sans-serif;letter-spacing:1.5px">TALENTMATCH AI — INTERVIEW VERDICT</span>
<h1 style="margin:8px 0 2px;color:#fff;font:800 21px Helvetica,Arial,sans-serif">{html.escape(candidate_name)}</h1>
<p style="margin:0;color:{color};font:800 15px Helvetica,Arial,sans-serif">{html.escape(str(rv.get('headline') or rec))}</p></td></tr>
<tr><td style="padding:20px 28px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0b0f19;border:1px solid #1f2937;border-radius:12px">
{_row('Interview Score', f"{report.get('interview_score','—')}/100")}
{_row('Communication', f"{report.get('communication_score','—')}/100")}
{_row('Technical Depth', f"{report.get('technical_depth_score','—')}/100")}
{_row('Critical Thinking', f"{report.get('critical_thinking_score','—')}/100")}
{_row('Role Alignment', f"{report.get('role_alignment_score','—')}/100")}
{_row('Resume Consistency', report.get('resume_consistency','—'))}
{_row('Recommendation', f'<span style="color:{color}">{html.escape(rec)}</span>')}
</table>
{f'<p style="margin:16px 0 4px;color:#e5e7eb;font:13px/1.6 Helvetica,Arial,sans-serif">{html.escape(str(rv.get("rationale") or ""))}</p>' if rv.get('rationale') else ''}
<h3 style="margin:20px 0 8px;color:#34d399;font:700 14px Helvetica,Arial,sans-serif">Strengths (evidence from transcript)</h3>
<ul style="margin:0;padding-left:18px">{strengths}</ul>
<h3 style="margin:16px 0 8px;color:#fbbf24;font:700 14px Helvetica,Arial,sans-serif">Development areas</h3>
<ul style="margin:0;padding-left:18px">{improvements}</ul>
<h3 style="margin:16px 0 8px;color:#60a5fa;font:700 14px Helvetica,Arial,sans-serif">Claim checks vs resume</h3>
<ul style="margin:0;padding-left:18px">{checks or '<li>-</li>'}</ul>
<h3 style="margin:16px 0 8px;color:#f87171;font:700 14px Helvetica,Arial,sans-serif">Flags</h3>
<ul style="margin:0;padding-left:18px">{flags}</ul>
<p style="margin:22px 0 0;color:#6b7280;font:11px/1.5 Helvetica,Arial,sans-serif">AI-generated decision support. Verify final hiring decisions with a human interviewer.</p>
</td></tr></table></body></html>"""


class ReportDispatcher:
    """Sends both report emails through Resend's REST API (no SMTP port needed),
    or returns downloadable HTML drafts when email is not configured."""

    async def send(
        self,
        report: Dict[str, Any],
        candidate_name: str,
        candidate_email: Optional[str],
        recruiter_email: Optional[str],
    ) -> Dict[str, Any]:
        cand_html = build_candidate_email(report, candidate_name)
        rec_html = build_recruiter_email(report, candidate_name)
        result: Dict[str, Any] = {
            "delivery": "draft",
            "sent_to": [],
            "candidate_html": cand_html,
            "recruiter_html": rec_html,
        }

        to_c = (candidate_email or settings.RECIPIENT_CANDIDATE or "").strip()
        to_r = (recruiter_email or settings.RECIPIENT_RECRUITER or "").strip()
        if not settings.RESEND_API_KEY or (not to_c and not to_r):
            result["note"] = (
                "Email delivery not configured (RESEND_API_KEY unset) — showing downloadable drafts."
            )
            return result

        sent: List[str] = []
        async with httpx.AsyncClient(timeout=httpx.Timeout(15.0, connect=5.0)) as client:
            if to_c:
                ok = await self._one(client, to_c, f"Your TalentMatch AI Interview Results", cand_html)
                if ok:
                    sent.append(to_c)
            if to_r:
                ok = await self._one(client, to_r, f"Interview Verdict: {candidate_name}", rec_html)
                if ok:
                    sent.append(to_r)

        result["sent_to"] = sent
        result["delivery"] = "email" if sent else "draft"
        if not sent:
            result["note"] = "Email provider rejected the send — returning drafts instead."
        return result

    async def _one(self, client: httpx.AsyncClient, to: str, subject: str, page: str) -> bool:
        try:
            res = await client.post(
                "https://api.resend.com/emails",
                headers={"Authorization": f"Bearer {settings.RESEND_API_KEY}"},
                json={
                    "from": settings.EMAIL_FROM,
                    "to": [to],
                    "subject": subject,
                    "html": page,
                },
            )
            return res.status_code in (200, 201)
        except Exception as e:
            print(f"Report Email Note: {e}")
            return False


interview_service = InterviewService()
report_dispatcher = ReportDispatcher()
