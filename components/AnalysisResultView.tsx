import React from 'react';
import { JDAnalysis, FTEAnalysis, FreelanceAnalysis, RecommendationVerdict, GapSeverity } from '../types';
import {
  Brain,
  CheckCircle,
  AlertTriangle,
  MessageCircle,
  DollarSign,
  Clock,
  Target,
  ThumbsUp,
  ThumbsDown,
  TrendingUp,
  XCircle,
  AlertOctagon,
  Briefcase,
  GraduationCap,
  MapPin,
  ArrowRight,
  Zap,
  ShieldAlert,
  Lightbulb
} from 'lucide-react';

interface AnalysisResultViewProps {
  analysis: JDAnalysis;
}

export const AnalysisResultView: React.FC<AnalysisResultViewProps> = ({ analysis }) => {

  const getScoreColor = (score: number) => {
    if (score >= 8) return 'text-green-400 border-green-500/30 bg-green-900/20';
    if (score >= 5) return 'text-yellow-400 border-yellow-500/30 bg-yellow-900/20';
    return 'text-red-400 border-red-500/30 bg-red-900/20';
  };

  const getVerdictConfig = (verdict: RecommendationVerdict) => {
    switch (verdict) {
      case 'strong-apply':
        return {
          label: 'Strong Apply',
          icon: ThumbsUp,
          bgColor: 'bg-green-900/30',
          borderColor: 'border-green-500/50',
          textColor: 'text-green-400',
          description: 'This role is an excellent match'
        };
      case 'apply':
        return {
          label: 'Apply',
          icon: CheckCircle,
          bgColor: 'bg-blue-900/30',
          borderColor: 'border-blue-500/50',
          textColor: 'text-blue-400',
          description: 'Good fit worth pursuing'
        };
      case 'consider':
        return {
          label: 'Consider',
          icon: Brain,
          bgColor: 'bg-yellow-900/30',
          borderColor: 'border-yellow-500/50',
          textColor: 'text-yellow-400',
          description: 'Weigh pros and cons carefully'
        };
      case 'upskill-first':
        return {
          label: 'Upskill First',
          icon: GraduationCap,
          bgColor: 'bg-purple-900/30',
          borderColor: 'border-purple-500/50',
          textColor: 'text-purple-400',
          description: 'Develop skills before applying'
        };
      case 'pass':
        return {
          label: 'Pass',
          icon: ThumbsDown,
          bgColor: 'bg-red-900/30',
          borderColor: 'border-red-500/50',
          textColor: 'text-red-400',
          description: 'Not recommended for this role'
        };
      default:
        return {
          label: 'Unknown',
          icon: Brain,
          bgColor: 'bg-gray-900/30',
          borderColor: 'border-gray-500/50',
          textColor: 'text-gray-400',
          description: 'Unable to determine'
        };
    }
  };

  const getSeverityColor = (severity: GapSeverity) => {
    switch (severity) {
      case 'minor': return 'text-yellow-400 bg-yellow-900/30 border-yellow-800';
      case 'moderate': return 'text-orange-400 bg-orange-900/30 border-orange-800';
      case 'critical': return 'text-red-400 bg-red-900/30 border-red-800';
    }
  };

  // Render the recommendation verdict banner (shared between FTE and Freelance)
  const renderRecommendationBanner = () => {
    if (!analysis.recommendation) return null;

    const config = getVerdictConfig(analysis.recommendation.verdict);
    const Icon = config.icon;

    return (
      <div className={`p-5 rounded-xl border-2 ${config.bgColor} ${config.borderColor} mb-6`}>
        <div className="flex items-start gap-4">
          <div className={`p-3 rounded-full ${config.bgColor} border ${config.borderColor}`}>
            <Icon className={`w-8 h-8 ${config.textColor}`} />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h2 className={`text-2xl font-bold ${config.textColor}`}>{config.label}</h2>
              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-800 text-gray-300">
                {analysis.recommendation.confidence}% confident
              </span>
            </div>
            <p className="text-gray-300 mb-4">{analysis.recommendation.summary}</p>

            {/* Primary Reasons */}
            <div className="space-y-2 mb-4">
              <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Key Reasons</h4>
              <ul className="space-y-1">
                {analysis.recommendation.primaryReasons.map((reason, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-300">
                    <ArrowRight className={`w-4 h-4 mt-0.5 ${config.textColor} flex-shrink-0`} />
                    {reason}
                  </li>
                ))}
              </ul>
            </div>

            {/* Action Items */}
            <div className="bg-gray-900/50 rounded-lg p-3 border border-gray-700/50">
              <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                <Zap className="w-3 h-3" /> Next Steps
              </h4>
              <ul className="space-y-1">
                {analysis.recommendation.actionItems.map((action, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-300">
                    <span className="text-blue-400 font-mono text-xs">{i + 1}.</span>
                    {action}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Render career alignment section
  const renderCareerAlignment = () => {
    if (!analysis.careerAlignment) return null;

    const { alignmentScore, alignsWithGoals, misalignedAreas, growthPotential, trajectoryImpact } = analysis.careerAlignment;

    const growthColors = {
      high: 'text-green-400 bg-green-900/30',
      medium: 'text-yellow-400 bg-yellow-900/30',
      low: 'text-red-400 bg-red-900/30'
    };

    return (
      <div className="p-4 bg-gray-800/30 rounded-xl border border-gray-700/50 mb-4">
        <h3 className="text-sm font-semibold text-purple-400 mb-3 flex items-center gap-2">
          <TrendingUp className="w-4 h-4" /> Career Alignment
        </h3>

        <div className="flex items-center gap-4 mb-4">
          <div className={`flex flex-col items-center justify-center p-3 rounded-lg border ${getScoreColor(alignmentScore)} min-w-[80px]`}>
            <span className="text-2xl font-bold">{alignmentScore}</span>
            <span className="text-xs uppercase tracking-wider opacity-80">Alignment</span>
          </div>
          <div className="flex-1">
            <p className="text-sm text-gray-300 mb-2">{trajectoryImpact}</p>
            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${growthColors[growthPotential]}`}>
              <TrendingUp className="w-3 h-3 mr-1" />
              {growthPotential.charAt(0).toUpperCase() + growthPotential.slice(1)} Growth Potential
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {alignsWithGoals.length > 0 && (
            <div className="p-2 bg-green-900/20 rounded-lg border border-green-800/50">
              <h4 className="text-xs font-bold text-green-400 mb-1 flex items-center gap-1">
                <CheckCircle className="w-3 h-3" /> Aligns With Your Goals
              </h4>
              <ul className="text-xs text-gray-300 space-y-0.5">
                {alignsWithGoals.map((goal, i) => <li key={i}>• {goal}</li>)}
              </ul>
            </div>
          )}
          {misalignedAreas.length > 0 && (
            <div className="p-2 bg-red-900/20 rounded-lg border border-red-800/50">
              <h4 className="text-xs font-bold text-red-400 mb-1 flex items-center gap-1">
                <XCircle className="w-3 h-3" /> Misaligned Areas
              </h4>
              <ul className="text-xs text-gray-300 space-y-0.5">
                {misalignedAreas.map((area, i) => <li key={i}>• {area}</li>)}
              </ul>
            </div>
          )}
        </div>
      </div>
    );
  };

  // Render deal breaker alerts
  const renderDealBreakers = () => {
    if (!analysis.dealBreakerMatches || analysis.dealBreakerMatches.length === 0) return null;

    return (
      <div className="p-4 bg-red-900/20 rounded-xl border border-red-500/50 mb-4">
        <h3 className="text-sm font-semibold text-red-400 mb-3 flex items-center gap-2">
          <ShieldAlert className="w-4 h-4" /> Deal Breaker Alerts
        </h3>
        <div className="space-y-2">
          {analysis.dealBreakerMatches.map((match, i) => (
            <div key={i} className={`p-3 rounded-lg border ${match.severity === 'hard' ? 'bg-red-900/30 border-red-700' : 'bg-orange-900/30 border-orange-700'}`}>
              <div className="flex items-start gap-2">
                <AlertOctagon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${match.severity === 'hard' ? 'text-red-400' : 'text-orange-400'}`} />
                <div>
                  <p className="text-sm text-gray-200">
                    <span className="font-medium">Your preference:</span> {match.userDealBreaker}
                  </p>
                  <p className="text-sm text-gray-400 mt-1">
                    <span className="font-medium">Job requires:</span> {match.jobRequirement}
                  </p>
                  <span className={`inline-block mt-2 px-2 py-0.5 rounded text-xs font-medium ${match.severity === 'hard' ? 'bg-red-800 text-red-200' : 'bg-orange-800 text-orange-200'}`}>
                    {match.severity === 'hard' ? 'Hard Deal Breaker' : 'Soft - Negotiable'}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Render detailed skill gaps
  const renderSkillGapsDetailed = () => {
    if (!analysis.skillGapsDetailed || analysis.skillGapsDetailed.length === 0) return null;

    return (
      <div className="p-4 bg-gray-800/30 rounded-xl border border-gray-700/50 mb-4">
        <h3 className="text-sm font-semibold text-orange-400 mb-3 flex items-center gap-2">
          <GraduationCap className="w-4 h-4" /> Skill Gap Analysis
        </h3>
        <div className="space-y-3">
          {analysis.skillGapsDetailed.map((gap, i) => (
            <div key={i} className="p-3 bg-gray-900/50 rounded-lg border border-gray-700/50">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-gray-200">{gap.skill}</span>
                <span className={`px-2 py-0.5 rounded text-xs font-medium border ${getSeverityColor(gap.severity)}`}>
                  {gap.severity}
                </span>
              </div>
              <p className="text-xs text-gray-400 mb-2">{gap.importance}</p>
              <div className="flex flex-wrap gap-2">
                {gap.timeToAcquire && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-gray-800 text-gray-300">
                    <Clock className="w-3 h-3 mr-1" /> {gap.timeToAcquire}
                  </span>
                )}
                {gap.suggestion && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-blue-900/30 text-blue-300">
                    <Lightbulb className="w-3 h-3 mr-1" /> {gap.suggestion}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Render work style compatibility
  const renderWorkStyleMatch = () => {
    if (!analysis.workStyleMatch) return null;

    const { compatible, jobWorkStyle, notes } = analysis.workStyleMatch;

    return (
      <div className={`p-3 rounded-lg border mb-4 ${compatible ? 'bg-green-900/20 border-green-800/50' : 'bg-orange-900/20 border-orange-800/50'}`}>
        <div className="flex items-center gap-2">
          <MapPin className={`w-4 h-4 ${compatible ? 'text-green-400' : 'text-orange-400'}`} />
          <span className="text-sm font-medium text-gray-200">
            Work Style: <span className="capitalize">{jobWorkStyle}</span>
          </span>
          {compatible ? (
            <span className="px-2 py-0.5 rounded text-xs font-medium bg-green-900/30 text-green-300">
              ✓ Matches Your Preference
            </span>
          ) : (
            <span className="px-2 py-0.5 rounded text-xs font-medium bg-orange-900/30 text-orange-300">
              ⚠ Different from preference
            </span>
          )}
        </div>
        {notes && <p className="text-xs text-gray-400 mt-1 ml-6">{notes}</p>}
      </div>
    );
  };

  // Render compensation fit
  const renderCompensationFit = () => {
    if (!analysis.compensationFit) return null;

    const { salaryInRange, assessment, marketComparison, negotiationLeverage } = analysis.compensationFit;

    return (
      <div className={`p-3 rounded-lg border mb-4 ${salaryInRange ? 'bg-green-900/20 border-green-800/50' : 'bg-orange-900/20 border-orange-800/50'}`}>
        <div className="flex items-start gap-2">
          <DollarSign className={`w-4 h-4 mt-0.5 ${salaryInRange ? 'text-green-400' : 'text-orange-400'}`} />
          <div className="flex-1">
            <span className="text-sm font-medium text-gray-200">{assessment}</span>
            {marketComparison && (
              <p className="text-xs text-gray-400 mt-1">{marketComparison}</p>
            )}
            {negotiationLeverage && (
              <p className="text-xs text-blue-400 mt-1">💡 {negotiationLeverage}</p>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderFreelanceResult = (data: FreelanceAnalysis) => (
    <div className="space-y-6">
      {/* Recommendation Banner - Top Priority */}
      {renderRecommendationBanner()}

      {/* Deal Breakers Alert (if any) */}
      {renderDealBreakers()}

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

      {/* Work Style & Compensation Quick Info */}
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2 sm:col-span-1">
          {renderWorkStyleMatch()}
        </div>
        <div className="col-span-2 sm:col-span-1">
          {renderCompensationFit()}
        </div>
      </div>

      {/* Career Alignment */}
      {renderCareerAlignment()}

      {/* Skill Gap Analysis */}
      {renderSkillGapsDetailed()}

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

      {/* Red & Green Flags */}
      {(data.redFlags?.length > 0 || data.greenFlags?.length > 0) && (
        <div className="grid grid-cols-2 gap-4">
          {data.greenFlags?.length > 0 && (
            <div className="p-3 bg-green-900/20 rounded-lg border border-green-800/50">
              <h4 className="text-xs font-bold text-green-400 uppercase mb-2 flex items-center gap-1">
                <CheckCircle className="w-3 h-3" /> Green Flags
              </h4>
              <ul className="text-xs text-gray-300 space-y-1 list-disc list-inside">
                {data.greenFlags.map((flag, i) => <li key={i}>{flag}</li>)}
              </ul>
            </div>
          )}
          {data.redFlags?.length > 0 && (
            <div className="p-3 bg-red-900/20 rounded-lg border border-red-800/50">
              <h4 className="text-xs font-bold text-red-400 uppercase mb-2 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" /> Red Flags
              </h4>
              <ul className="text-xs text-gray-300 space-y-1 list-disc list-inside">
                {data.redFlags.map((flag, i) => <li key={i}>{flag}</li>)}
              </ul>
            </div>
          )}
        </div>
      )}

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
      {/* Recommendation Banner - Top Priority */}
      {renderRecommendationBanner()}

      {/* Deal Breakers Alert (if any) */}
      {renderDealBreakers()}

      {/* Header Stats */}
      <div className="flex gap-4">
        <div className={`flex flex-col items-center justify-center p-4 rounded-xl border ${getScoreColor(data.fitScore)} min-w-[100px]`}>
          <span className="text-3xl font-bold">{data.fitScore}</span>
          <span className="text-xs uppercase tracking-wider opacity-80">Fit Score</span>
        </div>
        <div className="flex-1 p-4 bg-gray-800/50 rounded-xl border border-gray-700">
          <p className="text-sm text-gray-300 italic">"{data.reasoning}"</p>
          <div className="mt-3 flex items-center gap-3 flex-wrap">
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

      {/* Work Style & Compensation Quick Info */}
      {renderWorkStyleMatch()}
      {renderCompensationFit()}

      {/* Career Alignment */}
      {renderCareerAlignment()}

      {/* Skills Match Grid */}
      <div className="grid grid-cols-2 gap-4">
        <div className="p-4 bg-gray-800/30 rounded-xl border border-gray-700/50">
          <h3 className="text-sm font-semibold text-green-400 mb-3 flex items-center gap-2">
            <CheckCircle className="w-4 h-4" /> You Have
          </h3>
          <div className="flex flex-wrap gap-2">
            {data.matchedSkills?.map(skill => (
              <span key={skill} className="px-2 py-1 bg-green-900/30 text-green-300 rounded text-xs border border-green-800">{skill}</span>
            ))}
          </div>
        </div>
        <div className="p-4 bg-gray-800/30 rounded-xl border border-gray-700/50">
          <h3 className="text-sm font-semibold text-red-400 mb-3 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" /> Missing / Gaps
          </h3>
          <div className="flex flex-wrap gap-2">
            {data.missingSkills?.map(skill => (
              <span key={skill} className="px-2 py-1 bg-red-900/30 text-red-300 rounded text-xs border border-red-800">{skill}</span>
            ))}
          </div>
        </div>
      </div>

      {/* Detailed Skill Gap Analysis */}
      {renderSkillGapsDetailed()}

      {/* Red & Green Flags */}
      {(data.redFlags?.length > 0 || data.greenFlags?.length > 0) && (
        <div className="grid grid-cols-2 gap-4">
          {data.greenFlags?.length > 0 && (
            <div className="p-3 bg-green-900/20 rounded-lg border border-green-800/50">
              <h4 className="text-xs font-bold text-green-400 uppercase mb-2 flex items-center gap-1">
                <CheckCircle className="w-3 h-3" /> Green Flags
              </h4>
              <ul className="text-xs text-gray-300 space-y-1 list-disc list-inside">
                {data.greenFlags.map((flag, i) => <li key={i}>{flag}</li>)}
              </ul>
            </div>
          )}
          {data.redFlags?.length > 0 && (
            <div className="p-3 bg-red-900/20 rounded-lg border border-red-800/50">
              <h4 className="text-xs font-bold text-red-400 uppercase mb-2 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" /> Red Flags
              </h4>
              <ul className="text-xs text-gray-300 space-y-1 list-disc list-inside">
                {data.redFlags.map((flag, i) => <li key={i}>{flag}</li>)}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Talking Points */}
      {data.talkingPoints?.length > 0 && (
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
      )}

      {/* Questions to Ask */}
      {data.questionsToAsk?.length > 0 && (
        <div className="p-4 bg-gray-800/30 rounded-xl border border-gray-700/50">
          <h3 className="text-sm font-semibold text-purple-400 mb-3 flex items-center gap-2">
            <Brain className="w-4 h-4" /> Questions to Ask the Hiring Manager
          </h3>
          <ul className="text-sm text-gray-300 space-y-2">
            {data.questionsToAsk.map((q, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="text-purple-400">•</span>
                {q}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );

  return analysis.analysisType === 'freelance' 
    ? renderFreelanceResult(analysis as FreelanceAnalysis)
    : renderFTEResult(analysis as FTEAnalysis);
};