import React, { useEffect, useState } from 'react';
import Navbar from './components/Navbar';
import RecruiterDashboard from './components/RecruiterDashboard';
import StudentMentorDashboard from './components/StudentMentorDashboard';
import CandidateDetailModal from './components/CandidateDetailModal';
import SideBySideModal from './components/SideBySideModal';
import HistoryDrawer from './components/HistoryDrawer';
import SettingsModal from './components/SettingsModal';
import AiInterviewModal from './components/AiInterviewModal';
import { getProviderStatus } from './services/api';

export default function App() {
  const [activeMode, setActiveMode] = useState('recruiter'); // 'recruiter' or 'student'
  const [redactPii, setRedactPii] = useState(false);

  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [activeAnalysisData, setActiveAnalysisData] = useState(null);

  const [sideBySideData, setSideBySideData] = useState(null);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [providerStatus, setProviderStatus] = useState(null);
  const [toast, setToast] = useState(null);
  const [interviewContext, setInterviewContext] = useState(null);

  useEffect(() => {
    getProviderStatus().then(setProviderStatus).catch(() => {});
  }, []);

  useEffect(() => {
    const onProviderRequired = () => setIsSettingsOpen(true);
    const onQuotaExceeded = (e) => {
      setToast(e.detail?.message || 'Daily analysis limit reached.');
      setTimeout(() => setToast(null), 6000);
    };
    window.addEventListener('app:provider-required', onProviderRequired);
    window.addEventListener('app:quota-exceeded', onQuotaExceeded);
    return () => {
      window.removeEventListener('app:provider-required', onProviderRequired);
      window.removeEventListener('app:quota-exceeded', onQuotaExceeded);
    };
  }, []);

  const handleSelectCandidate = (cand, analysisData) => {
    setSelectedCandidate(cand);
    setActiveAnalysisData(analysisData);
  };

  const handleSelectCompare = (sbData) => {
    setSideBySideData(sbData);
  };

  const handleLaunchInterview = (cand, analysisData, mode = 'recruiter') => {
    setInterviewContext({
      candidateId: cand?.candidate_id || cand?.id,
      candidateName: cand?.candidate_name || cand?.name || 'Candidate',
      jobTitle: analysisData?.job_title || analysisData?.title || null,
      jobId: analysisData?.job_id || null,
      mode,
    });
    setSelectedCandidate(null);
  };

  return (
    <div className="min-h-screen bg-[#0b0f19] text-gray-100 flex flex-col font-sans">
      {/* Sticky Glassmorphism Header */}
      <Navbar
        activeMode={activeMode}
        setActiveMode={setActiveMode}
        redactPii={redactPii}
        setRedactPii={setRedactPii}
        onOpenHistory={() => setIsHistoryOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        providerStatus={providerStatus}
      />

      {/* Main Content Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-8">
        {activeMode === 'recruiter' ? (
          <RecruiterDashboard
            redactPii={redactPii}
            onSelectCandidate={handleSelectCandidate}
            onSelectCompare={handleSelectCompare}
            onLaunchInterview={handleLaunchInterview}
          />
        ) : (
          <StudentMentorDashboard
            redactPii={redactPii}
            onLaunchInterview={handleLaunchInterview}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-800 py-6 text-center text-xs text-gray-500 bg-gray-950/80">
        <p>TalentMatch AI • Decision-Support Resume Screening & Personal Career Mentor</p>
        <p className="mt-1 text-[11px] text-gray-600">FastAPI • React 19 • SQLite • Multi-Provider AI (Ollama, Gemini, OpenRouter)</p>
      </footer>

      {/* Modals & Drawers */}
      {selectedCandidate && (
        <CandidateDetailModal
          candidate={selectedCandidate}
          analysisData={activeAnalysisData}
          onClose={() => setSelectedCandidate(null)}
          onLaunchInterview={handleLaunchInterview}
        />
      )}

      {interviewContext && (
        <AiInterviewModal context={interviewContext} onClose={() => setInterviewContext(null)} />
      )}

      {sideBySideData && (
        <SideBySideModal
          sideBySideData={sideBySideData}
          onClose={() => setSideBySideData(null)}
        />
      )}

      <HistoryDrawer
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        onSelectHistory={(id) => {
          console.log("Selected history ID:", id);
        }}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onSaved={(st) => setProviderStatus(st)}
      />

      {toast && (
        <div className="fixed bottom-6 right-6 z-[60] bg-gray-900 border border-amber-500/40 text-amber-300 text-sm px-4 py-3 rounded-xl shadow-2xl max-w-sm">
          {toast}
        </div>
      )}
    </div>
  );
}
