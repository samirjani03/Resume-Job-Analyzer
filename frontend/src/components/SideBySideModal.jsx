import React from 'react';
import { X, Columns, Check, AlertCircle, ArrowRight } from 'lucide-react';

export default function SideBySideModal({ sideBySideData, onClose }) {
  if (!sideBySideData) return null;

  const candidateA = sideBySideData.candidate_a || 'Candidate A';
  const candidateB = sideBySideData.candidate_b || 'Candidate B';
  const dims = sideBySideData.dimension_comparison || {};

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4">
      <div className="glass-panel w-full max-w-4xl max-h-[85vh] rounded-2xl overflow-y-auto border border-gray-800 bg-gray-900/95 p-6 shadow-2xl space-y-6">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-800 pb-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30">
              <Columns className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Side-by-Side Candidate Comparison</h2>
              <p className="text-xs text-gray-400">Direct capability evaluation between top candidates</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-gray-800 transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Verdict Summary Card */}
        <div className="bg-blue-950/40 border border-blue-800/60 p-4 rounded-xl space-y-1">
          <div className="text-xs font-bold text-blue-400 uppercase tracking-wider">AI Hiring Verdict</div>
          <p className="text-sm text-blue-100 font-medium">{sideBySideData.verdict_summary}</p>
        </div>

        {/* Comparison Matrix Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-800 text-xs text-gray-400">
                <th className="py-3 px-4 w-1/3">Evaluation Metric</th>
                <th className="py-3 px-4 text-blue-400 font-bold">{candidateA}</th>
                <th className="py-3 px-4 text-purple-400 font-bold">{candidateB}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800 text-sm">
              {Object.entries(dims).map(([metric, values], idx) => (
                <tr key={idx} className="hover:bg-gray-800/30 transition">
                  <td className="py-3.5 px-4 font-semibold text-gray-300 text-xs">{metric}</td>
                  <td className="py-3.5 px-4 text-gray-200 text-xs bg-blue-950/10">{values[candidateA] || 'N/A'}</td>
                  <td className="py-3.5 px-4 text-gray-200 text-xs bg-purple-950/10">{values[candidateB] || 'N/A'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

      </div>
    </div>
  );
}
