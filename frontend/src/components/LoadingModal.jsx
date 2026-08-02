import React, { useState, useEffect } from 'react';
import { Sparkles, Brain, Cpu, ShieldCheck, Zap, BarChart3, CheckCircle } from 'lucide-react';

const RECRUITER_STEPS = [
  "Parsing candidate document structures & extracting text...",
  "Scrubbing privacy PII & identifying core skill pillars...",
  "Consulting Ollama AI LLM for multi-criteria rubric evaluation...",
  "Cross-referencing candidate experience against job requirements...",
  "Detecting unquantified claims, ATS keywords & red flags...",
  "Synthesizing evidence quotes & ranking candidate leaderboard...",
  "Almost there! Finalizing your decision-support report..."
];

const STUDENT_STEPS = [
  "Analyzing resume structure & extracting technical capabilities...",
  "Detecting candidate career domain & target role identity...",
  "Auditing ATS compatibility & missing job keywords...",
  "Scanning bullet points for buzzwords & quantification gaps...",
  "Crafting high-impact portfolio project recommendations...",
  "Generating 90-Day personalized weekly action roadmap...",
  "Almost there! Assembling your personal career mentorship suite..."
];

export default function LoadingModal({ isOpen, mode = 'recruiter' }) {
  const steps = mode === 'student' ? STUDENT_STEPS : RECRUITER_STEPS;
  const [stepIndex, setStepIndex] = useState(0);
  const [progress, setProgress] = useState(10);

  useEffect(() => {
    if (!isOpen) {
      setStepIndex(0);
      setProgress(10);
      return;
    }

    // Cycle text messages every 2.8 seconds
    const textInterval = setInterval(() => {
      setStepIndex((prev) => (prev + 1) % steps.length);
    }, 2800);

    // Smooth progress bar advancement up to 92%
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 92) return 92;
        return prev + Math.floor(Math.random() * 8) + 4;
      });
    }, 1200);

    return () => {
      clearInterval(textInterval);
      clearInterval(progressInterval);
    };
  }, [isOpen, steps.length]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="glass-panel w-full max-w-md p-8 rounded-3xl border border-purple-500/30 text-center relative overflow-hidden shadow-2xl shadow-purple-600/20">
        
        {/* Satisfying Pulsing Glow Orbs Background */}
        <div className="absolute -top-16 -left-16 w-36 h-36 bg-purple-600/30 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-16 -right-16 w-36 h-36 bg-indigo-600/30 rounded-full blur-3xl animate-pulse delay-750" />

        {/* Central Satisfying Orb Radar Animation */}
        <div className="relative w-28 h-28 mx-auto mb-6 flex items-center justify-center">
          {/* Outer Ripple Rings */}
          <div className="absolute inset-0 rounded-full border-2 border-purple-500/20 animate-ping" style={{ animationDuration: '3s' }} />
          <div className="absolute inset-2 rounded-full border-2 border-indigo-500/30 animate-pulse" />
          
          {/* Center Glass Orb */}
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-500 p-0.5 shadow-xl shadow-purple-600/40 animate-spin-slow">
            <div className="w-full h-full bg-gray-950 rounded-2xl flex items-center justify-center">
              {mode === 'student' ? (
                <Brain className="w-9 h-9 text-purple-400 animate-bounce" />
              ) : (
                <Cpu className="w-9 h-9 text-indigo-400 animate-pulse" />
              )}
            </div>
          </div>

          {/* Floating Orbit Sparkles */}
          <div className="absolute top-0 right-1 bg-purple-500 p-1.5 rounded-full text-white shadow-lg shadow-purple-500/50 animate-bounce">
            <Sparkles className="w-3.5 h-3.5" />
          </div>
        </div>

        {/* Dynamic Title */}
        <h3 className="text-xl font-extrabold text-white">
          {mode === 'student' ? 'AI Career Mentor is Thinking...' : 'Screening Candidates with AI...'}
        </h3>
        
        {/* Dynamic Rotating Progress Message */}
        <div className="h-12 flex items-center justify-center my-3 px-2">
          <p className="text-xs text-purple-300 font-medium transition-all duration-300 animate-fadeIn">
            ✨ {steps[stepIndex]}
          </p>
        </div>

        {/* Satisfying Smooth Progress Bar */}
        <div className="space-y-1.5 mt-2">
          <div className="flex justify-between text-[11px] font-bold text-gray-400 px-1">
            <span>Processing</span>
            <span className="text-purple-400">{progress}%</span>
          </div>

          <div className="w-full h-2.5 bg-gray-900 rounded-full p-0.5 border border-gray-800 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-purple-500 via-indigo-500 to-emerald-400 rounded-full transition-all duration-500 shadow-md shadow-purple-500/30"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Encouraging Footer Note */}
        <p className="text-[10px] text-gray-400 mt-4 italic">
          💡 Our local/cloud Ollama LLM is performing deep evidence rationale extraction.
        </p>

      </div>
    </div>
  );
}
