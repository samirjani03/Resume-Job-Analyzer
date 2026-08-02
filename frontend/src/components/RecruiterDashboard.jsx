import React, { useState } from 'react';
import { UploadCloud, FileText, Search, Users, CheckCircle, AlertTriangle, XCircle, Award, ArrowUpRight, Columns, RefreshCw, Sparkles, Download } from 'lucide-react';
import { uploadJobDescription, uploadResumes, runAnalysis, searchCandidates } from '../services/api';
import LoadingModal from './LoadingModal';

export default function RecruiterDashboard({ redactPii, onSelectCandidate, onSelectCompare }) {
  const [jobTitle, setJobTitle] = useState('Backend Python Developer');
  const [jobCompany, setJobCompany] = useState('');
  const [jobText, setJobText] = useState(`Job Role: Backend Python Developer
Requirements:
- Python
- FastAPI
- SQL
- REST APIs
- Docker
- Git
- Linux
Experience: 1-3 Years
Education: Bachelor's Degree in Computer Engineering or related field`);
  
  const [jobFile, setJobFile] = useState(null);
  const [resumeFiles, setResumeFiles] = useState([]);
  
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchResults, setSearchResults] = useState(null);

  const handleRunScreening = async () => {
    if (!jobText && !jobFile) {
      alert("Please enter a Job Description or upload a JD file.");
      return;
    }
    if (resumeFiles.length === 0) {
      alert("Please upload at least one candidate resume (PDF/DOCX/TXT).");
      return;
    }

    setAnalyzing(true);
    try {
      const jobRes = await uploadJobDescription(jobTitle, jobCompany, jobText, jobFile);
      const candRes = await uploadResumes(resumeFiles, redactPii);
      const candIds = candRes.map(c => c.id);

      const finalResult = await runAnalysis('recruiter', jobRes.id, candIds, redactPii);
      setAnalysisResult(finalResult);
    } catch (err) {
      alert("Error executing screening: " + err.message);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setSearchLoading(true);
    try {
      const res = await searchCandidates(searchQuery);
      setSearchResults(res);
    } catch (err) {
      alert("Search failed: " + err.message);
    } finally {
      setSearchLoading(false);
    }
  };

  const handleExportCSV = () => {
    if (!analysisResult || !analysisResult.candidate_rankings) return;

    const headers = ["Rank", "Candidate Name", "File Name", "Match Score (%)", "Recommendation", "Key Strengths", "Key Gaps"];
    const rows = analysisResult.candidate_rankings.map((c, i) => [
      i + 1,
      `"${c.candidate_name}"`,
      `"${c.file_name}"`,
      c.overall_match_score,
      `"${c.recommendation}"`,
      `"${(c.key_strengths || []).join('; ')}"`,
      `"${(c.key_gaps || []).join('; ')}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Recruiter_Candidate_Rankings_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const rankings = analysisResult?.candidate_rankings || [];
  const totalCandidates = rankings.length;
  const shortlisted = rankings.filter(c => c.recommendation === 'Shortlist').length;
  const consider = rankings.filter(c => c.recommendation === 'Consider').length;
  const notRecommended = rankings.filter(c => c.recommendation === 'Not Recommended').length;

  return (
    <div className="space-y-8 pb-12">
      
      {/* Satisfying AI Loading Overlay */}
      <LoadingModal isOpen={analyzing} mode="recruiter" />

      {/* Top Banner & NL Search */}
      <div className="glass-panel p-6 rounded-2xl border border-gray-800 flex flex-col lg:flex-row items-center justify-between gap-6">
        <div>
          <h2 className="text-2xl font-bold text-white">Recruiter Screening Dashboard</h2>
          <p className="text-xs text-gray-400">Batch rank candidates with multi-criteria rubric scoring & evidence quotes</p>
        </div>

        {/* Search Bar */}
        <form onSubmit={handleSearch} className="flex items-center w-full lg:w-96 bg-gray-900/80 rounded-xl p-1.5 border border-gray-800 focus-within:border-purple-500 transition">
          <Search className="w-4 h-4 text-gray-400 ml-2.5" />
          <input
            type="text"
            placeholder="Search candidates by skill (e.g. 'FastAPI 2+ yrs')..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-transparent px-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none"
          />
          <button
            type="submit"
            disabled={searchLoading}
            className="bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition flex items-center space-x-1"
          >
            {searchLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <span>Search</span>}
          </button>
        </form>
      </div>

      {/* Natural Language Search Results Banner */}
      {searchResults && (
        <div className="glass-panel p-6 rounded-2xl border border-purple-500/40 bg-purple-950/20 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-purple-300 flex items-center space-x-2">
              <Sparkles className="w-4 h-4 text-purple-400" />
              <span>Semantic Search Results for: "{searchResults.query}"</span>
            </h3>
            <button
              onClick={() => setSearchResults(null)}
              className="text-xs text-gray-400 hover:text-white"
            >
              Clear
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {searchResults.results.map((res, i) => (
              <div key={i} className="p-4 rounded-xl bg-gray-900/80 border border-gray-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white">{res.metadata?.candidate_name || `Candidate #${res.candidate_id}`}</span>
                  <span className="bg-purple-500/20 text-purple-300 text-[10px] font-bold px-2 py-0.5 rounded border border-purple-500/30">
                    {res.similarity_score}% Vector Match
                  </span>
                </div>
                <p className="text-[11px] text-gray-400 line-clamp-3 font-mono">{res.matching_snippet}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Input Section: JD & Resumes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Job Description Box */}
        <div className="glass-panel p-6 rounded-2xl border border-gray-800 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-white flex items-center space-x-2">
              <FileText className="w-5 h-5 text-purple-400" />
              <span>Target Job Description</span>
            </h3>
            <span className="text-xs text-gray-400">Step 1 of 2</span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <input
              type="text"
              placeholder="Job Title (e.g. Backend Developer)"
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
              className="bg-gray-900 border border-gray-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
            />
            <input
              type="text"
              placeholder="Company Name (Optional)"
              value={jobCompany}
              onChange={(e) => setJobCompany(e.target.value)}
              className="bg-gray-900 border border-gray-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
            />
          </div>

          <textarea
            rows={7}
            placeholder="Paste Job Description requirements, qualifications, and experience here..."
            value={jobText}
            onChange={(e) => setJobText(e.target.value)}
            className="w-full bg-gray-900 border border-gray-800 rounded-xl p-3 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 font-mono leading-relaxed"
          />

          <div className="flex items-center justify-between text-xs text-gray-400 pt-1">
            <span>Or upload JD document:</span>
            <input
              type="file"
              accept=".pdf,.docx,.txt"
              onChange={(e) => setJobFile(e.target.files[0])}
              className="text-xs text-gray-400 file:mr-2 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-xs file:bg-gray-800 file:text-purple-300 hover:file:bg-gray-700 cursor-pointer"
            />
          </div>
        </div>

        {/* Resumes Uploader Box */}
        <div className="glass-panel p-6 rounded-2xl border border-gray-800 space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-white flex items-center space-x-2">
                <Users className="w-5 h-5 text-purple-400" />
                <span>Upload Candidate Resumes (Batch)</span>
              </h3>
              <span className="text-xs text-gray-400">Step 2 of 2</span>
            </div>

            <div className="border-2 border-dashed border-gray-800 hover:border-purple-500/50 rounded-2xl p-6 text-center bg-gray-900/40 transition cursor-pointer relative">
              <input
                type="file"
                multiple
                accept=".pdf,.docx,.txt"
                onChange={(e) => setResumeFiles(Array.from(e.target.files))}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <UploadCloud className="w-8 h-8 text-purple-400 mx-auto mb-2" />
              <p className="text-xs font-semibold text-white">Click or Drag PDF/DOCX Resumes here</p>
              <p className="text-[11px] text-gray-500 mt-1">Batch process multiple candidate files simultaneously</p>
            </div>

            {/* Uploaded Files List Pill Display */}
            {resumeFiles.length > 0 && (
              <div className="mt-4 space-y-2">
                <div className="text-xs font-semibold text-purple-300">Selected Resumes ({resumeFiles.length}):</div>
                <div className="max-h-28 overflow-y-auto space-y-1.5 pr-1">
                  {resumeFiles.map((f, i) => (
                    <div key={i} className="flex items-center justify-between bg-gray-900/80 px-3 py-1.5 rounded-lg border border-gray-800 text-xs text-gray-300">
                      <span className="truncate max-w-[200px]">{f.name}</span>
                      <span className="text-[10px] text-purple-400 font-mono">{(f.size / 1024).toFixed(1)} KB</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <button
            onClick={handleRunScreening}
            disabled={analyzing}
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 font-bold text-white shadow-lg shadow-purple-600/25 flex items-center justify-center space-x-2 transition disabled:opacity-50 mt-4"
          >
            {analyzing ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Processing Candidates...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Execute AI Screening & Rank Leaderboard</span>
              </>
            )}
          </button>
        </div>

      </div>

      {/* Analytics Executive Stats Row */}
      {analysisResult && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="glass-panel p-4 rounded-xl border border-gray-800">
              <div className="text-xs font-semibold text-gray-400">Total Analyzed</div>
              <div className="text-2xl font-black text-white mt-1">{totalCandidates}</div>
              <div className="text-[10px] text-gray-500 mt-1">Evaluated against JD</div>
            </div>

            <div className="glass-panel p-4 rounded-xl border border-emerald-500/30 bg-emerald-950/10">
              <div className="text-xs font-semibold text-emerald-400">Shortlisted</div>
              <div className="text-2xl font-black text-emerald-400 mt-1">{shortlisted}</div>
              <div className="text-[10px] text-emerald-300/70 mt-1">≥ 80% Match Score</div>
            </div>

            <div className="glass-panel p-4 rounded-xl border border-amber-500/30 bg-amber-950/10">
              <div className="text-xs font-semibold text-amber-400">Under Consideration</div>
              <div className="text-2xl font-black text-amber-400 mt-1">{consider}</div>
              <div className="text-[10px] text-amber-300/70 mt-1">60% - 79% Match Score</div>
            </div>

            <div className="glass-panel p-4 rounded-xl border border-rose-500/30 bg-rose-950/10">
              <div className="text-xs font-semibold text-rose-400">Not Recommended</div>
              <div className="text-2xl font-black text-rose-400 mt-1">{notRecommended}</div>
              <div className="text-[10px] text-rose-300/70 mt-1">&lt; 60% Match Score</div>
            </div>
          </div>

          {/* Candidate Leaderboard Table */}
          <div className="glass-panel p-6 rounded-2xl border border-gray-800 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white flex items-center space-x-2">
                  <Award className="w-5 h-5 text-purple-400" />
                  <span>Candidate Evaluation Leaderboard</span>
                </h3>
                <p className="text-xs text-gray-400">Ranked by overall match score & evidence alignment</p>
              </div>

              <div className="flex items-center space-x-3">
                {rankings.length >= 2 && (
                  <button
                    onClick={() => onSelectCompare(analysisResult.side_by_side)}
                    className="bg-purple-950/50 hover:bg-purple-900/60 text-purple-300 text-xs px-3 py-1.5 rounded-lg border border-purple-500/30 flex items-center space-x-1.5 transition font-semibold"
                  >
                    <Columns className="w-3.5 h-3.5" />
                    <span>Side-by-Side Comparison</span>
                  </button>
                )}

                <button
                  onClick={handleExportCSV}
                  className="bg-gray-800 hover:bg-gray-700 text-gray-200 text-xs px-3 py-1.5 rounded-lg border border-gray-700 flex items-center space-x-1.5 transition font-semibold"
                >
                  <Download className="w-3.5 h-3.5 text-purple-400" />
                  <span>Export CSV</span>
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-gray-800 text-gray-400 uppercase text-[10px] tracking-wider">
                    <th className="py-3 px-4">Rank</th>
                    <th className="py-3 px-4">Candidate</th>
                    <th className="py-3 px-4">Match Score</th>
                    <th className="py-3 px-4">Recommendation</th>
                    <th className="py-3 px-4">Top Strengths</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/60">
                  {rankings.map((cand, idx) => {
                    const recBadgeClass =
                      cand.recommendation === 'Shortlist' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' :
                      cand.recommendation === 'Consider' ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' :
                      'bg-rose-500/20 text-rose-400 border-rose-500/30';

                    return (
                      <tr key={idx} className="hover:bg-gray-900/40 transition">
                        <td className="py-3.5 px-4 font-bold text-purple-400">#{idx + 1}</td>
                        <td className="py-3.5 px-4 font-semibold text-white">
                          {cand.candidate_name}
                          <div className="text-[10px] text-gray-500 font-mono">{cand.file_name}</div>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex items-center space-x-2">
                            <span className="font-extrabold text-sm text-white">{cand.overall_match_score}%</span>
                            <div className="w-16 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-purple-500 rounded-full"
                                style={{ width: `${cand.overall_match_score}%` }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${recBadgeClass}`}>
                            {cand.recommendation}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-gray-300">
                          {(cand.key_strengths || []).slice(0, 2).join(', ')}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <button
                            onClick={() => onSelectCandidate(cand.candidate_id, analysisResult)}
                            className="text-purple-400 hover:text-purple-300 font-semibold flex items-center space-x-1 ml-auto"
                          >
                            <span>View Audit</span>
                            <ArrowUpRight className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
