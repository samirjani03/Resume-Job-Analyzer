import React from 'react';
import { Sparkles, Users, GraduationCap, ShieldCheck, History, Award } from 'lucide-react';

export default function Navbar({ activeMode, setActiveMode, redactPii, setRedactPii, onOpenHistory }) {
  return (
    <header className="sticky top-0 z-40 w-full glass-panel border-b border-gray-800 px-6 py-3.5 flex items-center justify-between">
      {/* Brand Logo */}
      <div className="flex items-center space-x-3">
        <div className="w-10 h-10 rounded-xl gradient-btn flex items-center justify-center shadow-lg shadow-blue-500/20">
          <Sparkles className="w-5 h-5 text-white animate-pulse" />
        </div>
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-bold tracking-tight text-white">TalentMatch <span className="gradient-text">AI</span></h1>
            <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 font-medium">
              Decision Support
            </span>
          </div>
          <p className="text-xs text-gray-400">Explainable Screening & Career Mentorship Platform</p>
        </div>
      </div>

      {/* Mode Navigation Switches */}
      <div className="flex items-center bg-gray-900/90 p-1.5 rounded-xl border border-gray-800">
        <button
          onClick={() => setActiveMode('recruiter')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            activeMode === 'recruiter'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
              : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/50'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Recruiter Mode</span>
        </button>

        <button
          onClick={() => setActiveMode('student')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            activeMode === 'student'
              ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
              : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/50'
          }`}
        >
          <GraduationCap className="w-4 h-4" />
          <span>Student Mentor Mode</span>
        </button>
      </div>

      {/* Control Actions: PII Redaction Toggle & History */}
      <div className="flex items-center space-x-4">
        {/* PII Redaction Switch */}
        <label className="flex items-center space-x-2.5 cursor-pointer bg-gray-900/60 px-3.5 py-1.5 rounded-lg border border-gray-800 hover:border-gray-700 transition">
          <ShieldCheck className={`w-4 h-4 ${redactPii ? 'text-emerald-400' : 'text-gray-400'}`} />
          <span className="text-xs text-gray-300 font-medium">PII Redaction</span>
          <input
            type="checkbox"
            checked={redactPii}
            onChange={(e) => setRedactPii(e.target.checked)}
            className="w-4 h-4 rounded bg-gray-800 border-gray-700 text-blue-600 focus:ring-blue-500 cursor-pointer"
          />
        </label>

        {/* History Drawer Trigger */}
        <button
          onClick={onOpenHistory}
          className="flex items-center space-x-2 bg-gray-800/80 hover:bg-gray-700/80 text-gray-200 text-xs px-3.5 py-2 rounded-lg border border-gray-700 transition"
        >
          <History className="w-4 h-4 text-blue-400" />
          <span>Analysis History</span>
        </button>
      </div>
    </header>
  );
}
