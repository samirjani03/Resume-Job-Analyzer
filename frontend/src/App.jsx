import React, { useState } from 'react';
import Navbar from './components/Navbar';
import RecruiterDashboard from './components/RecruiterDashboard';
import StudentMentorDashboard from './components/StudentMentorDashboard';
import CandidateDetailModal from './components/CandidateDetailModal';
import SideBySideModal from './components/SideBySideModal';
import HistoryDrawer from './components/HistoryDrawer';

export default function App() {
  const [activeMode, setActiveMode] = useState('recruiter'); // 'recruiter' or 'student'
  const [redactPii, setRedactPii] = useState(false);
  
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [activeAnalysisData, setActiveAnalysisData] = useState(null);
  
  const [sideBySideData, setSideBySideData] = useState(null);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  const handleSelectCandidate = (cand, analysisData) => {
    setSelectedCandidate(cand);
    setActiveAnalysisData(analysisData);
  };

  const handleSelectCompare = (sbData) => {
    setSideBySideData(sbData);
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
      />

      {/* Main Content Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-8">
        {activeMode === 'recruiter' ? (
          <RecruiterDashboard
            redactPii={redactPii}
            onSelectCandidate={handleSelectCandidate}
            onSelectCompare={handleSelectCompare}
          />
        ) : (
          <StudentMentorDashboard
            redactPii={redactPii}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-800 py-6 text-center text-xs text-gray-500 bg-gray-950/80">
        <p>TalentMatch AI • Decision-Support Resume Screening & Personal Career Mentor</p>
        <p className="mt-1 text-[11px] text-gray-600">Local & Privacy-First Architecture • FastAPI • React 19 • ChromaDB • Ollama</p>
      </footer>

      {/* Modals & Drawers */}
      {selectedCandidate && (
        <CandidateDetailModal
          candidate={selectedCandidate}
          analysisData={activeAnalysisData}
          onClose={() => setSelectedCandidate(null)}
        />
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
    </div>
  );
}
