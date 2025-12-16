import React, { useState } from 'react';
import { useUIStore, useApplicationStore, useProfileStore, toast } from '@/src/stores';
import { analyzeJobDescription } from '@/src/services/gemini';
import { Button, Textarea, Card, CardHeader, CardContent } from '@/src/components/ui';
import { AnalysisEmptyState } from '@/src/components/shared';
import { cn } from '@/src/lib/utils';
import type { JDAnalysis } from '@/src/types';
import {
  Search,
  Brain,
  Loader2,
  CheckCircle,
  AlertTriangle,
  MessageCircle,
  DollarSign,
  Clock,
  Target,
  Plus,
  Sparkles,
} from 'lucide-react';
import { Badge } from '@/src/components/ui';

export const AnalyzerPage: React.FC = () => {
  const profile = useProfileStore((s) => s.profile);
  const openModal = useUIStore((s) => s.openModal);
  const addApplication = useApplicationStore((s) => s.addApplication);

  const [jdText, setJdText] = useState('');
  const [analysis, setAnalysis] = useState<JDAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisType, setAnalysisType] = useState<'fulltime' | 'freelance'>('fulltime');

  const handleAnalyze = async () => {
    if (!jdText.trim()) {
      toast.error('Missing job description', 'Please paste a job description to analyze');
      return;
    }

    setIsAnalyzing(true);
    try {
      const result = await analyzeJobDescription(jdText, profile, analysisType);
      setAnalysis(result);
      toast.success('Analysis complete', `Fit score: ${result.fitScore}/10`);
    } catch (error) {
      console.error('Analysis failed:', error);
      toast.error('Analysis failed', 'Please try again');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSaveAsApplication = () => {
    if (!analysis) return;

    // Open modal with pre-filled data
    openModal('application', {
      type: analysisType,
      jobDescriptionRaw: jdText,
      analysis,
      status: 'wishlist',
    });
  };

  const handleClear = () => {
    setJdText('');
    setAnalysis(null);
  };

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-white flex items-center gap-2">
              <Brain className="w-6 h-6 text-blue-500" />
              JD Analyzer
            </h2>
            <p className="text-gray-400 text-sm mt-1">
              Paste a job description to get AI-powered insights and fit analysis
            </p>
          </div>

          {/* Type Toggle */}
          <div className="flex bg-gray-900 p-1 rounded-lg border border-gray-800">
            <button
              onClick={() => setAnalysisType('fulltime')}
              className={cn(
                'px-4 py-1.5 text-sm font-medium rounded transition-colors',
                analysisType === 'fulltime'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-400 hover:text-gray-200'
              )}
            >
              Full-Time
            </button>
            <button
              onClick={() => setAnalysisType('freelance')}
              className={cn(
                'px-4 py-1.5 text-sm font-medium rounded transition-colors',
                analysisType === 'freelance'
                  ? 'bg-purple-600 text-white'
                  : 'text-gray-400 hover:text-gray-200'
              )}
            >
              Freelance
            </button>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Input Panel */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <h3 className="font-semibold text-white">Job Description</h3>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={jdText}
                  onChange={(e) => setJdText(e.target.value)}
                  placeholder="Paste the full job description here..."
                  rows={16}
                  className="font-mono text-sm"
                />
              </CardContent>
            </Card>

            <div className="flex gap-3">
              <Button
                variant="primary"
                onClick={handleAnalyze}
                disabled={!jdText.trim() || isAnalyzing}
                isLoading={isAnalyzing}
                leftIcon={<Sparkles className="w-4 h-4" />}
                className="flex-1"
              >
                {isAnalyzing ? 'Analyzing...' : 'Analyze JD'}
              </Button>
              <Button variant="ghost" onClick={handleClear} disabled={!jdText && !analysis}>
                Clear
              </Button>
            </div>
          </div>

          {/* Results Panel */}
          <div className="space-y-4">
            {analysis ? (
              <>
                <AnalysisResultView analysis={analysis} />
                <Button
                  variant="secondary"
                  onClick={handleSaveAsApplication}
                  leftIcon={<Plus className="w-4 h-4" />}
                  className="w-full"
                >
                  Save as Application
                </Button>
              </>
            ) : (
              <Card className="h-full min-h-[400px] flex items-center justify-center">
                <AnalysisEmptyState />
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Analysis Result View Component
interface AnalysisResultViewProps {
  analysis: JDAnalysis;
}

const AnalysisResultView: React.FC<AnalysisResultViewProps> = ({ analysis }) => {
  const getScoreColor = (score: number) => {
    if (score >= 8) return 'text-green-400 border-green-500/30 bg-green-900/20';
    if (score >= 5) return 'text-yellow-400 border-yellow-500/30 bg-yellow-900/20';
    return 'text-red-400 border-red-500/30 bg-red-900/20';
  };

  if (analysis.analysisType === 'freelance') {
    const data = analysis;
    return (
      <div className="space-y-4">
        {/* Header Stats */}
        <div className="flex gap-4">
          <div
            className={cn(
              'flex flex-col items-center justify-center p-4 rounded-xl border min-w-[100px]',
              getScoreColor(data.fitScore)
            )}
          >
            <span className="text-3xl font-bold">{data.fitScore}</span>
            <span className="text-xs uppercase tracking-wider opacity-80">Fit Score</span>
          </div>
          <div className="flex-1 p-4 bg-gray-800/50 rounded-xl border border-gray-700 space-y-2">
            <p className="text-sm text-gray-300 italic">"{data.reasoning}"</p>
            <div className="flex gap-2">
              <Badge variant="info" size="sm">{data.projectType}</Badge>
              {data.estimatedEffort && (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-700 text-gray-300">
                  <Clock className="w-3 h-3 mr-1" /> {data.estimatedEffort}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Proposal Angle */}
        <Card>
          <CardContent className="p-4 bg-gradient-to-br from-blue-900/20 to-purple-900/20">
            <h3 className="text-sm font-semibold text-blue-300 mb-2 flex items-center gap-2">
              <Target className="w-4 h-4" /> Winning Proposal Strategy
            </h3>
            <p className="text-sm text-gray-300 mb-4">{data.proposalAngle}</p>
            <div className="bg-gray-900/50 p-3 rounded border border-gray-700/50">
              <span className="text-xs font-bold text-gray-500 uppercase block mb-1">Opening Hook</span>
              <p className="text-sm text-white font-medium">"{data.openingHook}"</p>
            </div>
          </CardContent>
        </Card>

        {/* Bid Strategy */}
        <Card>
          <CardContent className="p-4">
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
            <p className="text-xs text-gray-400 border-t border-gray-700 pt-2">
              {data.suggestedBid.rationale}
            </p>
          </CardContent>
        </Card>

        {/* Questions */}
        <Card>
          <CardContent className="p-4">
            <h4 className="text-xs font-bold text-gray-400 uppercase mb-2">Questions for Client</h4>
            <ul className="text-sm text-gray-300 space-y-1 list-disc list-inside">
              {data.questionsForClient?.map((q, i) => (
                <li key={i}>{q}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    );
  }

  // FTE Analysis
  const data = analysis;
  return (
    <div className="space-y-4">
      {/* Header Stats */}
      <div className="flex gap-4">
        <div
          className={cn(
            'flex flex-col items-center justify-center p-4 rounded-xl border min-w-[100px]',
            getScoreColor(data.fitScore)
          )}
        >
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

      {/* Skills Grid */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-4">
            <h3 className="text-sm font-semibold text-green-400 mb-3 flex items-center gap-2">
              <CheckCircle className="w-4 h-4" /> You Have
            </h3>
            <div className="flex flex-wrap gap-2">
              {data.matchedSkills?.map((skill) => (
                <span
                  key={skill}
                  className="px-2 py-1 bg-green-900/30 text-green-300 rounded text-xs border border-green-800"
                >
                  {skill}
                </span>
              ))}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <h3 className="text-sm font-semibold text-red-400 mb-3 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" /> Missing / Gaps
            </h3>
            <div className="flex flex-wrap gap-2">
              {data.missingSkills?.map((skill) => (
                <span
                  key={skill}
                  className="px-2 py-1 bg-red-900/30 text-red-300 rounded text-xs border border-red-800"
                >
                  {skill}
                </span>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Talking Points */}
      <Card>
        <CardContent className="p-4">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-blue-400 mb-3">
            <MessageCircle className="w-4 h-4" /> Talking Points
          </h3>
          <div className="space-y-2">
            {data.talkingPoints?.map((point, i) => (
              <div key={i} className="flex gap-3 p-3 bg-gray-800/50 rounded-lg border border-gray-700/50">
                <span className="text-blue-500 font-mono text-xs mt-0.5">0{i + 1}</span>
                <p className="text-sm text-gray-300">{point}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AnalyzerPage;
