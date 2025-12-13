import React, { useState } from 'react';
import { JDAnalysis, UserProfile } from '../types';
import { analyzeJD } from '../services/geminiService';
import { Brain, Save, Loader2, Sparkles } from 'lucide-react';
import { AnalysisResultView } from './AnalysisResultView';

interface AnalyzerProps {
  onSave: (analysis: JDAnalysis, jdText: string) => void;
  profile: UserProfile;
}

export const Analyzer: React.FC<AnalyzerProps> = ({ onSave, profile }) => {
  const [jdText, setJdText] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<JDAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleAnalyze = async () => {
    if (!jdText.trim()) return;
    
    setIsAnalyzing(true);
    setError(null);
    try {
      const data = await analyzeJD(jdText, profile);
      setResult(data);
    } catch (err) {
      setError("Failed to analyze job description. Ensure API Key is set and quota is available.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full overflow-hidden">
      {/* Left Column: Input */}
      <div className="flex flex-col h-full bg-gray-900 rounded-xl border border-gray-800 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-800 bg-gray-850 flex justify-between items-center">
          <h2 className="font-semibold flex items-center gap-2">
            <BriefcaseIcon className="w-5 h-5 text-blue-400" />
            Job Description / Project
          </h2>
          <button 
            onClick={handleAnalyze}
            disabled={isAnalyzing || !jdText.trim()}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-sm font-medium transition-colors"
          >
            {isAnalyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            Analyze
          </button>
        </div>
        <textarea
          className="flex-1 w-full bg-gray-950 p-4 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-blue-500/50 font-mono text-gray-300 leading-relaxed"
          placeholder="Paste job description or Upwork project details here..."
          value={jdText}
          onChange={(e) => setJdText(e.target.value)}
        />
      </div>

      {/* Right Column: Output */}
      <div className="flex flex-col h-full bg-gray-900 rounded-xl border border-gray-800 shadow-sm overflow-hidden relative">
        <div className="p-4 border-b border-gray-800 bg-gray-850 flex justify-between items-center">
          <h2 className="font-semibold flex items-center gap-2">
            <Brain className="w-5 h-5 text-purple-400" />
            {result?.analysisType === 'freelance' ? 'Freelance Strategy' : 'Role Analysis'}
          </h2>
          {result && (
            <button
              onClick={() => onSave(result, jdText)}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-500 rounded-lg text-sm font-medium transition-colors"
            >
              <Save className="w-4 h-4" />
              Save
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-6 scrollbar-thin">
          {error && (
            <div className="p-4 bg-red-900/20 border border-red-500/50 rounded-lg text-red-200 text-sm">{error}</div>
          )}

          {!result && !isAnalyzing && !error && (
            <div className="h-full flex flex-col items-center justify-center text-gray-500 opacity-60">
              <Brain className="w-16 h-16 mb-4" />
              <p>Paste a JD and click Analyze to get started</p>
            </div>
          )}

          {isAnalyzing && (
            <div className="h-full flex flex-col items-center justify-center text-blue-400">
              <Loader2 className="w-12 h-12 animate-spin mb-4" />
              <p className="animate-pulse">Analyzing context & fit...</p>
            </div>
          )}

          {result && (
             <AnalysisResultView analysis={result} />
          )}
        </div>
      </div>
    </div>
  );
};

function BriefcaseIcon(props: any) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 20V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" /><rect width="20" height="14" x="2" y="6" rx="2" /></svg>
  );
}