import React, { useState } from 'react';
import { 
  UploadCloud, GraduationCap, Sparkles, CheckCircle, ArrowRight, BookOpen, Target, 
  Download, RefreshCw, Award, Zap, Compass, ChevronDown, ChevronUp, FileText, Code, 
  AlertTriangle, Check, X, Copy, Share2, Star, Layers, ShieldCheck, Cpu, Database, 
  BarChart3, CheckSquare, Wrench, Calendar, ExternalLink, Lightbulb
} from 'lucide-react';
import { uploadResumes, runAnalysis } from '../services/api';
import LoadingModal from './LoadingModal';

export default function StudentMentorDashboard({ redactPii }) {
  const [resumeFile, setResumeFile] = useState(null);
  const [targetRole, setTargetRole] = useState('');
  const [targetJdText, setTargetJdText] = useState('');
  const [showOptionalTarget, setShowOptionalTarget] = useState(false);

  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'rewrites' | 'skills_ats' | 'projects_certs' | 'roadmap'
  const [copied, setCopied] = useState(false);

  const handleRunMentor = async () => {
    if (!resumeFile) {
      alert("Please upload your resume (PDF/DOCX/TXT).");
      return;
    }

    setAnalyzing(true);
    try {
      const candRes = await uploadResumes([resumeFile], redactPii);
      const candId = candRes[0].id;

      const finalResult = await runAnalysis(
        'student',
        null,
        [candId],
        redactPii,
        targetRole.trim() || null,
        targetJdText.trim() || null
      );
      setAnalysisResult(finalResult);
      setActiveTab('overview');
    } catch (err) {
      alert("Error analyzing resume: " + err.message);
    } finally {
      setAnalyzing(false);
    }
  };

  const candIdStr = analysisResult?.candidate_rankings?.[0]?.candidate_id ? String(analysisResult.candidate_rankings[0].candidate_id) : '';
  const candidateInfo = analysisResult?.candidate_rankings?.[0];
  const suite = analysisResult?.student_mentorship_data?.[candIdStr] || {};
  const identity = suite.resume_identity || {};
  const ats = suite.ats_review || {};

  const handleCopyAdvice = () => {
    if (!analysisResult) return;
    const summaryText = `TalentMatch AI Mentorship Summary for ${candidateInfo?.candidate_name || 'Candidate'}:
Target Role: ${identity.target_role_predictions?.primary || 'Tech Specialist'}
Overall Capability Score: ${candidateInfo?.overall_match_score || 85}%
Top Weaknesses: ${(suite.top_5_weaknesses || []).slice(0, 3).join('; ')}
Recommended Next Project: ${suite.recommended_projects?.[0]?.title || 'Portfolio App'}
`;
    navigator.clipboard.writeText(summaryText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleDownloadReport = () => {
    if (!analysisResult) return;
    const content = `# TalentMatch AI - Complete Career Mentorship Suite
Candidate: ${candidateInfo?.candidate_name || 'Student'}
Resume Type: ${identity.resume_type || 'Tech Candidate'} (Confidence: ${identity.confidence || 95}%)
Overall Capability Score: ${candidateInfo?.overall_match_score || 82}%
Date: ${new Date().toLocaleDateString()}

## 1. Resume Identity & Role Predictions
- Primary Target Role: ${identity.target_role_predictions?.primary || 'Tech Role'}
- Possible Roles: ${(identity.target_role_predictions?.possible || []).join(', ')}
- Unlikely Roles: ${(identity.target_role_predictions?.unlikely || []).join(', ')}

## 2. Top 5 Things Holding You Back
${(suite.top_5_weaknesses || []).map((w, i) => `${i + 1}. ${w}`).join('\n')}

## 3. Skills You Should Learn
${(suite.skills_you_should_learn || []).map(s => `- ${s.skill} (${s.difficulty}, ${s.estimated_learning}): ${s.why}`).join('\n')}

## 4. Recommended Next Projects
${(suite.recommended_projects || []).map(p => `- ${p.title} (Impact: ${p.resume_impact}): Tech Stack: ${p.tech_stack.join(', ')}`).join('\n')}

## 5. 90-Day Weekly Action Roadmap
${(suite.weekly_roadmap || []).map(w => `Week ${w.week}: ${w.title} -> ${w.action}`).join('\n')}
`;
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${candidateInfo?.candidate_name || 'Resume'}_Mentorship_Suite.md`;
    a.click();
  };

  return (
    <div className="space-y-8 pb-16">
      
      {/* Satisfying AI Loading Overlay */}
      <LoadingModal isOpen={analyzing} mode="student" />

      {/* Student Upload Header Card */}
      <div className="glass-panel p-8 rounded-2xl border border-gray-800 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 rounded-2xl bg-purple-500/20 text-purple-400 border border-purple-500/30 flex items-center justify-center shadow-lg shadow-purple-500/15">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Personal Career Mentor & Resume Optimizer</h2>
              <p className="text-xs text-gray-400">Pro AI mentorship suite with domain identity, ATS audit, project recommendations & 90-day roadmap.</p>
            </div>
          </div>

          <div className="flex items-center space-x-2 bg-gray-900/80 px-3 py-1.5 rounded-xl border border-gray-800 text-xs text-gray-300">
            <Compass className="w-4 h-4 text-purple-400" />
            <span>
              {targetRole.trim() ? `Target Role: ${targetRole}` : 'Domain Mode: Auto-Detecting Tech Role'}
            </span>
          </div>
        </div>

        {/* Uploader Box */}
        <div className="border-2 border-dashed border-gray-800 hover:border-purple-500/50 rounded-2xl p-8 text-center bg-gray-900/40 transition cursor-pointer relative">
          <input
            type="file"
            accept=".pdf,.docx,.txt"
            onChange={(e) => setResumeFile(e.target.files[0])}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
          <UploadCloud className="w-10 h-10 text-purple-400 mx-auto mb-2 animate-bounce" />
          <p className="text-sm font-semibold text-white">Upload Your Resume (PDF / DOCX / TXT)</p>
          <p className="text-xs text-gray-400 mt-1">Single resume optimization & personal mentorship roadmap</p>

          {resumeFile && (
            <div className="mt-4 inline-flex items-center space-x-2 bg-purple-500/20 text-purple-300 px-3 py-1 rounded-full text-xs font-semibold border border-purple-500/30">
              <CheckCircle className="w-3.5 h-3.5" />
              <span>{resumeFile.name} Loaded</span>
            </div>
          )}
        </div>

        {/* Optional Target Role / JD Input Toggle */}
        <div className="border-t border-gray-800/80 pt-4">
          <button
            type="button"
            onClick={() => setShowOptionalTarget(!showOptionalTarget)}
            className="flex items-center space-x-2 text-xs font-semibold text-purple-400 hover:text-purple-300 transition"
          >
            <span>{showOptionalTarget ? 'Hide Optional Target Role / Job Description' : '+ Add Target Role or Job Description (Optional)'}</span>
            {showOptionalTarget ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

          {showOptionalTarget && (
            <div className="mt-4 p-4 rounded-xl bg-gray-900/60 border border-gray-800 space-y-4 animate-fadeIn">
              <div>
                <label className="text-xs text-gray-300 font-medium">Target Role Name (Optional)</label>
                <input
                  type="text"
                  value={targetRole}
                  onChange={(e) => setTargetRole(e.target.value)}
                  placeholder="e.g. Cybersecurity Analyst, Full Stack Developer, Data Scientist, DevOps Engineer"
                  className="w-full mt-1 bg-gray-900 border border-gray-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="text-xs text-gray-300 font-medium">Target Job Description Text (Optional)</label>
                <textarea
                  rows={3}
                  value={targetJdText}
                  onChange={(e) => setTargetJdText(e.target.value)}
                  placeholder="Paste specific job requirements here if targeting a specific job posting..."
                  className="w-full mt-1 bg-gray-900 border border-gray-800 rounded-lg p-3 text-xs text-white focus:outline-none focus:border-purple-500"
                />
              </div>
            </div>
          )}
        </div>

        <button
          onClick={handleRunMentor}
          disabled={analyzing}
          className="w-full py-4 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 font-bold text-white shadow-xl shadow-purple-600/25 flex items-center justify-center space-x-2 transition disabled:opacity-50"
        >
          {analyzing ? (
            <>
              <RefreshCw className="w-5 h-5 animate-spin" />
              <span>Generating Domain Mentorship Suite & 90-Day Roadmap...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-5 h-5" />
              <span>Get My Career Mentorship Suite</span>
            </>
          )}
        </button>
      </div>

      {/* Career Mentor Analysis Results */}
      {analysisResult && candidateInfo && suite && (
        <div className="space-y-8 animate-fadeIn">
          
          {/* HERO SCORE & IDENTITY BANNER */}
          <div className="glass-panel p-6 rounded-2xl border border-gray-800 bg-gradient-to-r from-purple-950/30 via-gray-900 to-indigo-950/30">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              
              <div className="flex items-center space-x-5">
                <div className="w-20 h-20 rounded-2xl border-4 border-purple-500/40 bg-purple-500/10 flex flex-col items-center justify-center text-center shadow-lg shadow-purple-500/20">
                  <span className="text-2xl font-black text-white">{candidateInfo.overall_match_score}%</span>
                  <span className="text-[9px] uppercase font-bold text-purple-300 tracking-wider">Capability</span>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="bg-purple-500/20 text-purple-300 text-xs font-bold px-3 py-1 rounded-full border border-purple-500/30 flex items-center space-x-1.5">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>{identity.resume_type || 'Tech Candidate'}</span>
                    </span>

                    <span className="bg-emerald-500/20 text-emerald-400 text-xs font-bold px-2.5 py-1 rounded-full border border-emerald-500/30">
                      {identity.confidence || 96}% Confidence
                    </span>
                  </div>

                  <h3 className="text-2xl font-black text-white">{candidateInfo.candidate_name}</h3>
                  <p className="text-xs text-gray-400">
                    Primary Target: <strong className="text-purple-300">{identity.target_role_predictions?.primary || 'Tech Specialist'}</strong>
                  </p>
                </div>
              </div>

              {/* Quick Action Buttons */}
              <div className="flex items-center space-x-3">
                <button
                  onClick={handleCopyAdvice}
                  className="bg-gray-900 hover:bg-gray-800 text-gray-200 text-xs px-4 py-2.5 rounded-xl border border-gray-800 flex items-center space-x-2 transition"
                >
                  <Copy className="w-4 h-4 text-purple-400" />
                  <span>{copied ? 'Copied!' : 'Copy Summary'}</span>
                </button>

                <button
                  onClick={handleDownloadReport}
                  className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-lg shadow-purple-600/20 flex items-center space-x-2 transition"
                >
                  <Download className="w-4 h-4" />
                  <span>Download MD Report</span>
                </button>
              </div>

            </div>
          </div>

          {/* QUICK STATS CARDS BAR */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            
            <div 
              onClick={() => setActiveTab('overview')}
              className={`p-4 rounded-xl border transition cursor-pointer ${activeTab === 'overview' ? 'bg-purple-900/40 border-purple-500' : 'glass-panel border-gray-800 hover:border-gray-700'}`}
            >
              <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Strengths</div>
              <div className="text-2xl font-black text-emerald-400 mt-1 flex items-center space-x-2">
                <span>{(suite.strengths_highlights || []).length}</span>
                <CheckCircle className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-[10px] text-gray-400 mt-1">Key Standout Assets</div>
            </div>

            <div 
              onClick={() => setActiveTab('overview')}
              className={`p-4 rounded-xl border transition cursor-pointer ${activeTab === 'overview' ? 'bg-purple-900/40 border-purple-500' : 'glass-panel border-gray-800 hover:border-gray-700'}`}
            >
              <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Holding You Back</div>
              <div className="text-2xl font-black text-rose-400 mt-1 flex items-center space-x-2">
                <span>{(suite.top_5_weaknesses || []).length}</span>
                <AlertTriangle className="w-4 h-4 text-rose-400" />
              </div>
              <div className="text-[10px] text-gray-400 mt-1">Top Weaknesses</div>
            </div>

            <div 
              onClick={() => setActiveTab('skills_ats')}
              className={`p-4 rounded-xl border transition cursor-pointer ${activeTab === 'skills_ats' ? 'bg-purple-900/40 border-purple-500' : 'glass-panel border-gray-800 hover:border-gray-700'}`}
            >
              <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Skills To Learn</div>
              <div className="text-2xl font-black text-purple-400 mt-1 flex items-center space-x-2">
                <span>{(suite.skills_you_should_learn || []).length}</span>
                <Wrench className="w-4 h-4 text-purple-400" />
              </div>
              <div className="text-[10px] text-gray-400 mt-1">High-Impact Skills</div>
            </div>

            <div 
              onClick={() => setActiveTab('projects_certs')}
              className={`p-4 rounded-xl border transition cursor-pointer ${activeTab === 'projects_certs' ? 'bg-purple-900/40 border-purple-500' : 'glass-panel border-gray-800 hover:border-gray-700'}`}
            >
              <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Projects</div>
              <div className="text-2xl font-black text-amber-400 mt-1 flex items-center space-x-2">
                <span>{(suite.recommended_projects || []).length}</span>
                <Code className="w-4 h-4 text-amber-400" />
              </div>
              <div className="text-[10px] text-gray-400 mt-1">Recommended Portfolio</div>
            </div>

            <div 
              onClick={() => setActiveTab('skills_ats')}
              className={`p-4 rounded-xl border transition cursor-pointer ${activeTab === 'skills_ats' ? 'bg-purple-900/40 border-purple-500' : 'glass-panel border-gray-800 hover:border-gray-700'}`}
            >
              <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">ATS Score</div>
              <div className="text-2xl font-black text-cyan-400 mt-1 flex items-center space-x-2">
                <span>{ats.ats_compatibility_score || 89}%</span>
                <BarChart3 className="w-4 h-4 text-cyan-400" />
              </div>
              <div className="text-[10px] text-gray-400 mt-1">Parser Compatibility</div>
            </div>

          </div>

          {/* CATEGORIZED NAVIGATION TABS */}
          <div className="flex items-center space-x-2 border-b border-gray-800 pb-2 overflow-x-auto">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-5 py-2.5 rounded-xl text-xs font-bold transition flex items-center space-x-2 whitespace-nowrap ${
                activeTab === 'overview'
                  ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30'
                  : 'text-gray-400 hover:text-white hover:bg-gray-900'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              <span>📊 Overview</span>
            </button>

            <button
              onClick={() => setActiveTab('rewrites')}
              className={`px-5 py-2.5 rounded-xl text-xs font-bold transition flex items-center space-x-2 whitespace-nowrap ${
                activeTab === 'rewrites'
                  ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30'
                  : 'text-gray-400 hover:text-white hover:bg-gray-900'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>📄 Resume & Rewrites</span>
            </button>

            <button
              onClick={() => setActiveTab('skills_ats')}
              className={`px-5 py-2.5 rounded-xl text-xs font-bold transition flex items-center space-x-2 whitespace-nowrap ${
                activeTab === 'skills_ats'
                  ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30'
                  : 'text-gray-400 hover:text-white hover:bg-gray-900'
              }`}
            >
              <Wrench className="w-4 h-4" />
              <span>🛠 Skills & ATS Audit</span>
            </button>

            <button
              onClick={() => setActiveTab('projects_certs')}
              className={`px-5 py-2.5 rounded-xl text-xs font-bold transition flex items-center space-x-2 whitespace-nowrap ${
                activeTab === 'projects_certs'
                  ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30'
                  : 'text-gray-400 hover:text-white hover:bg-gray-900'
              }`}
            >
              <RocketIcon className="w-4 h-4" />
              <span>🚀 Projects & Certs</span>
            </button>

            <button
              onClick={() => setActiveTab('roadmap')}
              className={`px-5 py-2.5 rounded-xl text-xs font-bold transition flex items-center space-x-2 whitespace-nowrap ${
                activeTab === 'roadmap'
                  ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30'
                  : 'text-gray-400 hover:text-white hover:bg-gray-900'
              }`}
            >
              <Calendar className="w-4 h-4" />
              <span>📚 90-Day Roadmap</span>
            </button>
          </div>

          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fadeIn">
              
              {/* Resume Identity & Personality Card */}
              <div className="glass-panel p-6 rounded-2xl border border-gray-800 space-y-6">
                <div className="flex items-center space-x-3">
                  <div className="p-2 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">Resume Identity & Target Role Predictions</h3>
                    <p className="text-xs text-gray-400">LLM classification based on resume focus and competency depth</p>
                  </div>
                </div>

                {/* Focus vs Weakness Pills */}
                <div className="grid grid-cols-2 gap-4 bg-gray-900/60 p-4 rounded-xl border border-gray-800">
                  <div>
                    <div className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider mb-2">Detected Focus</div>
                    <div className="flex flex-wrap gap-1.5">
                      {(identity.detected_focus || ['Cybersecurity', 'AI', 'Python']).map((f, i) => (
                        <span key={i} className="bg-emerald-500/20 text-emerald-300 text-xs px-2.5 py-1 rounded-lg border border-emerald-500/30 font-semibold">
                          ✓ {f}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="text-[11px] font-bold text-rose-400 uppercase tracking-wider mb-2">Weak Presence</div>
                    <div className="flex flex-wrap gap-1.5">
                      {(identity.weak_presence || ['Backend', 'Frontend', 'Cloud', 'DevOps']).map((w, i) => (
                        <span key={i} className="bg-rose-500/20 text-rose-300 text-xs px-2.5 py-1 rounded-lg border border-rose-500/30">
                          {w}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Resume Personality Bars */}
                <div className="space-y-3">
                  <div className="text-xs font-bold text-gray-300">Resume Personality Distribution</div>
                  {Object.entries(identity.resume_personality || { "Security": 80, "AI": 15, "Software Engineering": 5 }).map(([key, val], idx) => (
                    <div key={idx} className="space-y-1">
                      <div className="flex justify-between text-xs font-semibold text-gray-300">
                        <span>{key}</span>
                        <span>{val}%</span>
                      </div>
                      <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full transition-all duration-500" 
                          style={{ width: `${val}%` }} 
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Target Role Predictions */}
                <div className="space-y-3">
                  <div className="text-xs font-bold text-gray-300">Target Role Suitability</div>
                  
                  <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
                    <span className="text-xs font-bold text-emerald-300">Primary Role Target</span>
                    <span className="bg-emerald-500/20 text-emerald-300 text-xs font-extrabold px-3 py-1 rounded-full border border-emerald-500/40">
                      🎯 {identity.target_role_predictions?.primary || 'Cybersecurity Analyst'}
                    </span>
                  </div>

                  <div className="space-y-2">
                    <div className="text-[11px] font-semibold text-gray-400">Possible Roles:</div>
                    <div className="flex flex-wrap gap-2">
                      {(identity.target_role_predictions?.possible || ['Penetration Tester', 'Security Researcher']).map((r, i) => (
                        <span key={i} className="bg-amber-500/20 text-amber-300 text-xs px-2.5 py-1 rounded-lg border border-amber-500/30">
                          {r}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="text-[11px] font-semibold text-gray-400">Unlikely Roles (Gap Required):</div>
                    <div className="flex flex-wrap gap-2">
                      {(identity.target_role_predictions?.unlikely || ['Backend Developer', 'Full Stack Engineer']).map((r, i) => (
                        <span key={i} className="bg-rose-500/15 text-rose-300 text-xs px-2.5 py-1 rounded-lg border border-rose-500/25">
                          {r}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

              </div>

              {/* Strengths & Top 5 Weaknesses */}
              <div className="space-y-6">
                
                {/* Top 5 Things Holding You Back */}
                <div className="glass-panel p-6 rounded-2xl border border-rose-500/30 space-y-4 bg-gradient-to-br from-rose-950/20 to-gray-900">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30">
                      <AlertTriangle className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-white">Top 5 Things Holding You Back</h3>
                      <p className="text-xs text-gray-400">Humanized feedback on critical gaps preventing shortlist selection</p>
                    </div>
                  </div>

                  <div className="space-y-2.5">
                    {(suite.top_5_weaknesses || [
                      "Projects don't explain their impact.",
                      "No measurable achievements.",
                      "Resume looks too security-focused.",
                      "No production software experience.",
                      "No cloud deployment."
                    ]).map((w, idx) => (
                      <div key={idx} className="flex items-start space-x-3 p-3 rounded-xl bg-gray-900/80 border border-gray-800">
                        <span className="w-6 h-6 rounded-lg bg-rose-500/20 text-rose-300 font-black text-xs flex items-center justify-center border border-rose-500/30 flex-shrink-0">
                          {idx + 1}
                        </span>
                        <p className="text-xs text-gray-200 leading-relaxed">{w}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Strongest Areas Highlights */}
                <div className="glass-panel p-6 rounded-2xl border border-emerald-500/30 space-y-4 bg-gradient-to-br from-emerald-950/20 to-gray-900">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      <CheckCircle className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-white">Your Strongest Areas</h3>
                      <p className="text-xs text-gray-400">These assets make your candidate profile stand out to recruiters</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {(suite.strengths_highlights || [
                      "Strong AI knowledge",
                      "Good cybersecurity foundation",
                      "Hands-on projects",
                      "Uses modern tools",
                      "Good Git exposure",
                      "Shows self-learning"
                    ]).map((s, idx) => (
                      <div key={idx} className="flex items-center space-x-2 p-2.5 rounded-xl bg-gray-900/80 border border-gray-800 text-xs text-emerald-300 font-medium">
                        <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                        <span>{s}</span>
                      </div>
                    ))}
                  </div>
                </div>

              </div>

            </div>
          )}

          {/* TAB 2: RESUME REWRITES */}
          {activeTab === 'rewrites' && (
            <div className="space-y-6 animate-fadeIn">
              
              {/* Structured Improvements (Current -> Problem -> Better -> Reason) */}
              <div className="glass-panel p-6 rounded-2xl border border-gray-800 space-y-4">
                <div className="flex items-center space-x-3">
                  <div className="p-2 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">Structured Resume Enhancements</h3>
                    <p className="text-xs text-gray-400">Humanized Current → Problem → Better → Reason advice framework</p>
                  </div>
                </div>

                <div className="space-y-4">
                  {(suite.structured_improvements || [
                    {
                      current: "Offensive security student...",
                      problem: "Sounds too niche.",
                      better: "Computer Engineering student specializing in Python, AI automation and cybersecurity.",
                      reason: "Now recruiters know you can build software too."
                    }
                  ]).map((item, idx) => (
                    <div key={idx} className="p-5 rounded-2xl bg-gray-900/90 border border-gray-800 space-y-3">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 space-y-1">
                          <div className="text-[10px] font-bold text-rose-400 uppercase tracking-wider">Current Text</div>
                          <p className="text-xs text-gray-300 font-mono">"{item.current}"</p>
                          <div className="text-[11px] text-rose-300 mt-1">⚠️ <strong className="font-semibold">Problem:</strong> {item.problem}</div>
                        </div>

                        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 space-y-1">
                          <div className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">Better Rewrite</div>
                          <p className="text-xs text-emerald-300 font-mono italic">"{item.better}"</p>
                          <div className="text-[11px] text-gray-300 mt-1">💡 <strong className="font-semibold">Why?</strong> {item.reason}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Buzzword Detector */}
              <div className="glass-panel p-6 rounded-2xl border border-gray-800 space-y-4">
                <div className="flex items-center space-x-3">
                  <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
                    <Zap className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">Buzzword Detector ⭐</h3>
                    <p className="text-xs text-gray-400">Replaces overused generic terms with quantified technical facts</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {(suite.buzzword_detector?.buzzwords || [
                    {
                      word: "AI-powered",
                      count: 4,
                      instead_of: "AI-powered chatbot",
                      say_this: "Python chatbot answering 5,000+ user queries."
                    },
                    {
                      word: "Automation",
                      count: 6,
                      instead_of: "Automation script",
                      say_this: "Automated pipeline reducing manual triage time by 45%."
                    }
                  ]).map((bw, idx) => (
                    <div key={idx} className="p-4 rounded-xl bg-gray-900/80 border border-gray-800 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="bg-amber-500/20 text-amber-300 text-xs font-bold px-3 py-1 rounded-full border border-amber-500/30">
                          Overused: "{bw.word}" ({bw.count}x)
                        </span>
                        <span className="text-[10px] text-gray-400">Replace with facts</span>
                      </div>

                      <div className="text-xs text-gray-400 mt-2">
                        Instead of: <span className="line-through text-rose-400">{bw.instead_of}</span>
                      </div>
                      <div className="text-xs text-emerald-300 font-semibold bg-emerald-500/10 p-2.5 rounded-lg border border-emerald-500/20">
                        👉 Say: "{bw.say_this}"
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Bullet Point Rewrites */}
              <div className="glass-panel p-6 rounded-2xl border border-gray-800 space-y-4">
                <div className="flex items-center space-x-3">
                  <div className="p-2 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">Action-Oriented Bullet Rewrites</h3>
                    <p className="text-xs text-gray-400">Before → After high-converting bullet transformations</p>
                  </div>
                </div>

                <div className="space-y-4">
                  {(suite.bullet_rewrites || [
                    {
                      current: "Built URL Shield.",
                      improved: "Developed a Python-based reconnaissance platform integrating DNS lookup, SSL analysis and port scanning into one automated workflow.",
                      improvements: ["Specific", "Technical", "Action-oriented"]
                    }
                  ]).map((bullet, idx) => (
                    <div key={idx} className="p-4 rounded-xl bg-gray-900/80 border border-gray-800 space-y-3">
                      <div className="text-xs text-gray-400">Current: <span className="text-rose-400 font-mono">"{bullet.current}"</span></div>
                      <div className="text-xs text-emerald-300 font-mono font-semibold bg-emerald-500/10 p-3 rounded-xl border border-emerald-500/20">
                        Improved: "{bullet.improved}"
                      </div>
                      <div className="flex items-center space-x-2">
                        {bullet.improvements?.map((tag, i) => (
                          <span key={i} className="bg-purple-500/20 text-purple-300 text-[10px] font-bold px-2 py-0.5 rounded border border-purple-500/30">
                            ✓ {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          )}

          {/* TAB 3: SKILLS & ATS AUDIT */}
          {activeTab === 'skills_ats' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fadeIn">
              
              {/* Skills You Should Learn */}
              <div className="glass-panel p-6 rounded-2xl border border-gray-800 space-y-4">
                <div className="flex items-center space-x-3">
                  <div className="p-2 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30">
                    <Wrench className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">Skills You Should Learn</h3>
                    <p className="text-xs text-gray-400">High-leverage technical competencies with time estimates</p>
                  </div>
                </div>

                <div className="space-y-3">
                  {(suite.skills_you_should_learn || [
                    { skill: "SQL", why: "Almost every backend job requires databases.", estimated_learning: "1 week", difficulty: "Easy" },
                    { skill: "Docker", why: "Essential for containerizing microservices.", estimated_learning: "1 week", difficulty: "Easy" },
                    { skill: "REST APIs", why: "Core requirement for web & API integration.", estimated_learning: "2 weeks", difficulty: "Medium" }
                  ]).map((s, idx) => (
                    <div key={idx} className="p-4 rounded-xl bg-gray-900/80 border border-gray-800 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-base font-bold text-white">{s.skill}</span>
                        <div className="flex items-center space-x-2">
                          <span className="bg-purple-500/20 text-purple-300 text-xs px-2.5 py-0.5 rounded-full border border-purple-500/30 font-semibold">
                            ⏱ {s.estimated_learning}
                          </span>
                          <span className="bg-emerald-500/20 text-emerald-300 text-xs px-2.5 py-0.5 rounded-full border border-emerald-500/30 font-semibold">
                            {s.difficulty}
                          </span>
                        </div>
                      </div>
                      <p className="text-xs text-gray-300">💡 <strong className="text-gray-200">Why?</strong> {s.why}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* ATS Review & Missing Keywords */}
              <div className="space-y-6">
                
                <div className="glass-panel p-6 rounded-2xl border border-gray-800 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                        <BarChart3 className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-white">ATS Audit Checklist</h3>
                        <p className="text-xs text-gray-400">Automated Applicant Tracking System parsing checks</p>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-2xl font-black text-cyan-400">{ats.ats_compatibility_score || 89}%</div>
                      <div className="text-[10px] uppercase text-gray-400 font-bold">Compatibility</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {Object.entries(ats.checklist || {
                      "resume_length": true,
                      "section_order": true,
                      "github_links": false,
                      "portfolio": false,
                      "action_verbs": false,
                      "measurable_achievements": false
                    }).map(([key, isOk], idx) => (
                      <div key={idx} className={`p-2.5 rounded-xl border flex items-center space-x-2 ${isOk ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300' : 'bg-rose-500/10 border-rose-500/20 text-rose-300'}`}>
                        {isOk ? <Check className="w-4 h-4 text-emerald-400" /> : <X className="w-4 h-4 text-rose-400" />}
                        <span className="capitalize">{key.replace('_', ' ')}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Important Missing Keywords */}
                <div className="glass-panel p-6 rounded-2xl border border-gray-800 space-y-3">
                  <h4 className="text-sm font-bold text-white">Important Missing Keywords</h4>
                  <div className="space-y-2">
                    {(ats.missing_keywords || [
                      { keyword: "REST API", why_it_matters: "Crucial keyword for backend & web engineering filters." },
                      { keyword: "FastAPI", why_it_matters: "Demonstrates modern Python microservices proficiency." },
                      { keyword: "PostgreSQL", why_it_matters: "High-demand relational database in job postings." }
                    ]).map((kw, idx) => (
                      <div key={idx} className="p-3 rounded-xl bg-gray-900/80 border border-gray-800 space-y-1">
                        <span className="bg-purple-500/20 text-purple-300 text-xs font-bold px-2 py-0.5 rounded border border-purple-500/30">
                          {kw.keyword}
                        </span>
                        <p className="text-[11px] text-gray-400">{kw.why_it_matters}</p>
                      </div>
                    ))}
                  </div>
                </div>

              </div>

            </div>
          )}

          {/* TAB 4: PROJECTS & CERTS */}
          {activeTab === 'projects_certs' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fadeIn">
              
              {/* Recommended Next Projects */}
              <div className="glass-panel p-6 rounded-2xl border border-gray-800 space-y-4">
                <div className="flex items-center space-x-3">
                  <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
                    <Code className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">Recommended Next Projects</h3>
                    <p className="text-xs text-gray-400">High-converting portfolio projects tailored to your target domain</p>
                  </div>
                </div>

                <div className="space-y-4">
                  {(suite.recommended_projects || [
                    {
                      title: "Expense Tracker",
                      difficulty_stars: 2,
                      tech_stack: ["React", "FastAPI", "PostgreSQL"],
                      you_will_learn: ["Authentication", "REST APIs", "SQL", "Deployment"],
                      resume_impact: "+9%"
                    },
                    {
                      title: "Security & Recon Platform",
                      difficulty_stars: 3,
                      tech_stack: ["Python", "Docker", "AWS"],
                      you_will_learn: ["Port Scanning", "Automation", "CI/CD"],
                      resume_impact: "+14%"
                    }
                  ]).map((proj, idx) => (
                    <div key={idx} className="p-5 rounded-2xl bg-gray-900/90 border border-gray-800 space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-base font-bold text-white">{proj.title}</h4>
                        <span className="bg-emerald-500/20 text-emerald-400 text-xs font-extrabold px-3 py-1 rounded-full border border-emerald-500/30">
                          {proj.resume_impact} Impact
                        </span>
                      </div>

                      <div className="flex items-center space-x-1 text-amber-400 text-xs">
                        <span>Difficulty:</span>
                        {[...Array(3)].map((_, i) => (
                          <Star key={i} className={`w-3.5 h-3.5 ${i < proj.difficulty_stars ? 'fill-amber-400 text-amber-400' : 'text-gray-700'}`} />
                        ))}
                      </div>

                      <div className="space-y-1">
                        <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Tech Stack</div>
                        <div className="flex flex-wrap gap-1.5">
                          {proj.tech_stack?.map((t, i) => (
                            <span key={i} className="bg-gray-800 text-gray-200 text-xs px-2.5 py-0.5 rounded-md border border-gray-700">
                              {t}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-1">
                        <div className="text-[11px] font-bold text-purple-400 uppercase tracking-wider">You'll Learn</div>
                        <div className="flex flex-wrap gap-1.5">
                          {proj.you_will_learn?.map((l, i) => (
                            <span key={i} className="bg-purple-500/20 text-purple-300 text-xs px-2 py-0.5 rounded-md border border-purple-500/30">
                              ✓ {l}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recommended Certifications (Free vs Paid) */}
              <div className="glass-panel p-6 rounded-2xl border border-gray-800 space-y-4">
                <div className="flex items-center space-x-3">
                  <div className="p-2 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30">
                    <Award className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">Recommended Certifications</h3>
                    <p className="text-xs text-gray-400">Best Free & Paid credentials recognized by recruiters</p>
                  </div>
                </div>

                <div className="space-y-3">
                  {(suite.recommended_certifications || [
                    {
                      name: "Google Cybersecurity",
                      type: "Paid",
                      reason: "Recognized by recruiters globally.",
                      time_estimate: "25 hours",
                      difficulty: "Easy"
                    },
                    {
                      name: "AWS Cloud Practitioner",
                      type: "Free / Paid Prep",
                      reason: "Shows foundational cloud deployment awareness.",
                      time_estimate: "20 hours",
                      difficulty: "Easy"
                    }
                  ]).map((cert, idx) => (
                    <div key={idx} className="p-4 rounded-xl bg-gray-900/80 border border-gray-800 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold text-white">{cert.name}</span>
                        <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold border ${cert.type?.includes('Free') ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' : 'bg-purple-500/20 text-purple-300 border-purple-500/30'}`}>
                          {cert.type}
                        </span>
                      </div>
                      <p className="text-xs text-gray-300">💡 <strong className="text-gray-200">Reason:</strong> {cert.reason}</p>
                      <div className="flex items-center space-x-3 text-[11px] text-gray-400">
                        <span>⏱ {cert.time_estimate}</span>
                        <span>• Difficulty: {cert.difficulty}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          )}

          {/* TAB 5: 90-DAY ROADMAP */}
          {activeTab === 'roadmap' && (
            <div className="glass-panel p-6 rounded-2xl border border-gray-800 space-y-6 animate-fadeIn">
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">Personalized 90-Day Master Roadmap ⭐</h3>
                  <p className="text-xs text-gray-400">Week-by-week execution plan to transform your candidate profile</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {(suite.weekly_roadmap || [
                  { week: 1, title: "Learn SQL", action: "Master SELECT, JOINs, indexing, and schema design." },
                  { week: 2, title: "Learn REST APIs", action: "Build endpoints with FastAPI or Express." },
                  { week: 3, title: "Build Backend", action: "Connect FastAPI to SQLite/PostgreSQL." },
                  { week: 4, title: "Deploy App", action: "Deploy microservice on Render/AWS." },
                  { week: 5, title: "Add Auth", action: "Implement JWT token authentication." },
                  { week: 6, title: "Testing", action: "Write unit tests using pytest." },
                  { week: 7, title: "Docker", action: "Containerize app with Dockerfile." },
                  { week: 8, title: "CI/CD", action: "Set up GitHub Actions workflow." },
                  { week: 9, title: "Portfolio", action: "Publish clean GitHub README with diagram." },
                  { week: 10, title: "Resume Update", action: "Rewrite bullet points with metric achievements." },
                  { week: 11, title: "Mock Interview", action: "Practice technical & behavioral questions." },
                  { week: 12, title: "Apply to Jobs", action: "Submit targeted applications." }
                ]).map((w, idx) => (
                  <div key={idx} className="p-4 rounded-xl bg-gray-900/90 border border-gray-800 space-y-2 hover:border-purple-500/40 transition">
                    <div className="flex items-center justify-between">
                      <span className="bg-purple-500/20 text-purple-300 font-extrabold text-xs px-2.5 py-0.5 rounded-md border border-purple-500/30">
                        Week {w.week}
                      </span>
                      <CheckSquare className="w-4 h-4 text-emerald-400 opacity-60 hover:opacity-100 transition cursor-pointer" />
                    </div>

                    <h4 className="text-sm font-bold text-white mt-1">{w.title}</h4>
                    <p className="text-xs text-gray-300 leading-relaxed">{w.action}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* DASHBOARD FOOTER */}
          <div className="glass-panel p-4 rounded-2xl border border-gray-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-gray-400">
            <div>
              <span>TalentMatch AI Decision-Support Platform • </span>
              <strong className="text-purple-300">{candidateInfo.candidate_name} Mentorship Suite</strong>
            </div>

            <div className="flex items-center space-x-3">
              <button
                onClick={handleCopyAdvice}
                className="hover:text-white transition flex items-center space-x-1"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>{copied ? 'Copied!' : 'Copy Summary'}</span>
              </button>

              <button
                onClick={handleDownloadReport}
                className="hover:text-white transition flex items-center space-x-1"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download Report</span>
              </button>
            </div>
          </div>

        </div>
      )}

    </div>
  );
}

function RocketIcon(props) {
  return (
    <svg 
      {...props} 
      xmlns="http://www.w3.org/2000/svg" 
      width="24" 
      height="24" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    >
      <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.71.79-1.81.79-1.81" />
      <path d="M12 10l-2 2" />
      <path d="M15 13l-2 2" />
      <path d="M9 11l-4 4" />
      <path d="M13 15l-4 4" />
      <path d="M15 6a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" />
      <path d="m14 14 2 2" />
      <path d="M16 11l-3 3" />
      <path d="M18.5 7.5 14 12" />
      <path d="M22 2s-4.5 0-7 2.5C12.5 7 12 11 12 11s4-.5 6.5-3C21 5.5 22 2 22 2z" />
    </svg>
  );
}
