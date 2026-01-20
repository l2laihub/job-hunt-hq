import React from 'react';
import {
  ThumbsUp,
  CheckCircle,
  Brain,
  GraduationCap,
  ThumbsDown,
  AlertTriangle,
  AlertCircle,
  Zap,
  Clock,
} from 'lucide-react';
import { cn } from '@/src/lib/utils';
import type {
  QuickTake,
  ApplicationRecommendation,
  RecommendationVerdict,
} from '@/src/types';

interface QuickTakeCardProps {
  quickTake?: QuickTake;
  recommendation: ApplicationRecommendation;
  fitScore: number;
}

const getVerdictConfig = (verdict: RecommendationVerdict) => {
  switch (verdict) {
    case 'strong-apply':
      return {
        label: 'Strong Apply',
        icon: ThumbsUp,
        bgColor: 'bg-green-900/30',
        borderColor: 'border-green-500/50',
        textColor: 'text-green-400',
        gradientFrom: 'from-green-600',
        gradientTo: 'to-emerald-600',
      };
    case 'apply':
      return {
        label: 'Apply',
        icon: CheckCircle,
        bgColor: 'bg-blue-900/30',
        borderColor: 'border-blue-500/50',
        textColor: 'text-blue-400',
        gradientFrom: 'from-blue-600',
        gradientTo: 'to-cyan-600',
      };
    case 'consider':
      return {
        label: 'Consider',
        icon: Brain,
        bgColor: 'bg-yellow-900/30',
        borderColor: 'border-yellow-500/50',
        textColor: 'text-yellow-400',
        gradientFrom: 'from-yellow-600',
        gradientTo: 'to-amber-600',
      };
    case 'upskill-first':
      return {
        label: 'Upskill First',
        icon: GraduationCap,
        bgColor: 'bg-purple-900/30',
        borderColor: 'border-purple-500/50',
        textColor: 'text-purple-400',
        gradientFrom: 'from-purple-600',
        gradientTo: 'to-violet-600',
      };
    case 'pass':
      return {
        label: 'Pass',
        icon: ThumbsDown,
        bgColor: 'bg-red-900/30',
        borderColor: 'border-red-500/50',
        textColor: 'text-red-400',
        gradientFrom: 'from-red-600',
        gradientTo: 'to-rose-600',
      };
    default:
      return {
        label: 'Unknown',
        icon: Brain,
        bgColor: 'bg-gray-900/30',
        borderColor: 'border-gray-500/50',
        textColor: 'text-gray-400',
        gradientFrom: 'from-gray-600',
        gradientTo: 'to-gray-600',
      };
  }
};

const getScoreColorClasses = (score: number) => {
  if (score >= 8) return 'text-green-400 border-green-500/30 bg-green-900/20';
  if (score >= 5) return 'text-yellow-400 border-yellow-500/30 bg-yellow-900/20';
  return 'text-red-400 border-red-500/30 bg-red-900/20';
};

export const QuickTakeCard: React.FC<QuickTakeCardProps> = ({
  quickTake,
  recommendation,
  fitScore,
}) => {
  // Build data from quickTake if available, otherwise fall back to recommendation
  const data = quickTake || {
    verdict: recommendation.verdict,
    confidence: recommendation.confidence,
    headline: recommendation.summary,
    whyApply: recommendation.primaryReasons.slice(0, 3),
    whyPass: [],
    nextAction: recommendation.actionItems[0] || 'Review the full analysis below',
    timeToDecide: undefined,
  };

  const verdictConfig = getVerdictConfig(data.verdict);
  const VerdictIcon = verdictConfig.icon;

  return (
    <div className="relative overflow-hidden rounded-xl">
      {/* Gradient background based on verdict */}
      <div
        className={cn(
          'absolute inset-0 opacity-20 bg-gradient-to-r',
          verdictConfig.gradientFrom,
          verdictConfig.gradientTo
        )}
      />

      <div className="relative p-5 border border-gray-700/50 rounded-xl">
        {/* Header Row */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                'p-2.5 rounded-lg border',
                verdictConfig.bgColor,
                verdictConfig.borderColor
              )}
            >
              <VerdictIcon className={cn('w-6 h-6', verdictConfig.textColor)} />
            </div>
            <div>
              <div className={cn('text-lg font-bold', verdictConfig.textColor)}>
                {verdictConfig.label}
              </div>
              <div className="text-xs text-gray-400">
                {data.confidence}% confidence
              </div>
            </div>
          </div>

          <div
            className={cn(
              'text-right px-4 py-2 rounded-lg border',
              getScoreColorClasses(fitScore)
            )}
          >
            <div className="text-2xl font-bold">{fitScore}</div>
            <div className="text-xs uppercase tracking-wider opacity-80">/10</div>
          </div>
        </div>

        {/* Headline */}
        <p className="text-white font-medium mb-4 text-lg leading-snug">
          {data.headline}
        </p>

        {/* Two Column: Why Apply vs Concerns */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-green-400 uppercase tracking-wider flex items-center gap-1">
              <ThumbsUp className="w-3 h-3" /> Why Apply
            </h4>
            <ul className="space-y-1.5">
              {data.whyApply.map((reason, i) => (
                <li
                  key={i}
                  className="text-sm text-gray-300 flex items-start gap-2"
                >
                  <CheckCircle className="w-3.5 h-3.5 mt-0.5 text-green-400 flex-shrink-0" />
                  <span>{reason}</span>
                </li>
              ))}
              {data.whyApply.length === 0 && (
                <li className="text-sm text-gray-500 italic">
                  See detailed analysis below
                </li>
              )}
            </ul>
          </div>

          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-orange-400 uppercase tracking-wider flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" /> Consider
            </h4>
            <ul className="space-y-1.5">
              {data.whyPass.length > 0 ? (
                data.whyPass.map((concern, i) => (
                  <li
                    key={i}
                    className="text-sm text-gray-300 flex items-start gap-2"
                  >
                    <AlertCircle className="w-3.5 h-3.5 mt-0.5 text-orange-400 flex-shrink-0" />
                    <span>{concern}</span>
                  </li>
                ))
              ) : (
                <li className="text-sm text-gray-400 italic">
                  No major concerns identified
                </li>
              )}
            </ul>
          </div>
        </div>

        {/* Action Footer */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-4 border-t border-gray-700/50">
          <div className="flex items-center gap-2 text-blue-400">
            <Zap className="w-4 h-4 flex-shrink-0" />
            <span className="text-sm font-medium">{data.nextAction}</span>
          </div>

          {data.timeToDecide && (
            <span className="text-xs text-yellow-400 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {data.timeToDecide}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
