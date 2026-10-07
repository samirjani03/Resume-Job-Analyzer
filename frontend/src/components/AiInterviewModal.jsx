import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  X, Bot, Send, Sparkles, CheckCircle, AlertTriangle, Briefcase, FileText,
  Download, Mail, RefreshCw, Flag, Quote, ShieldCheck, ArrowRight, Square, Copy,
} from 'lucide-react';
import {
  startInterview, answerInterview, sendInterviewReports, endInterview,
  getInterview, getQuota,
} from '../services/api';

const STORAGE_KEY = 'talentmatch_active_interview';
const MAX_ANSWER = 2000;

const RECOMMENDATION_STYLES = {
  'Strong Proceed': 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
  'Proceed': 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  'Hold': 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  'Do Not Proceed': 'bg-rose-500/15 text-rose-400 border-rose-500/30',
};

const CLAIM_STYLES = {
  Verified: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  Unsupported: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  Contradicted: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
};

const pointOf = (s) => (typeof s === 'string' ? s : s?.point || '');
const evidenceOf = (s) => (typeof s === 'string' ? '' : s?.evidence || '');
const coachingOf = (s) => (typeof s === 'string' ? '' : s?.coaching || '');

function downloadFile(content, filename, mime) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function esc(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function reportMarkdown(session) {
  const r = session.report || {};
  const cf = r.candidate_feedback || {};
  const rv = r.recruiter_verdict || {};
  const answered = (session.messages || []).filter((m) => m.role === 'candidate').length;
  const L = [];
  L.push(`# AI Interview Report — ${session.candidate_name}`);
  L.push('');
  L.push(`- **Job / role:** ${session.job_title || '—'}`);
  L.push(`- **Questions answered:** ${answered} of ${session.total_questions}`);
  L.push(`- **Recommendation:** ${r.recommendation}`);
  L.push(`- **Interview score:** ${r.interview_score}/100`);
  L.push(`- **Resume consistency:** ${r.resume_consistency}`);
  L.push('');
  L.push('## Scores');
  L.push('');
  L.push('| Metric | Score |');
  L.push('|---|---|');
  L.push(`| Communication | ${r.communication_score} |`);
  L.push(`| Technical depth | ${r.technical_depth_score} |`);
  L.push(`| Critical thinking | ${r.critical_thinking_score} |`);
  L.push(`| Role alignment | ${r.role_alignment_score} |`);
  L.push('');
  L.push('## Verdict');
  L.push('');
  L.push(`**${rv.headline || r.recommendation}**`);
  if (rv.rationale) L.push('', rv.rationale);
  if ((rv.flags || []).length) L.push('', '**Flags:**', ...(rv.flags || []).map((f) => `- ${f}`));
  L.push('');
  L.push('## Candidate Feedback');
  if (cf.summary) L.push('', `> ${cf.summary}`);
  const bullets = (arr) => (arr || []).map((x) => `- ${x}`);
  if ((cf.what_you_did_well || []).length) L.push('', '### What you did well', ...bullets(cf.what_you_did_well));
  if ((cf.where_to_improve || []).length) L.push('', '### Where to improve', ...bullets(cf.where_to_improve));
  if ((cf.next_steps || []).length) L.push('', '### Next steps', ...bullets(cf.next_steps));
  if ((r.strengths || []).length) {
    L.push('', '### Strengths (from transcript)');
    for (const s of r.strengths) {
      L.push(`- ${pointOf(s)}`);
      if (evidenceOf(s)) L.push(`  - Evidence: "${evidenceOf(s)}"`);
    }
  }
  if ((r.improvements || []).length) {
    L.push('', '### Development areas');
    for (const s of r.improvements) {
      L.push(`- ${pointOf(s)}`);
      if (coachingOf(s)) L.push(`  - Coaching: ${coachingOf(s)}`);
    }
  }
  if ((r.claim_checks || []).length) {
    L.push('', '### Claim verification vs resume');
    L.push('', '| Claim | Verdict | Evidence |', '|---|---|---|');
    for (const c of r.claim_checks) {
      L.push(`| ${String(c.claim || '').replace(/\|/g, '\\|')} | ${c.verdict} | ${String(c.evidence || '').replace(/\|/g, '\\|')} |`);
    }
  }
  L.push('', '## Transcript');
  for (const m of session.messages || []) {
    L.push('', m.role === 'ai' ? `**Interviewer${m.question_no ? ` (Q${m.question_no})` : ''}:**` : '**Candidate:**');
    L.push('', m.content);
  }
  L.push('', '---', 'AI decision-support — confirm final hiring decisions with a human interviewer.');
  return L.join('\n');
}

function transcriptMarkdown(session) {
  const L = [`# Interview Transcript — ${session.candidate_name}`];
  L.push('', `Job: ${session.job_title || '—'} • ${new Date(session.created_at).toLocaleString()}`, '');
  for (const m of session.messages || []) {
    L.push(`## ${m.role === 'ai' ? `Interviewer${m.question_no ? ` — Q${m.question_no}` : ''}` : 'Candidate'}`);
    L.push('', m.content, '');
  }
  return L.join('\n');
}

function transcriptHtml(session) {
  const rows = (session.messages || [])
    .map((m) => {
      if (m.role === 'ai') {
        return `<div class="q">${m.question_no ? `<span class="qno">Question ${m.question_no} of ${session.total_questions}</span>` : '<span class="qno">Interviewer</span>'}<p>${esc(m.content)}</p></div>`;
      }
      return `<div class="a"><span class="ano">Candidate</span><p>${esc(m.content)}</p></div>`;
    })
    .join('');
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>Interview Transcript — ${esc(session.candidate_name)}</title>
<style>
 body{font-family:Inter,Segoe UI,system-ui,sans-serif;background:#0b0f19;color:#e5e7eb;margin:0;padding:40px 20px}
 .wrap{max-width:760px;margin:0 auto}
 h1{font-size:22px;margin:0 0 4px;color:#fff}
 .meta{font-size:12px;color:#9ca3af;margin-bottom:28px}
 .q,.a{padding:16px 18px;border-radius:14px;margin-bottom:16px;line-height:1.6}
 .q{background:#111827;border:1px solid #1f293d}
 .a{background:linear-gradient(135deg,#4f46e5,#7c3aed);border:1px solid #6366f1;color:#fff;margin-left:48px}
 .qno{display:block;font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:#a78bfa;font-weight:700;margin-bottom:6px}
 .ano{display:block;font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:#e0e7ff;font-weight:700;margin-bottom:6px}
 p{margin:0;font-size:14px;white-space:pre-line}
 .foot{font-size:11px;color:#6b7280;margin-top:28px;text-align:center}
</style></head>
<body><div class="wrap">
<h1>Interview Transcript — ${esc(session.candidate_name)}</h1>
<div class="meta">${session.job_title ? esc(session.job_title) + ' • ' : ''}${new Date(session.created_at).toLocaleString()} • TalentMatch AI</div>
${rows}
<div class="foot">TalentMatch AI — AI decision-support, confirm hiring decisions with human review.</div>
</div></body></html>`;
}

function MetricBar({ label, value }) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-[11px] font-semibold text-gray-300">
        <span>{label}</span>
        <span className="text-white">{value}</span>
      </div>
      <div className="w-full h-1.5 bg-gray-800 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full transition-all duration-700"
          style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
        />
      </div>
    </div>
  );
}

function Bubble({ msg, totalQuestions, showAvatar }) {
  const isAi = msg.role === 'ai';
  return (
    <div className={`flex items-start gap-3 ${isAi ? '' : 'flex-row-reverse'}`}>
      {isAi && (
        <div className={`w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center flex-shrink-0 shadow-lg shadow-purple-600/20 ${showAvatar ? '' : 'opacity-0'}`}>
          <Bot className="w-4 h-4 text-white" />
        </div>
      )}
      <div className={`max-w-[82%] ${isAi ? '' : 'flex flex-col items-end'}`}>
        {isAi && msg.question_no != null && (
          <div className="text-[10px] font-bold uppercase tracking-widest text-purple-300/70 mb-1 ml-1">
            Question {msg.question_no} of {totalQuestions}
          </div>
        )}
        <div
          className={`px-4 py-2.5 text-[13px] leading-relaxed whitespace-pre-line border ${
            isAi
              ? 'bg-gray-800/70 border-gray-700/60 text-gray-100 rounded-2xl rounded-tl-md'
              : 'bg-gradient-to-br from-indigo-600 to-purple-700 border-indigo-500/40 text-white rounded-2xl rounded-tr-md shadow-lg shadow-indigo-900/30'
          }`}
        >
          {msg.content}
        </div>
      </div>
    </div>
  );
}

function TypingDots({ label }) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center flex-shrink-0 shadow-lg shadow-purple-600/20">
        <Bot className="w-4 h-4 text-white" />
      </div>
      <div className="bg-gray-800/70 border border-gray-700/60 rounded-2xl rounded-tl-md px-4 py-3 flex items-center gap-2">
        <span className="flex gap-1">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-bounce"
              style={{ animationDelay: `${i * 0.15}s` }}
            />
          ))}
        </span>
        <span className="text-[11px] text-gray-400 font-medium">{label}</span>
      </div>
    </div>
  );
}

function ScoreGauge({ score, recommendation }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative w-24 h-24 rounded-full border-4 border-purple-500/30 bg-purple-500/5 flex flex-col items-center justify-center">
        <span className="text-3xl font-black text-white">{score}</span>
        <span className="text-[9px] font-bold uppercase tracking-widest text-purple-300/80">/ 100</span>
      </div>
      <span className={`px-3 py-1 rounded-full text-[11px] font-extrabold border ${RECOMMENDATION_STYLES[recommendation] || 'bg-gray-700/40 text-gray-300 border-gray-600'}`}>
        {recommendation}
      </span>
    </div>
  );
}

export default function AiInterviewModal({ context, onClose }) {
  const [session, setSession] = useState(null);
  const [phase, setPhase] = useState('connecting'); // connecting | chatting | done | error
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const [thinkingLabel, setThinkingLabel] = useState('Interviewer is thinking…');
  const [tab, setTab] = useState('candidate');
  const [emails, setEmails] = useState({ candidate_email: '', recruiter_email: '' });
  const [sendState, setSendState] = useState(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const [showEndSheet, setShowEndSheet] = useState(false);
  const [quota, setQuota] = useState(null);
  const [pasteHint, setPasteHint] = useState(false);
  const [copied, setCopied] = useState(false);
  const scrollRef = useRef(null);
  const taRef = useRef(null);
  const resumeRef = useRef(true);

  const isStudent = context.mode === 'student';

  const launch = useCallback(async () => {
    setPhase('connecting');
    setError(null);
    setSession(null);
    setSendState(null);
    setTab('candidate');
    setShowEndSheet(false);

    // Reattach to an interview that survived a refresh before starting a new one.
    if (resumeRef.current) {
      const stored = sessionStorage.getItem(STORAGE_KEY);
      if (stored) {
        try {
          const existing = await getInterview(Number(stored));
          if (existing.status === 'active') {
            setQuota((await getQuota().catch(() => null)) || null);
            setSession(existing);
            setPhase('chatting');
            return;
          }
          if (existing.status === 'completed' && existing.report) {
            setSession(existing);
            setPhase('done');
            return;
          }
        } catch {
          /* stale or foreign session id */
        }
        sessionStorage.removeItem(STORAGE_KEY);
      }
    }
    resumeRef.current = true;

    const q = await getQuota().catch(() => null);
    if (q) setQuota(q);
    if (q && q.limit && q.used >= q.limit) {
      setError(`Daily AI limit reached (${q.used}/${q.limit}). It resets at midnight UTC.`);
      setPhase('error');
      return;
    }

    try {
      const s = await startInterview({
        candidate_id: context.candidateId,
        job_id: context.jobId,
        question_count: 4,
        mode: context.mode || 'recruiter',
      });
      sessionStorage.setItem(STORAGE_KEY, String(s.session_id));
      setSession(s);
      setPhase(s.status === 'completed' ? 'done' : 'chatting');
    } catch (err) {
      setError(err.message || 'Could not start the interview.');
      setPhase('error');
    }
  }, [context.candidateId, context.jobId, context.mode]);

  useEffect(() => {
    launch();
  }, [launch]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== 'Escape') return;
      if (showEndSheet) setShowEndSheet(false);
      else onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, showEndSheet]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [session, thinking]);

  const messages = session?.messages || [];
  const askedCount = messages.filter((m) => m.role === 'ai').length;
  const answeredCount = messages.filter((m) => m.role === 'candidate').length;
  const isFinalAsk = session && askedCount >= session.total_questions;
  const report = session?.report;
  const quotaLeft = quota && quota.limit != null ? Math.max(0, quota.limit - quota.used) : null;

  const handleSend = async () => {
    const text = input.trim().slice(0, MAX_ANSWER);
    if (!text || !session || thinking) return;
    const optimistic = [...messages, { id: `tmp-${Date.now()}`, role: 'candidate', content: text, question_no: null }];
    setSession({ ...session, messages: optimistic });
    setInput('');
    setThinking(true);
    setThinkingLabel(isFinalAsk ? 'Scoring your answers and building the report…' : 'Interviewer is thinking…');
    if (taRef.current) taRef.current.style.height = 'auto';
    try {
      const updated = await answerInterview(session.session_id, text);
      setSession(updated);
      setError(null);
      if (updated.status === 'completed') {
        setPhase('done');
        setTab('candidate');
      }
    } catch (err) {
      setError(err.message || 'Send failed.');
      setSession({ ...session, messages });
    } finally {
      setThinking(false);
    }
  };

  const handleEnd = async (action) => {
    if (!session || thinking) return;
    if (action === 'discard') {
      try {
        await endInterview(session.session_id, 'discard');
      } catch {
        /* session may already be gone — drop it locally either way */
      }
      sessionStorage.removeItem(STORAGE_KEY);
      onClose();
      return;
    }
    setThinking(true);
    setThinkingLabel('Scoring your answers and building the report…');
    try {
      const updated = await endInterview(session.session_id, 'report');
      sessionStorage.setItem(STORAGE_KEY, String(updated.session_id));
      setSession(updated);
      setPhase('done');
      setTab('candidate');
      setShowEndSheet(false);
      setError(null);
    } catch (err) {
      setError(err.message || 'Could not finish the interview.');
      setShowEndSheet(false);
    } finally {
      setThinking(false);
    }
  };

  const handleRetake = () => {
    sessionStorage.removeItem(STORAGE_KEY);
    resumeRef.current = false;
    launch();
  };

  const handleSendReports = async () => {
    if (!session || sending) return;
    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const ce = emails.candidate_email.trim();
    const re = emails.recruiter_email.trim();
    if ((ce && !emailRe.test(ce)) || (re && !emailRe.test(re))) {
      setSendState({ error: 'Enter a valid email address (or leave the field empty).' });
      return;
    }
    setSending(true);
    try {
      const res = await sendInterviewReports(session.session_id, {
        candidate_email: ce || null,
        recruiter_email: re || null,
      });
      setSendState(res);
    } catch (err) {
      setSendState({ error: err.message || 'Could not send reports.' });
    } finally {
      setSending(false);
    }
  };

  const downloadHtml = (html, filename) => downloadFile(html, filename, 'text/html');

  const downloadReportMd = () =>
    downloadFile(reportMarkdown(session), `interview_report_${session.candidate_name || 'candidate'}.md`, 'text/markdown');

  const downloadReportJson = () =>
    downloadFile(
      JSON.stringify(
        {
          candidate: session.candidate_name,
          job_title: session.job_title,
          generated_at: new Date().toISOString(),
          report: session.report,
          transcript: session.messages,
        },
        null,
        2
      ),
      `interview_report_${session.candidate_name || 'candidate'}.json`,
      'application/json'
    );

  const copyReport = async () => {
    try {
      await navigator.clipboard.writeText(reportMarkdown(session));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError('Clipboard blocked by the browser — use Download MD instead.');
    }
  };

  const recBadge = (rec) => RECOMMENDATION_STYLES[rec] || 'bg-gray-700/40 text-gray-300 border-gray-600';

  const tabClass = (id, baseColor) =>
    `px-4 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 whitespace-nowrap ${
      tab === id ? baseColor : 'text-gray-400 hover:text-white hover:bg-gray-800'
    }`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4">
      <div className="glass-panel relative w-full max-w-3xl h-[88vh] rounded-2xl overflow-hidden border border-gray-800 bg-gray-950/95 shadow-2xl flex flex-col">

        {/* ── Header ─────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-800 bg-gray-900/90 flex-shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-purple-600/25">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-sm font-bold text-white">
                  {isStudent ? 'AI Mock Interview' : 'AI Interview'}
                </h2>
                <span className="flex items-center space-x-1 bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>{phase === 'done' ? 'Complete' : 'Live'}</span>
                </span>
              </div>
              <p className="text-[11px] text-gray-400 mt-0.5">
                {context.candidateName}
                {context.jobTitle ? ` • ${context.jobTitle}` : ''}
                {session ? ` • Q ${Math.min(askedCount, session.total_questions)}/${session.total_questions}` : ''}
                {quotaLeft != null ? ` • ${quotaLeft} AI calls left today` : ''}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {phase === 'chatting' && (
              <button
                onClick={() => setShowEndSheet(true)}
                disabled={thinking}
                className="flex items-center space-x-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 text-[11px] font-semibold px-3 py-1.5 rounded-lg border border-amber-500/30 transition disabled:opacity-50"
                title="End the interview early"
              >
                <Square className="w-3 h-3 fill-current" />
                <span>End Interview</span>
              </button>
            )}
            {phase === 'done' && (
              <button
                onClick={handleRetake}
                className="flex items-center space-x-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 text-[11px] font-semibold px-3 py-1.5 rounded-lg border border-gray-700 transition"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Retake</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-gray-800 transition"
              title={phase === 'chatting' ? 'Close — the interview stays saved and resumes next time' : 'Close'}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ── Body ───────────────────────────────────────────────── */}
        {phase === 'connecting' && (
          <div className="flex-1 flex flex-col items-center justify-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center animate-pulse shadow-xl shadow-purple-600/30">
              <Sparkles className="w-8 h-8 text-white" />
            </div>
            <p className="text-sm text-gray-300 font-semibold">Preparing your interview…</p>
            <p className="text-xs text-gray-500 max-w-xs text-center">
              Reading the resume, picking the right questions, and setting up the room.
            </p>
            {quota && quota.limit != null && (
              <p className="text-[11px] text-gray-600 text-center">
                Each interview uses a few AI calls — {quotaLeft} of {quota.limit} left today
              </p>
            )}
          </div>
        )}

        {phase === 'error' && (
          <div className="flex-1 flex flex-col items-center justify-center space-y-4 px-6">
            <AlertTriangle className="w-10 h-10 text-amber-400" />
            <p className="text-sm text-gray-200 text-center">{error}</p>
            <button
              onClick={launch}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-xs font-bold flex items-center space-x-2"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Try Again</span>
            </button>
          </div>
        )}

        {phase === 'chatting' && (
          <>
            <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-5 space-y-4">
              <div className="flex items-center justify-center">
                <span className="text-[10px] uppercase tracking-widest text-gray-600 font-bold">
                  AI Interviewer • Senior Tech Lead
                </span>
              </div>
              {error && (
                <div className="flex items-center space-x-2 bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs px-3 py-2 rounded-xl">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}
              {messages.map((m, i) => (
                <Bubble
                  key={m.id}
                  msg={m}
                  totalQuestions={session?.total_questions || 4}
                  showAvatar={i === 0 || messages[i - 1]?.role !== 'ai'}
                />
              ))}
              {thinking && <TypingDots label={thinkingLabel} />}
            </div>

            {/* Input */}
            <div className="border-t border-gray-800 p-3 bg-gray-900/90 flex-shrink-0">
              <div className="flex items-end space-x-2 bg-gray-800/70 border border-gray-700/70 rounded-2xl px-3 py-2 focus-within:border-purple-500/70 transition">
                <textarea
                  ref={taRef}
                  rows={1}
                  value={input}
                  maxLength={MAX_ANSWER}
                  onChange={(e) => {
                    setInput(e.target.value);
                    e.target.style.height = 'auto';
                    e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  onPaste={(e) => {
                    e.preventDefault();
                    setPasteHint(true);
                    setTimeout(() => setPasteHint(false), 2500);
                  }}
                  onContextMenu={(e) => e.preventDefault()}
                  placeholder={thinking ? 'The interviewer is preparing the next step…' : 'Type your answer…'}
                  disabled={thinking}
                  className="flex-1 bg-transparent text-[13px] text-white placeholder-gray-500 resize-none focus:outline-none py-1.5 max-h-[120px]"
                />
                <button
                  onClick={handleSend}
                  disabled={!input.trim() || thinking}
                  className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 disabled:opacity-40 flex items-center justify-center transition flex-shrink-0 shadow-lg shadow-purple-600/25"
                >
                  <Send className="w-4 h-4 text-white" />
                </button>
              </div>
              <div className="flex items-center justify-between mt-1.5 px-1 gap-3">
                {pasteHint ? (
                  <p className="text-[10px] text-amber-400 font-semibold">
                    Please type your own answer.
                  </p>
                ) : (
                  <p className="text-[10px] text-gray-600">
                    Enter to send • Shift+Enter for a new line • type your own answer
                  </p>
                )}
                {input.length > MAX_ANSWER - 200 && (
                  <p className={`text-[10px] font-semibold flex-shrink-0 ${input.length >= MAX_ANSWER ? 'text-amber-400' : 'text-gray-500'}`}>
                    {input.length}/{MAX_ANSWER}
                  </p>
                )}
              </div>
            </div>
          </>
        )}

        {/* ── Report (completed) ─────────────────────────────────── */}
        {phase === 'done' && report && (
          <>
            <div className="flex items-center space-x-2 px-4 py-2.5 border-b border-gray-800 bg-gray-900/70 overflow-x-auto flex-shrink-0">
              <button onClick={() => setTab('candidate')} className={tabClass('candidate', 'bg-purple-600 text-white shadow-lg shadow-purple-600/30')}>
                <Sparkles className="w-3.5 h-3.5" /><span>Candidate Feedback</span>
              </button>
              <button onClick={() => setTab('recruiter')} className={tabClass('recruiter', 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30')}>
                <Briefcase className="w-3.5 h-3.5" /><span>Recruiter Verdict</span>
              </button>
              <button onClick={() => setTab('transcript')} className={tabClass('transcript', 'bg-gray-700 text-white')}>
                <FileText className="w-3.5 h-3.5" /><span>Transcript</span>
              </button>
              <button onClick={() => setTab('send')} className={tabClass('send', 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30')}>
                <Mail className="w-3.5 h-3.5" /><span>Release Reports</span>
              </button>
            </div>

            <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-5">
              {error && (
                <div className="mb-4 flex items-center space-x-2 bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs px-3 py-2 rounded-xl">
                  <AlertTriangle className="w-4 h-4" /> <span>{error}</span>
                </div>
              )}

              {/* Save / export bar */}
              <div className="flex flex-wrap items-center justify-between gap-2 mb-4 pb-3 border-b border-gray-800">
                <span className="text-[10px] uppercase tracking-widest text-gray-600 font-bold">
                  Report • {session.candidate_name}
                  {session.job_title ? ` • ${session.job_title}` : ''}
                  {' • '}{answeredCount}/{session.total_questions} answered
                </span>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={copyReport}
                    className="flex items-center space-x-1.5 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 text-[11px] font-semibold px-3 py-1.5 rounded-lg transition"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>{copied ? 'Copied!' : 'Copy summary'}</span>
                  </button>
                  <button
                    onClick={downloadReportMd}
                    className="flex items-center space-x-1.5 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 text-[11px] font-semibold px-3 py-1.5 rounded-lg transition"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Markdown</span>
                  </button>
                  <button
                    onClick={downloadReportJson}
                    className="flex items-center space-x-1.5 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 text-[11px] font-semibold px-3 py-1.5 rounded-lg transition"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>JSON</span>
                  </button>
                </div>
              </div>

              {/* CANDIDATE TAB */}
              {tab === 'candidate' && (
                <div className="space-y-5">
                  <div className="flex flex-col sm:flex-row items-center gap-5 p-5 rounded-2xl bg-gradient-to-r from-purple-950/40 via-gray-900 to-indigo-950/40 border border-gray-800">
                    <ScoreGauge score={report.interview_score} recommendation={report.recommendation} />
                    <div className="flex-1 space-y-3 text-center sm:text-left">
                      <p className="text-[13px] text-gray-200 leading-relaxed italic">
                        “{report.candidate_feedback?.summary}”
                      </p>
                      <div className="grid grid-cols-2 gap-3">
                        <MetricBar label="Communication" value={report.communication_score} />
                        <MetricBar label="Technical Depth" value={report.technical_depth_score} />
                        <MetricBar label="Critical Thinking" value={report.critical_thinking_score} />
                        <MetricBar label="Role Alignment" value={report.role_alignment_score} />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-500/25 space-y-2.5">
                      <h4 className="text-xs font-bold text-emerald-300 flex items-center space-x-1.5">
                        <CheckCircle className="w-4 h-4" /><span>What you did well</span>
                      </h4>
                      <ul className="space-y-2">
                        {(report.candidate_feedback?.what_you_did_well || []).map((s, i) => (
                          <li key={i} className="text-xs text-gray-200 leading-relaxed flex items-start space-x-1.5">
                            <span className="text-emerald-400 mt-0.5">•</span><span>{s}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="p-4 rounded-xl bg-amber-950/20 border border-amber-500/25 space-y-2.5">
                      <h4 className="text-xs font-bold text-amber-300 flex items-center space-x-1.5">
                        <AlertTriangle className="w-4 h-4" /><span>Where to improve</span>
                      </h4>
                      <ul className="space-y-2">
                        {(report.candidate_feedback?.where_to_improve || []).map((s, i) => (
                          <li key={i} className="text-xs text-gray-200 leading-relaxed flex items-start space-x-1.5">
                            <span className="text-amber-400 mt-0.5">•</span><span>{s}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="p-4 rounded-xl bg-purple-950/25 border border-purple-500/25 space-y-2.5">
                      <h4 className="text-xs font-bold text-purple-300 flex items-center space-x-1.5">
                        <ArrowRight className="w-4 h-4" /><span>Your next steps</span>
                      </h4>
                      <ul className="space-y-2">
                        {(report.candidate_feedback?.next_steps || []).map((s, i) => (
                          <li key={i} className="text-xs text-gray-200 leading-relaxed flex items-start space-x-2">
                            <span className="w-4 h-4 rounded bg-purple-500/25 text-purple-300 text-[9px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{i + 1}</span>
                            <span>{s}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div className="flex items-start space-x-2 p-3 rounded-xl bg-gray-900/70 border border-gray-800 text-[11px] text-gray-500">
                    <ShieldCheck className="w-4 h-4 text-gray-600 flex-shrink-0 mt-0.5" />
                    <span>Scored from your actual answers in this session — not from your resume alone.</span>
                  </div>
                </div>
              )}

              {/* RECRUITER TAB */}
              {tab === 'recruiter' && (
                <div className="space-y-5">
                  <div className={`p-5 rounded-2xl border space-y-3 ${report.recruiter_verdict?.proceed ? 'bg-emerald-950/20 border-emerald-500/30' : 'bg-rose-950/20 border-rose-500/30'}`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Decision Verdict</div>
                        <h3 className={`text-lg font-black mt-1 ${report.recruiter_verdict?.proceed ? 'text-emerald-300' : 'text-rose-300'}`}>
                          {report.recruiter_verdict?.headline}
                        </h3>
                      </div>
                      <div className="text-right">
                        <div className="text-3xl font-black text-white">{report.interview_score}<span className="text-sm text-gray-500">/100</span></div>
                        <span className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-extrabold border mt-1 ${recBadge(report.recommendation)}`}>
                          {report.recommendation}
                        </span>
                      </div>
                    </div>
                    <p className="text-xs text-gray-300 leading-relaxed">{report.recruiter_verdict?.rationale}</p>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    <div className="p-3 rounded-xl bg-gray-900/80 border border-gray-800 text-center">
                      <div className="text-lg font-black text-white">{report.communication_score}</div>
                      <div className="text-[9px] uppercase tracking-wider text-gray-500 font-bold">Communication</div>
                    </div>
                    <div className="p-3 rounded-xl bg-gray-900/80 border border-gray-800 text-center">
                      <div className="text-lg font-black text-white">{report.technical_depth_score}</div>
                      <div className="text-[9px] uppercase tracking-wider text-gray-500 font-bold">Tech Depth</div>
                    </div>
                    <div className="p-3 rounded-xl bg-gray-900/80 border border-gray-800 text-center">
                      <div className="text-lg font-black text-white">{report.critical_thinking_score}</div>
                      <div className="text-[9px] uppercase tracking-wider text-gray-500 font-bold">Thinking</div>
                    </div>
                    <div className="p-3 rounded-xl bg-gray-900/80 border border-gray-800 text-center">
                      <div className="text-lg font-black text-white">{report.role_alignment_score}</div>
                      <div className="text-[9px] uppercase tracking-wider text-gray-500 font-bold">Role Fit</div>
                    </div>
                    <div className="p-3 rounded-xl bg-gray-900/80 border border-gray-800 text-center">
                      <div className={`text-lg font-black ${report.resume_consistency === 'Verified' ? 'text-emerald-400' : report.resume_consistency === 'Inconsistent' ? 'text-rose-400' : 'text-amber-400'}`}>
                        {report.resume_consistency === 'Verified' ? '✓' : report.resume_consistency === 'Inconsistent' ? '✗' : '~'}
                      </div>
                      <div className="text-[9px] uppercase tracking-wider text-gray-500 font-bold">Resume Check</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 rounded-xl bg-gray-900/70 border border-gray-800 space-y-3">
                      <h4 className="text-xs font-bold text-emerald-400 flex items-center space-x-1.5"><CheckCircle className="w-4 h-4" /><span>Strengths (from transcript)</span></h4>
                      <ul className="space-y-2.5">
                        {(report.strengths || []).map((s, i) => (
                          <li key={i} className="text-xs space-y-1">
                            <div className="text-gray-200 leading-relaxed">{s.point || s}</div>
                            {s.evidence && (
                              <div className="flex items-start space-x-1.5 text-gray-500 italic">
                                <Quote className="w-3 h-3 mt-0.5 flex-shrink-0" /><span className="text-[11px]">“{s.evidence}”</span>
                              </div>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="p-4 rounded-xl bg-gray-900/70 border border-gray-800 space-y-3">
                      <h4 className="text-xs font-bold text-amber-400 flex items-center space-x-1.5"><AlertTriangle className="w-4 h-4" /><span>Development Areas</span></h4>
                      <ul className="space-y-2.5">
                        {(report.improvements || []).map((s, i) => (
                          <li key={i} className="text-xs space-y-1">
                            <div className="text-gray-200 leading-relaxed">{s.point || s}</div>
                            {s.coaching && <div className="text-[11px] text-purple-300/80">→ {s.coaching}</div>}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {(report.claim_checks || []).length > 0 && (
                    <div className="p-4 rounded-xl bg-gray-900/70 border border-gray-800 space-y-3">
                      <h4 className="text-xs font-bold text-blue-400 flex items-center space-x-1.5"><ShieldCheck className="w-4 h-4" /><span>Claim Verification vs Resume</span></h4>
                      <div className="space-y-2">
                        {report.claim_checks.map((c, i) => (
                          <div key={i} className="flex items-start justify-between gap-3 p-2.5 rounded-lg bg-gray-950/60 border border-gray-800">
                            <div className="text-xs text-gray-300">
                              <span className="text-white font-semibold">{c.claim}</span>
                              {c.evidence && <div className="text-[11px] text-gray-500 mt-0.5 italic">“{c.evidence}”</div>}
                            </div>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded border flex-shrink-0 ${CLAIM_STYLES[c.verdict] || 'bg-gray-700/40 text-gray-300 border-gray-600'}`}>
                              {c.verdict}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {(report.recruiter_verdict?.flags || []).length > 0 && (
                    <div className="p-4 rounded-xl bg-rose-950/20 border border-rose-500/25 space-y-2">
                      <h4 className="text-xs font-bold text-rose-400 flex items-center space-x-1.5"><Flag className="w-4 h-4" /><span>Flags</span></h4>
                      <ul className="space-y-1.5">
                        {report.recruiter_verdict.flags.map((f, i) => (
                          <li key={i} className="text-xs text-rose-200/90 leading-relaxed">• {f}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <p className="text-[10px] text-gray-600 text-center">
                    AI decision-support — confirm final hiring decisions with a human interviewer.
                  </p>
                </div>
              )}

              {/* TRANSCRIPT TAB */}
              {tab === 'transcript' && (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-1">
                    <span className="text-[10px] uppercase tracking-widest text-gray-600 font-bold">
                      Full transcript • {messages.length} messages
                    </span>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => downloadFile(transcriptHtml(session), 'interview_transcript.html', 'text/html')}
                        className="flex items-center space-x-1.5 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 text-[11px] font-semibold px-3 py-1.5 rounded-lg transition"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Download HTML</span>
                      </button>
                      <button
                        onClick={() => downloadFile(transcriptMarkdown(session), 'interview_transcript.md', 'text/markdown')}
                        className="flex items-center space-x-1.5 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 text-[11px] font-semibold px-3 py-1.5 rounded-lg transition"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>Download .md</span>
                      </button>
                    </div>
                  </div>
                  {messages.map((m, i) => (
                    <Bubble key={m.id} msg={m} totalQuestions={session?.total_questions || 4} showAvatar={i === 0 || messages[i - 1]?.role !== 'ai'} />
                  ))}
                </div>
              )}

              {/* RELEASE / SEND TAB */}
              {tab === 'send' && (
                <div className="space-y-5">
                  <div className="p-5 rounded-2xl bg-gradient-to-r from-emerald-950/30 to-gray-900 border border-gray-800 space-y-1.5">
                    <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                      <Mail className="w-4 h-4 text-emerald-400" /><span>Release Interview Reports</span>
                    </h3>
                    <p className="text-xs text-gray-400 leading-relaxed">
                      Nothing leaves this room until you release it. Send the candidate their coaching feedback
                      and the recruiter the decision verdict — or download both as polished HTML.
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="text-[11px] font-bold text-gray-300 uppercase tracking-wider">Candidate email</label>
                      <input
                        type="email"
                        value={emails.candidate_email}
                        onChange={(e) => setEmails({ ...emails, candidate_email: e.target.value })}
                        placeholder="candidate@example.com"
                        className="w-full mt-1.5 bg-gray-900 border border-gray-800 rounded-xl px-3 py-2.5 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-purple-500"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-gray-300 uppercase tracking-wider">Recruiter email</label>
                      <input
                        type="email"
                        value={emails.recruiter_email}
                        onChange={(e) => setEmails({ ...emails, recruiter_email: e.target.value })}
                        placeholder="recruiter@company.com"
                        className="w-full mt-1.5 bg-gray-900 border border-gray-800 rounded-xl px-3 py-2.5 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-purple-500"
                      />
                    </div>

                    <button
                      onClick={handleSendReports}
                      disabled={sending}
                      className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-sm flex items-center justify-center space-x-2 transition disabled:opacity-50 shadow-lg shadow-emerald-600/20"
                    >
                      {sending ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                      <span>{sending ? 'Dispatching…' : 'Send Both Reports'}</span>
                    </button>

                    {sendState?.error && (
                      <div className="flex items-center space-x-2 bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs px-3 py-2.5 rounded-xl">
                        <AlertTriangle className="w-4 h-4" /><span>{sendState.error}</span>
                      </div>
                    )}

                    {sendState && !sendState.error && (
                      <div className="space-y-3">
                        <div className="flex items-start space-x-2 bg-gray-900 border border-gray-800 text-xs px-3 py-2.5 rounded-xl">
                          <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                          <div className="text-gray-300">
                            {sendState.delivery === 'email' ? (
                              <span>Delivered to: <strong className="text-white">{(sendState.sent_to || []).join(', ')}</strong></span>
                            ) : (
                              <span>{sendState.note || 'Email not configured — download the HTML drafts below.'}</span>
                            )}
                          </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <button
                            onClick={() => downloadHtml(sendState.candidate_html, 'candidate_report.html')}
                            className="flex items-center justify-center space-x-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-200 text-xs font-semibold py-2.5 rounded-xl transition"
                          >
                            <Download className="w-3.5 h-3.5" /><span>Candidate Report</span>
                          </button>
                          <button
                            onClick={() => downloadHtml(sendState.recruiter_html, 'recruiter_verdict.html')}
                            className="flex items-center justify-center space-x-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-200 text-xs font-semibold py-2.5 rounded-xl transition"
                          >
                            <Download className="w-3.5 h-3.5" /><span>Recruiter Verdict</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {/* ── End-interview confirm sheet ────────────────────────── */}
        {showEndSheet && session && (
          <div className="absolute inset-0 z-30 bg-black/80 backdrop-blur-sm flex items-center justify-center p-5">
            <div className="w-full max-w-sm rounded-2xl border border-gray-800 bg-gray-950 p-5 shadow-2xl">
              <div className="flex items-center space-x-2 mb-2">
                <Square className="w-4 h-4 text-amber-400 fill-current" />
                <h3 className="text-sm font-bold text-white">End this interview?</h3>
              </div>
              <p className="text-xs text-gray-400 mb-4">
                You've answered {answeredCount} of {session.total_questions} questions.
                {answeredCount === 0 && ' Answer at least one question to get a report.'}
              </p>

              <button
                onClick={() => handleEnd('report')}
                disabled={thinking || answeredCount < 1}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white text-xs font-bold transition disabled:opacity-40 shadow-lg shadow-purple-600/20"
              >
                End & get report
              </button>
              <p className="text-[10px] text-gray-600 mt-1 mb-3 px-0.5">
                Stop now — the AI scores the answers you've already given.
              </p>

              <button
                onClick={() => handleEnd('discard')}
                disabled={thinking}
                className="w-full py-2.5 rounded-xl bg-rose-600/90 hover:bg-rose-700 text-white text-xs font-bold transition disabled:opacity-40"
              >
                Discard interview
              </button>
              <p className="text-[10px] text-gray-600 mt-1 mb-3 px-0.5">
                Stop now — nothing is scored and no report is saved.
              </p>

              <button
                onClick={() => setShowEndSheet(false)}
                disabled={thinking}
                className="w-full py-2.5 rounded-xl bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-200 text-xs font-semibold transition"
              >
                Keep going
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
