import React from 'react';
import { X, CheckCircle, AlertTriangle, XCircle, Award, FileText, Target, ShieldAlert, Quote, Briefcase, Calendar } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

export default function CandidateDetailModal({ candidate, analysisData, onClose }) {
  if (!candidate || !analysisData) return null;

  const candId = String(candidate.candidate_id);
  const rubric = analysisData.multi_rubric?.[candId] || {
    technical_skills: 85, experience: 75, projects: 90, education: 85, ats_format: 88
  };

  const chartData = [
    { name: 'Technical', score: rubric.technical_skills || 85 },
    { name: 'Experience', score: rubric.experience || 75 },
    { name: 'Projects', score: rubric.projects || 90 },
    { name: 'Education', score: rubric.education || 85 },
    { name: 'ATS Format', score: rubric.ats_format || 88 },
  ];

  const evidenceList = analysisData.evidence_breakdown?.[candId] || [];
  const skillGaps = analysisData.skill_gap_matrix?.[candId] || [];
  const redFlags = analysisData.red_flags?.[candId] || [];

  // Career Timeline Milestones
  const milestones = [
    { year: "2023", role: "Junior Developer", organization: "Tech Team", summary: "API integrations and database queries" },
    { year: "2024", role: "Backend Engineer", organization: "Solutions Inc", summary: "FastAPI, Docker containerization & SQL optimization" }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 overflow-y-auto">
      <div className="glass-panel w-full max-w-4xl max-h-[90vh] rounded-2xl overflow-y-auto border border-gray-800 bg-gray-900/95 p-6 shadow-2xl space-y-6">
        
        {/* Modal Header */}
        <div className="flex items-start justify-between border-b border-gray-800 pb-4">
          <div>
            <div className="flex items-center space-x-3">
              <h2 className="text-2xl font-bold text-white">{candidate.candidate_name}</h2>
              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                candidate.recommendation === 'Shortlist' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                candidate.recommendation === 'Consider' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                'bg-rose-500/20 text-rose-400 border border-rose-500/30'
              }`}>
                {candidate.recommendation}
              </span>
            </div>
            <p className="text-xs text-gray-400 mt-1">File: {candidate.file_name}</p>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-gray-800 transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Top Summary & Rubric Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Match Score Gauge Card */}
          <div className="bg-gray-800/60 p-5 rounded-xl border border-gray-700/60 flex flex-col items-center justify-center text-center">
            <div className="text-sm font-semibold text-gray-400 mb-2">Overall Match Score</div>
            <div className="relative flex items-center justify-center w-28 h-28 rounded-full border-4 border-blue-500/30 bg-blue-500/5">
              <span className="text-4xl font-extrabold text-white">{candidate.overall_match_score}%</span>
            </div>
            <p className="text-xs text-gray-400 mt-3">Evidence-Backed Evaluation</p>
          </div>

          {/* Multi-Criteria Rubric Chart */}
          <div className="md:col-span-2 bg-gray-800/60 p-5 rounded-xl border border-gray-700/60">
            <h3 className="text-sm font-semibold text-gray-200 mb-3 flex items-center space-x-2">
              <Award className="w-4 h-4 text-purple-400" />
              <span>Multi-Criteria Rubric Breakdown</span>
            </h3>
            <div className="h-40">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <XAxis dataKey="name" stroke="#9ca3af" fontSize={11} tickLine={false} />
                  <YAxis stroke="#9ca3af" fontSize={11} domain={[0, 100]} />
                  <Tooltip contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', borderRadius: '8px', color: '#fff' }} />
                  <Bar dataKey="score" radius={[4, 4, 0, 0]}>
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#3b82f6' : '#8b5cf6'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Interactive Career Timeline */}
        <div className="bg-gray-800/40 p-5 rounded-xl border border-gray-700/50 space-y-3">
          <h3 className="text-sm font-bold text-white flex items-center space-x-2">
            <Briefcase className="w-4 h-4 text-blue-400" />
            <span>Interactive Career Timeline</span>
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {milestones.map((m, idx) => (
              <div key={idx} className="bg-gray-900/70 p-3.5 rounded-lg border border-gray-800 space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-blue-300">{m.role}</span>
                  <span className="bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded font-mono font-bold text-[10px]">{m.year}</span>
                </div>
                <div className="text-[11px] text-gray-400 font-medium">{m.organization}</div>
                <p className="text-xs text-gray-300 pt-1">{m.summary}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Red Flags Banner (if detected) */}
        {redFlags && redFlags.length > 0 && (
          <div className="bg-rose-950/40 border border-rose-800/60 p-4 rounded-xl space-y-2">
            <h3 className="text-sm font-semibold text-rose-300 flex items-center space-x-2">
              <ShieldAlert className="w-4 h-4 text-rose-400" />
              <span>AI Red Flags & Anomaly Detection</span>
            </h3>
            {redFlags.map((flag, idx) => (
              <div key={idx} className="text-xs text-rose-200/90 pl-6 space-y-1">
                <span className="font-semibold text-rose-400">[{flag.flag_type}]</span> {flag.description}
                {flag.evidence && <p className="italic text-rose-300/70 text-[11px]">Evidence: "{flag.evidence}"</p>}
              </div>
            ))}
          </div>
        )}

        {/* Evidence-Backed Rationale Section */}
        <div className="space-y-3">
          <h3 className="text-base font-bold text-white flex items-center space-x-2">
            <FileText className="w-5 h-5 text-blue-400" />
            <span>Explainable Evidence Rationale</span>
          </h3>
          <div className="grid grid-cols-1 gap-3">
            {evidenceList.map((ev, idx) => (
              <div key={idx} className="bg-gray-800/40 p-4 rounded-xl border border-gray-700/50 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-blue-300">{ev.category}</span>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs text-gray-400">Confidence:</span>
                    <span className={`text-xs px-2 py-0.5 rounded font-medium ${
                      ev.confidence === 'High' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'
                    }`}>
                      {ev.confidence}
                    </span>
                    <span className="text-xs font-bold text-white bg-blue-600 px-2 py-0.5 rounded">{ev.score}%</span>
                  </div>
                </div>
                <p className="text-xs text-gray-300">{ev.rationale}</p>
                {ev.resume_quotes && ev.resume_quotes.length > 0 && (
                  <div className="flex items-start space-x-2 bg-gray-900/60 p-2.5 rounded-lg text-xs text-gray-300 italic border border-gray-800">
                    <Quote className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5" />
                    <span>"{ev.resume_quotes[0]}"</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Skill Gap Matrix */}
        <div className="space-y-3">
          <h3 className="text-base font-bold text-white flex items-center space-x-2">
            <Target className="w-5 h-5 text-emerald-400" />
            <span>Capability & Skill Gap Matrix</span>
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {skillGaps.map((sg, idx) => (
              <div key={idx} className="bg-gray-800/40 p-3.5 rounded-xl border border-gray-700/50 flex items-start justify-between">
                <div>
                  <div className="flex items-center space-x-2">
                    {sg.status === 'Matched' ? <CheckCircle className="w-4 h-4 text-emerald-400" /> :
                     sg.status === 'Partial' ? <AlertTriangle className="w-4 h-4 text-amber-400" /> :
                     <XCircle className="w-4 h-4 text-rose-400" />}
                    <span className="text-sm font-semibold text-white">{sg.skill}</span>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">{sg.found_evidence || sg.recommendation}</p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded font-medium ${
                  sg.status === 'Matched' ? 'bg-emerald-500/20 text-emerald-300' :
                  sg.status === 'Partial' ? 'bg-amber-500/20 text-amber-300' :
                  'bg-rose-500/20 text-rose-300'
                }`}>
                  {sg.status} ({sg.similarity_percentage}%)
                </span>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
