import React from 'react';
import { JDAnalysis, FTEAnalysis, FreelanceAnalysis } from '../types';
import { Brain, CheckCircle, AlertTriangle, MessageCircle, DollarSign, Clock, Target } from 'lucide-react';

interface AnalysisResultViewProps {
  analysis: JDAnalysis;
}

export const AnalysisResultView: React.FC<AnalysisResultViewProps> = ({ analysis }) => {

  const getScoreColor = (score: number) => {
    if (score >= 8) return 'text-green-400 border-green-500/30 bg-green-900/20';
    if (score >= 5) return 'text-yellow-400 border-yellow-500/30 bg-yellow-900/20';
    return 'text-red-400 border-red-500/30 bg-red-900/20';
  };

  const renderFreelanceResult = (data: FreelanceAnalysis) => (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="flex gap-4">
        <div className={`flex flex-col items-center justify-center p-4 rounded-xl border ${getScoreColor(data.fitScore)} min-w-[100px]`}>
          <span className="text-3xl font-bold">{data.fitScore}</span>
          <span className="text-xs uppercase tracking-wider opacity-80">Fit Score</span>
        </div>
        <div className="flex-1 p-4 bg-gray-800/50 rounded-xl border border-gray-700 space-y-2">
          <p className="text-sm text-gray-300 italic">"{data.reasoning}"</p>
          <div className="flex gap-2">
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-900/30 text-blue-300 border border-blue-800">
              {data.projectType}
            </span>
            {data.estimatedEffort && (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-700 text-gray-300">
                <Clock className="w-3 h-3 mr-1" /> {data.estimatedEffort}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Proposal Angle */}
      <div className="p-5 bg-gradient-to-br from-blue-900/20 to-purple-900/20 rounded-xl border border-blue-800/30">
        <h3 className="text-sm font-semibold text-blue-300 mb-2 flex items-center gap-2">
          <Target className="w-4 h-4" /> Winning Proposal Strategy
        </h3>
        <p className="text-sm text-gray-300 mb-4">{data.proposalAngle}</p>
        <div className="bg-gray-900/50 p-3 rounded border border-gray-700/50">
          <span className="text-xs font-bold text-gray-500 uppercase block mb-1">Opening Hook</span>
          <p className="text-sm text-white font-medium">"{data.openingHook}"</p>
        </div>
      </div>

      {/* Bid Strategy */}
      <div className="p-4 bg-gray-800/30 rounded-xl border border-gray-700/50">
        <h3 className="text-sm font-semibold text-green-400 mb-3 flex items-center gap-2">
          <DollarSign className="w-4 h-4" /> Suggested Bid
        </h3>
        <div className="flex items-center gap-6 mb-2">
          {data.suggestedBid.hourly && (
             <div>
               <span className="text-xs text-gray-500 block">Hourly Rate</span>
               <span className="text-lg font-bold text-white">${data.suggestedBid.hourly}/hr</span>
             </div>
          )}
          {data.suggestedBid.fixed && (
             <div>
               <span className="text-xs text-gray-500 block">Fixed Price</span>
               <span className="text-lg font-bold text-white">${data.suggestedBid.fixed}</span>
             </div>
          )}
        </div>
        <p className="text-xs text-gray-400 border-t border-gray-700 pt-2">{data.suggestedBid.rationale}</p>
      </div>

      {/* Skills & Experience */}
      <div className="grid grid-cols-2 gap-4">
          <div className="p-3 bg-gray-800/30 rounded-lg border border-gray-700">
            <h4 className="text-xs font-bold text-gray-400 uppercase mb-2">Relevant Experience</h4>
            <ul className="text-xs text-gray-300 space-y-1 list-disc list-inside">
              {data.relevantExperience?.map((exp, i) => <li key={i}>{exp}</li>)}
            </ul>
          </div>
          <div className="p-3 bg-gray-800/30 rounded-lg border border-gray-700">
            <h4 className="text-xs font-bold text-gray-400 uppercase mb-2">Questions for Client</h4>
            <ul className="text-xs text-gray-300 space-y-1 list-disc list-inside">
              {data.questionsForClient?.map((q, i) => <li key={i}>{q}</li>)}
            </ul>
          </div>
      </div>
    </div>
  );

  const renderFTEResult = (data: FTEAnalysis) => (
    <div className="space-y-6">
      {/* Standard FTE Layout */}
      <div className="flex gap-4">
        <div className={`flex flex-col items-center justify-center p-4 rounded-xl border ${getScoreColor(data.fitScore)} min-w-[100px]`}>
          <span className="text-3xl font-bold">{data.fitScore}</span>
          <span className="text-xs uppercase tracking-wider opacity-80">Fit Score</span>
        </div>
        <div className="flex-1 p-4 bg-gray-800/50 rounded-xl border border-gray-700">
          <p className="text-sm text-gray-300 italic">"{data.reasoning}"</p>
          <div className="mt-3 flex items-center gap-3">
             <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-700 text-gray-300">
               Role Type: <span className="text-white ml-1 capitalize">{data.roleType}</span>
             </span>
             {data.salaryAssessment && (
               <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-900/30 text-green-300 border border-green-800/50">
                 <DollarSign className="w-3 h-3 mr-1" /> {data.salaryAssessment}
               </span>
             )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="p-4 bg-gray-800/30 rounded-xl border border-gray-700/50">
          <h3 className="text-sm font-semibold text-green-400 mb-3 flex items-center gap-2">
            <CheckCircle className="w-4 h-4" /> You Have
          </h3>
          <div className="flex flex-wrap gap-2">
            {data.matchedSkills.map(skill => (
              <span key={skill} className="px-2 py-1 bg-green-900/30 text-green-300 rounded text-xs border border-green-800">{skill}</span>
            ))}
          </div>
        </div>
        <div className="p-4 bg-gray-800/30 rounded-xl border border-gray-700/50">
          <h3 className="text-sm font-semibold text-red-400 mb-3 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" /> Missing / Gaps
          </h3>
          <div className="flex flex-wrap gap-2">
            {data.missingSkills.map(skill => (
              <span key={skill} className="px-2 py-1 bg-red-900/30 text-red-300 rounded text-xs border border-red-800">{skill}</span>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-blue-400">
          <MessageCircle className="w-4 h-4" /> Talking Points
        </h3>
        <div className="grid gap-2">
          {data.talkingPoints.map((point, i) => (
            <div key={i} className="flex gap-3 p-3 bg-gray-800/50 rounded-lg border border-gray-700/50">
              <span className="text-blue-500 font-mono text-xs mt-0.5">0{i + 1}</span>
              <p className="text-sm text-gray-300">{point}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  return analysis.analysisType === 'freelance' 
    ? renderFreelanceResult(analysis as FreelanceAnalysis)
    : renderFTEResult(analysis as FTEAnalysis);
};