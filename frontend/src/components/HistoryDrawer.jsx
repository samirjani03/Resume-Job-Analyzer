import React, { useEffect, useState } from 'react';
import { X, History, FileText, Calendar, ChevronRight, RefreshCw } from 'lucide-react';
import { getAnalysisHistory } from '../services/api';

export default function HistoryDrawer({ isOpen, onClose, onSelectHistory }) {
  const [historyList, setHistoryList] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadHistory();
    }
  }, [isOpen]);

  const loadHistory = async () => {
    setLoading(true);
    try {
      const data = await getAnalysisHistory();
      setHistoryList(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md bg-gray-900 border-l border-gray-800 h-full p-6 flex flex-col justify-between shadow-2xl">
        
        {/* Drawer Header */}
        <div>
          <div className="flex items-center justify-between border-b border-gray-800 pb-4 mb-4">
            <div className="flex items-center space-x-2.5">
              <History className="w-5 h-5 text-blue-400" />
              <h2 className="text-lg font-bold text-white">Analysis History</h2>
            </div>
            <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-gray-800 transition">
              <X className="w-5 h-5" />
            </button>
          </div>

          <p className="text-xs text-gray-400 mb-4">Past recruiter screenings and student mentor sessions stored in database.</p>

          {loading ? (
            <div className="flex items-center justify-center py-12 text-gray-400 space-x-2">
              <RefreshCw className="w-5 h-5 animate-spin text-blue-400" />
              <span className="text-sm">Loading history...</span>
            </div>
          ) : historyList.length === 0 ? (
            <div className="text-center py-12 text-gray-500 text-sm">
              No previous analysis sessions recorded yet.
            </div>
          ) : (
            <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
              {historyList.map((item) => (
                <div
                  key={item.id}
                  onClick={() => { onSelectHistory(item.id); onClose(); }}
                  className="bg-gray-800/50 hover:bg-gray-800 border border-gray-700/60 p-3.5 rounded-xl cursor-pointer transition flex items-center justify-between group"
                >
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${
                        item.mode === 'recruiter' ? 'bg-blue-500/20 text-blue-400' : 'bg-purple-500/20 text-purple-400'
                      }`}>
                        {item.mode}
                      </span>
                      <span className="text-xs text-gray-400 flex items-center space-x-1">
                        <Calendar className="w-3 h-3" />
                        <span>{new Date(item.created_at).toLocaleDateString()}</span>
                      </span>
                    </div>
                    <div className="text-sm font-semibold text-white group-hover:text-blue-300 transition">
                      {item.job_title}
                    </div>
                    <div className="text-xs text-gray-400">
                      {item.candidate_count} Candidates • Top Score: {item.top_match_score}%
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-500 group-hover:text-blue-400 transition" />
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="border-t border-gray-800 pt-4 text-center">
          <p className="text-[11px] text-gray-500">Persistent SQLite Storage</p>
        </div>

      </div>
    </div>
  );
}
