import React, { useState, useMemo } from 'react';
import {
  useUIStore,
  useApplicationStore,
  useCurrentProfile,
  useActiveProfileId,
  useStoriesStore,
  useAnalyzedJobsStore,
  toast,
} from '@/src/stores';
import {
  analyzeJobDescription,
  generateCoverLetter,
  generatePhoneScreenPrep,
  generateTechnicalInterviewPrep,
  generateApplicationStrategy,
  generateSkillsRoadmap,
} from '@/src/services/gemini';
import { Button, Textarea, Card, CardHeader, CardContent, Badge, Input } from '@/src/components/ui';
import { AnalysisEmptyState } from '@/src/components/shared';
import { AnalysisResultView } from '@/components/AnalysisResultView';
import { cn, formatDate, parseMarkdown } from '@/src/lib/utils';
import { JOB_TYPES, COVER_LETTER_STYLES } from '@/src/lib/constants';
import type {
  JDAnalysis,
  AnalyzedJob,
  AnalyzedJobType,
  CoverLetterStyle,
  PhoneScreenPrep,
  TechnicalInterviewPrep,
  ApplicationStrategy,
  SkillsRoadmap,
} from '@/src/types';
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
  FileText,
  Phone,
  Code,
  LineChart,
  History,
  Star,
  Trash2,
  Eye,
  ChevronDown,
  ChevronUp,
  Copy,
  Edit3,
  Save,
  X,
  ArrowLeft,
  BookOpen,
  Briefcase,
  GraduationCap,
  TrendingUp,
  Rocket,
  Award,
  ExternalLink,
  MapPin,
} from 'lucide-react';

type ViewType = 'analyze' | 'history' | 'detail';
type ResultTab = 'overview' | 'cover-letter' | 'phone-prep' | 'tech-prep' | 'strategy' | 'roadmap';

export const AnalyzerPage: React.FC = () => {
  const profile = useCurrentProfile();
  const activeProfileId = useActiveProfileId();
  const allStories = useStoriesStore((s) => s.stories);
  // Filter stories by active profile
  const stories = useMemo(() => {
    if (!activeProfileId) return allStories;
    return allStories.filter((s) => !s.profileId || s.profileId === activeProfileId);
  }, [allStories, activeProfileId]);
  const openModal = useUIStore((s) => s.openModal);

  // Analyzed Jobs Store
  const allAnalyzedJobs = useAnalyzedJobsStore((s) => s.jobs);
  // Filter analyzed jobs by active profile
  const analyzedJobs = useMemo(() => {
    if (!activeProfileId) return allAnalyzedJobs;
    return allAnalyzedJobs.filter((j) => !j.profileId || j.profileId === activeProfileId);
  }, [allAnalyzedJobs, activeProfileId]);
  const addAnalyzedJob = useAnalyzedJobsStore((s) => s.addJob);
  const updateAnalyzedJob = useAnalyzedJobsStore((s) => s.updateJob);
  const deleteAnalyzedJob = useAnalyzedJobsStore((s) => s.deleteJob);
  const addCoverLetter = useAnalyzedJobsStore((s) => s.addCoverLetter);
  const setPhoneScreenPrep = useAnalyzedJobsStore((s) => s.setPhoneScreenPrep);
  const setTechnicalInterviewPrep = useAnalyzedJobsStore((s) => s.setTechnicalInterviewPrep);
  const setApplicationStrategy = useAnalyzedJobsStore((s) => s.setApplicationStrategy);
  const setSkillsRoadmap = useAnalyzedJobsStore((s) => s.setSkillsRoadmap);
  const toggleFavorite = useAnalyzedJobsStore((s) => s.toggleFavorite);

  // View state
  const [view, setView] = useState<ViewType>('analyze');
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [resultTab, setResultTab] = useState<ResultTab>('overview');

  // Analysis state
  const [jdText, setJdText] = useState('');
  const [jobType, setJobType] = useState<AnalyzedJobType>('fulltime');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [currentAnalysis, setCurrentAnalysis] = useState<JDAnalysis | null>(null);
  const [extractedInfo, setExtractedInfo] = useState<{ company?: string; role?: string }>({});

  // Generation states
  const [isGeneratingCoverLetter, setIsGeneratingCoverLetter] = useState(false);
  const [isGeneratingPhonePrep, setIsGeneratingPhonePrep] = useState(false);
  const [isGeneratingTechPrep, setIsGeneratingTechPrep] = useState(false);
  const [isGeneratingStrategy, setIsGeneratingStrategy] = useState(false);
  const [isGeneratingRoadmap, setIsGeneratingRoadmap] = useState(false);
  const [isReanalyzing, setIsReanalyzing] = useState(false);
  const [coverLetterStyle, setCoverLetterStyle] = useState<CoverLetterStyle>('professional');

  // History search
  const [historySearch, setHistorySearch] = useState('');
  const [reanalyzingJobId, setReanalyzingJobId] = useState<string | null>(null);

  // Get selected job
  const selectedJob = useMemo(
    () => (selectedJobId ? analyzedJobs.find((j) => j.id === selectedJobId) : null),
    [selectedJobId, analyzedJobs]
  );

  // Filter history
  const filteredHistory = useMemo(() => {
    if (!historySearch.trim()) return analyzedJobs;
    const query = historySearch.toLowerCase();
    return analyzedJobs.filter(
      (j) =>
        j.company?.toLowerCase().includes(query) ||
        j.role?.toLowerCase().includes(query) ||
        j.jobDescription.toLowerCase().includes(query)
    );
  }, [analyzedJobs, historySearch]);

  // Handle analyze
  const handleAnalyze = async () => {
    if (!jdText.trim()) {
      toast.error('Missing job description', 'Please paste a job description to analyze');
      return;
    }

    setIsAnalyzing(true);
    try {
      const result = await analyzeJobDescription(jdText, profile, jobType);
      setCurrentAnalysis(result);

      // Try to extract company/role from JD (simple extraction)
      const companyMatch = jdText.match(/(?:at|@|company[:\s]+)([A-Z][a-zA-Z\s]+?)(?:\.|,|\n|$)/i);
      const roleMatch = jdText.match(/(?:title|position|role)[:\s]+(.+?)(?:\.|,|\n|$)/i);

      setExtractedInfo({
        company: companyMatch?.[1]?.trim(),
        role: roleMatch?.[1]?.trim(),
      });

      toast.success('Analysis complete', `Fit score: ${result.fitScore}/10`);
    } catch (error) {
      console.error('Analysis failed:', error);
      toast.error('Analysis failed', 'Please try again');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Save analysis
  const handleSaveAnalysis = () => {
    if (!currentAnalysis) return;

    const newJob = addAnalyzedJob({
      jobDescription: jdText,
      type: jobType,
      company: extractedInfo.company,
      role: extractedInfo.role,
      analysis: currentAnalysis,
    }, activeProfileId || undefined);

    toast.success('Analysis saved', 'You can access it from history');
    setSelectedJobId(newJob.id);
    setView('detail');
    setResultTab('overview');

    // Clear form
    setJdText('');
    setCurrentAnalysis(null);
    setExtractedInfo({});
  };

  // Save as application
  const handleSaveAsApplication = () => {
    if (!currentAnalysis) return;

    openModal('application', {
      type: jobType,
      jobDescriptionRaw: jdText,
      analysis: currentAnalysis,
      status: 'wishlist',
    });
  };

  // Generate cover letter
  const handleGenerateCoverLetter = async () => {
    if (!selectedJob) return;

    setIsGeneratingCoverLetter(true);
    try {
      const result = await generateCoverLetter({
        jobDescription: selectedJob.jobDescription,
        analysis: selectedJob.analysis,
        profile,
        stories,
        style: coverLetterStyle,
        company: selectedJob.company,
        role: selectedJob.role,
      });

      addCoverLetter(selectedJob.id, {
        style: coverLetterStyle,
        content: result.content,
        keyPoints: result.keyPoints,
        wordCount: result.wordCount,
        generatedAt: new Date().toISOString(),
      });

      toast.success('Cover letter generated', `${result.wordCount} words`);
    } catch (error) {
      console.error('Cover letter generation failed:', error);
      toast.error('Generation failed', 'Please try again');
    } finally {
      setIsGeneratingCoverLetter(false);
    }
  };

  // Generate phone screen prep
  const handleGeneratePhonePrep = async () => {
    if (!selectedJob) return;

    setIsGeneratingPhonePrep(true);
    try {
      const result = await generatePhoneScreenPrep({
        jobDescription: selectedJob.jobDescription,
        analysis: selectedJob.analysis,
        profile,
        stories,
        company: selectedJob.company,
        role: selectedJob.role,
      });

      setPhoneScreenPrep(selectedJob.id, result);
      toast.success('Phone screen prep ready');
    } catch (error) {
      console.error('Phone prep generation failed:', error);
      toast.error('Generation failed', 'Please try again');
    } finally {
      setIsGeneratingPhonePrep(false);
    }
  };

  // Generate technical prep
  const handleGenerateTechPrep = async () => {
    if (!selectedJob) return;

    setIsGeneratingTechPrep(true);
    try {
      const result = await generateTechnicalInterviewPrep({
        jobDescription: selectedJob.jobDescription,
        analysis: selectedJob.analysis,
        profile,
        stories,
        company: selectedJob.company,
        role: selectedJob.role,
      });

      setTechnicalInterviewPrep(selectedJob.id, result);
      toast.success('Technical interview prep ready');
    } catch (error) {
      console.error('Tech prep generation failed:', error);
      toast.error('Generation failed', 'Please try again');
    } finally {
      setIsGeneratingTechPrep(false);
    }
  };

  // Generate application strategy
  const handleGenerateStrategy = async () => {
    if (!selectedJob) return;

    setIsGeneratingStrategy(true);
    try {
      const result = await generateApplicationStrategy({
        jobDescription: selectedJob.jobDescription,
        analysis: selectedJob.analysis,
        profile,
        stories,
        company: selectedJob.company,
        role: selectedJob.role,
      });

      setApplicationStrategy(selectedJob.id, result);
      toast.success('Application strategy ready');
    } catch (error) {
      console.error('Strategy generation failed:', error);
      toast.error('Generation failed', 'Please try again');
    } finally {
      setIsGeneratingStrategy(false);
    }
  };

  // Generate skills roadmap
  const handleGenerateRoadmap = async () => {
    if (!selectedJob) return;

    setIsGeneratingRoadmap(true);
    try {
      const result = await generateSkillsRoadmap({
        jobDescription: selectedJob.jobDescription,
        analysis: selectedJob.analysis,
        profile,
        company: selectedJob.company,
        role: selectedJob.role,
      });

      setSkillsRoadmap(selectedJob.id, result);
      toast.success('Skills roadmap ready', 'Your learning path has been created');
    } catch (error) {
      console.error('Roadmap generation failed:', error);
      toast.error('Generation failed', 'Please try again');
    } finally {
      setIsGeneratingRoadmap(false);
    }
  };

  // Re-analyze existing job with current profile
  const handleReanalyze = async () => {
    if (!selectedJob) return;

    setIsReanalyzing(true);
    try {
      const result = await analyzeJobDescription(
        selectedJob.jobDescription,
        profile,
        selectedJob.type
      );

      // Update the job with new analysis
      updateAnalyzedJob(selectedJob.id, {
        analysis: result,
        updatedAt: new Date().toISOString(),
      });

      toast.success(
        'Re-analysis complete',
        `New fit score: ${result.fitScore}/10 (was ${selectedJob.analysis.fitScore}/10)`
      );
    } catch (error) {
      console.error('Re-analysis failed:', error);
      toast.error('Re-analysis failed', 'Please try again');
    } finally {
      setIsReanalyzing(false);
    }
  };

  // Re-analyze job from history list
  const handleReanalyzeFromList = async (job: AnalyzedJob) => {
    setReanalyzingJobId(job.id);
    try {
      const result = await analyzeJobDescription(
        job.jobDescription,
        profile,
        job.type
      );

      // Update the job with new analysis
      updateAnalyzedJob(job.id, {
        analysis: result,
        updatedAt: new Date().toISOString(),
      });

      toast.success(
        'Re-analysis complete',
        `New fit score: ${result.fitScore}/10 (was ${job.analysis.fitScore}/10)`
      );
    } catch (error) {
      console.error('Re-analysis failed:', error);
      toast.error('Re-analysis failed', 'Please try again');
    } finally {
      setReanalyzingJobId(null);
    }
  };

  // View job detail
  const viewJobDetail = (jobId: string) => {
    setSelectedJobId(jobId);
    setView('detail');
    setResultTab('overview');
  };

  // Copy to clipboard
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  // Markdown renderer
  const MarkdownContent: React.FC<{ content: string; className?: string }> = ({ content, className }) => (
    <div
      className={cn('text-gray-300 text-sm leading-relaxed', className)}
      dangerouslySetInnerHTML={{ __html: parseMarkdown(content) }}
    />
  );

  // Score color helper
  const getScoreColor = (score: number) => {
    if (score >= 8) return 'text-green-400 border-green-500/30 bg-green-900/20';
    if (score >= 5) return 'text-yellow-400 border-yellow-500/30 bg-yellow-900/20';
    return 'text-red-400 border-red-500/30 bg-red-900/20';
  };

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {view !== 'analyze' && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setView('analyze');
                  setSelectedJobId(null);
                }}
              >
                <ArrowLeft className="w-4 h-4 mr-1" />
                Back
              </Button>
            )}
            <div>
              <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                <Brain className="w-6 h-6 text-blue-500" />
                {view === 'analyze' && 'JD Analyzer'}
                {view === 'history' && 'Analysis History'}
                {view === 'detail' && (selectedJob?.company || 'Job Details')}
              </h2>
              <p className="text-gray-400 text-sm mt-1">
                {view === 'analyze' && 'Paste a job description to get AI-powered insights'}
                {view === 'history' && `${analyzedJobs.length} analyzed jobs`}
                {view === 'detail' && selectedJob?.role}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {view === 'analyze' && (
              <Button
                variant="ghost"
                onClick={() => setView('history')}
                leftIcon={<History className="w-4 h-4" />}
                className="text-gray-400"
              >
                History ({analyzedJobs.length})
              </Button>
            )}
          </div>
        </div>

        {/* ANALYZE VIEW */}
        {view === 'analyze' && (
          <>
            {/* Job Type Toggle */}
            <div className="flex justify-center">
              <div className="flex bg-gray-900 p-1 rounded-lg border border-gray-800">
                {JOB_TYPES.map((type) => (
                  <button
                    key={type.value}
                    onClick={() => setJobType(type.value as AnalyzedJobType)}
                    className={cn(
                      'px-4 py-1.5 text-sm font-medium rounded transition-colors',
                      jobType === type.value
                        ? type.value === 'fulltime'
                          ? 'bg-blue-600 text-white'
                          : type.value === 'contract'
                            ? 'bg-orange-600 text-white'
                            : 'bg-purple-600 text-white'
                        : 'text-gray-400 hover:text-gray-200'
                    )}
                    title={type.description}
                  >
                    {type.label}
                  </button>
                ))}
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
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setJdText('');
                      setCurrentAnalysis(null);
                    }}
                    disabled={!jdText && !currentAnalysis}
                  >
                    Clear
                  </Button>
                </div>
              </div>

              {/* Results Panel */}
              <div className="space-y-4">
                {currentAnalysis ? (
                  <>
                    <AnalysisResultView analysis={currentAnalysis} />
                    <div className="flex gap-3">
                      <Button
                        variant="primary"
                        onClick={handleSaveAnalysis}
                        leftIcon={<Save className="w-4 h-4" />}
                        className="flex-1 bg-green-600 hover:bg-green-500"
                      >
                        Save Analysis
                      </Button>
                      <Button
                        variant="secondary"
                        onClick={handleSaveAsApplication}
                        leftIcon={<Plus className="w-4 h-4" />}
                      >
                        Add to Apps
                      </Button>
                    </div>
                  </>
                ) : (
                  <Card className="h-full min-h-[400px] flex items-center justify-center">
                    <AnalysisEmptyState />
                  </Card>
                )}
              </div>
            </div>
          </>
        )}

        {/* HISTORY VIEW */}
        {view === 'history' && (
          <div className="space-y-4">
            {/* Search */}
            <Input
              value={historySearch}
              onChange={(e) => setHistorySearch(e.target.value)}
              placeholder="Search analyzed jobs..."
              leftIcon={<Search className="w-4 h-4" />}
            />

            {filteredHistory.length > 0 ? (
              <div className="space-y-3">
                {filteredHistory.map((job) => (
                  <Card
                    key={job.id}
                    className="p-4 cursor-pointer hover:border-gray-600 transition-colors"
                    onClick={() => viewJobDetail(job.id)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span
                            className={cn(
                              'px-2 py-0.5 rounded text-xs font-medium',
                              job.type === 'fulltime'
                                ? 'bg-blue-900/30 text-blue-400'
                                : job.type === 'contract'
                                  ? 'bg-orange-900/30 text-orange-400'
                                  : 'bg-purple-900/30 text-purple-400'
                            )}
                          >
                            {job.type}
                          </span>
                          <span className={cn('font-mono text-sm', getScoreColor(job.analysis.fitScore).split(' ')[0])}>
                            {job.analysis.fitScore}/10
                          </span>
                          {job.isFavorite && <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />}
                        </div>
                        <h3 className="font-semibold text-white">
                          {job.role || 'Untitled Role'} {job.company && `at ${job.company}`}
                        </h3>
                        <p className="text-gray-400 text-sm line-clamp-1 mt-1">
                          {job.analysis.reasoning}
                        </p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                          <span>{formatDate(job.createdAt)}</span>
                          {job.coverLetters.length > 0 && (
                            <span className="flex items-center gap-1">
                              <FileText className="w-3 h-3" />
                              {job.coverLetters.length} cover letter{job.coverLetters.length > 1 ? 's' : ''}
                            </span>
                          )}
                          {job.phoneScreenPrep && (
                            <span className="flex items-center gap-1 text-green-400">
                              <Phone className="w-3 h-3" />
                              Phone prep
                            </span>
                          )}
                          {job.technicalInterviewPrep && (
                            <span className="flex items-center gap-1 text-blue-400">
                              <Code className="w-3 h-3" />
                              Tech prep
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleReanalyzeFromList(job);
                          }}
                          disabled={reanalyzingJobId === job.id}
                          title="Re-analyze with current profile"
                          className="text-blue-400 hover:text-blue-300"
                        >
                          {reanalyzingJobId === job.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Sparkles className="w-4 h-4" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleFavorite(job.id);
                          }}
                        >
                          <Star className={cn('w-4 h-4', job.isFavorite ? 'text-yellow-400 fill-yellow-400' : 'text-gray-500')} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteAnalyzedJob(job.id);
                            toast.success('Deleted');
                          }}
                          className="text-red-400 hover:text-red-300"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="p-12 text-center">
                <History className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-white mb-2">No Analyzed Jobs</h3>
                <p className="text-gray-400 mb-4">
                  Analyze job descriptions to build your history
                </p>
                <Button variant="primary" onClick={() => setView('analyze')}>
                  <Plus className="w-4 h-4 mr-2" />
                  Analyze a Job
                </Button>
              </Card>
            )}
          </div>
        )}

        {/* DETAIL VIEW */}
        {view === 'detail' && selectedJob && (
          <div className="space-y-6">
            {/* Tab Navigation */}
            <div className="flex gap-1 p-1 bg-gray-900 rounded-lg border border-gray-800 overflow-x-auto">
              {[
                { id: 'overview', label: 'Overview', icon: Eye },
                { id: 'cover-letter', label: 'Cover Letter', icon: FileText },
                { id: 'phone-prep', label: 'Phone Screen', icon: Phone },
                { id: 'tech-prep', label: 'Technical', icon: Code },
                { id: 'strategy', label: 'Strategy', icon: LineChart },
                { id: 'roadmap', label: 'Skills Roadmap', icon: GraduationCap, highlight: selectedJob.analysis.fitScore < 7 },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setResultTab(tab.id as ResultTab)}
                  className={cn(
                    'flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium whitespace-nowrap transition-colors',
                    resultTab === tab.id
                      ? 'bg-blue-600 text-white'
                      : 'highlight' in tab && tab.highlight
                        ? 'text-yellow-400 hover:text-yellow-300 hover:bg-yellow-900/20 border border-yellow-700/50'
                        : 'text-gray-400 hover:text-white hover:bg-gray-800'
                  )}
                >
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                  {'highlight' in tab && tab.highlight && (
                    <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
                  )}
                </button>
              ))}
            </div>

            {/* Overview Tab */}
            {resultTab === 'overview' && (
              <div className="grid lg:grid-cols-2 gap-6">
                <div>
                  <AnalysisResultView analysis={selectedJob.analysis} />
                </div>
                <div className="space-y-4">
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-sm font-bold text-gray-400 uppercase">Job Description</h4>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={handleReanalyze}
                          disabled={isReanalyzing}
                          isLoading={isReanalyzing}
                          leftIcon={<Sparkles className="w-4 h-4" />}
                          title="Re-analyze with your current profile to get updated insights"
                        >
                          {isReanalyzing ? 'Analyzing...' : 'Re-analyze'}
                        </Button>
                      </div>
                      <p className="text-xs text-gray-500 mb-3">
                        Re-analyze to get updated recommendations based on your current profile.
                      </p>
                      <div className="max-h-[400px] overflow-y-auto text-sm text-gray-300 whitespace-pre-wrap">
                        {selectedJob.jobDescription}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}

            {/* Cover Letter Tab */}
            {resultTab === 'cover-letter' && (
              <div className="space-y-4">
                {/* Generator */}
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="font-semibold text-white">Generate Cover Letter</h4>
                      <div className="flex items-center gap-3">
                        <select
                          value={coverLetterStyle}
                          onChange={(e) => setCoverLetterStyle(e.target.value as CoverLetterStyle)}
                          className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-gray-300"
                        >
                          {COVER_LETTER_STYLES.map((style) => (
                            <option key={style.value} value={style.value}>
                              {style.label}
                            </option>
                          ))}
                        </select>
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={handleGenerateCoverLetter}
                          disabled={isGeneratingCoverLetter}
                          isLoading={isGeneratingCoverLetter}
                          leftIcon={<Sparkles className="w-4 h-4" />}
                        >
                          Generate
                        </Button>
                      </div>
                    </div>
                    <p className="text-sm text-gray-400">
                      {COVER_LETTER_STYLES.find((s) => s.value === coverLetterStyle)?.description}
                    </p>
                  </CardContent>
                </Card>

                {/* Saved Cover Letters */}
                {selectedJob.coverLetters.length > 0 ? (
                  <div className="space-y-4">
                    {selectedJob.coverLetters.map((cl) => (
                      <Card key={cl.id}>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <Badge variant="info" size="sm">{cl.style}</Badge>
                              <span className="text-xs text-gray-500">{cl.wordCount} words</span>
                              <span className="text-xs text-gray-500">{formatDate(cl.generatedAt)}</span>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => copyToClipboard(cl.editedContent || cl.content)}
                            >
                              <Copy className="w-4 h-4 mr-1" />
                              Copy
                            </Button>
                          </div>
                          <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-700 whitespace-pre-wrap text-sm text-gray-300">
                            {cl.editedContent || cl.content}
                          </div>
                          {cl.keyPoints.length > 0 && (
                            <div className="mt-3 pt-3 border-t border-gray-700">
                              <span className="text-xs font-bold text-gray-500 uppercase">Key Points</span>
                              <ul className="mt-1 space-y-1">
                                {cl.keyPoints.map((point, i) => (
                                  <li key={i} className="text-xs text-gray-400 flex items-start gap-2">
                                    <CheckCircle className="w-3 h-3 text-green-400 mt-0.5 flex-shrink-0" />
                                    {point}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <Card className="p-8 text-center">
                    <FileText className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                    <p className="text-gray-400">No cover letters generated yet</p>
                  </Card>
                )}
              </div>
            )}

            {/* Phone Screen Prep Tab */}
            {resultTab === 'phone-prep' && (
              <div className="space-y-4">
                {!selectedJob.phoneScreenPrep ? (
                  <Card className="p-8 text-center">
                    <Phone className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-white mb-2">Phone Screen Prep</h3>
                    <p className="text-gray-400 mb-4">
                      Generate preparation materials for your phone screen interview
                    </p>
                    <Button
                      variant="primary"
                      onClick={handleGeneratePhonePrep}
                      disabled={isGeneratingPhonePrep}
                      isLoading={isGeneratingPhonePrep}
                      leftIcon={<Sparkles className="w-4 h-4" />}
                    >
                      Generate Phone Prep
                    </Button>
                  </Card>
                ) : (
                  <PhoneScreenPrepView prep={selectedJob.phoneScreenPrep} />
                )}
              </div>
            )}

            {/* Technical Interview Prep Tab */}
            {resultTab === 'tech-prep' && (
              <div className="space-y-4">
                {!selectedJob.technicalInterviewPrep ? (
                  <Card className="p-8 text-center">
                    <Code className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-white mb-2">Technical Interview Prep</h3>
                    <p className="text-gray-400 mb-4">
                      Get tailored preparation for technical interviews
                    </p>
                    <Button
                      variant="primary"
                      onClick={handleGenerateTechPrep}
                      disabled={isGeneratingTechPrep}
                      isLoading={isGeneratingTechPrep}
                      leftIcon={<Sparkles className="w-4 h-4" />}
                    >
                      Generate Tech Prep
                    </Button>
                  </Card>
                ) : (
                  <TechnicalInterviewPrepView prep={selectedJob.technicalInterviewPrep} stories={stories} />
                )}
              </div>
            )}

            {/* Application Strategy Tab */}
            {resultTab === 'strategy' && (
              <div className="space-y-4">
                {!selectedJob.applicationStrategy ? (
                  <Card className="p-8 text-center">
                    <LineChart className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-white mb-2">Application Strategy</h3>
                    <p className="text-gray-400 mb-4">
                      Get strategic advice on how to approach this application
                    </p>
                    <Button
                      variant="primary"
                      onClick={handleGenerateStrategy}
                      disabled={isGeneratingStrategy}
                      isLoading={isGeneratingStrategy}
                      leftIcon={<Sparkles className="w-4 h-4" />}
                    >
                      Generate Strategy
                    </Button>
                  </Card>
                ) : (
                  <ApplicationStrategyView strategy={selectedJob.applicationStrategy} />
                )}
              </div>
            )}

            {/* Skills Roadmap Tab */}
            {resultTab === 'roadmap' && (
              <div className="space-y-4">
                {!selectedJob.skillsRoadmap ? (
                  <Card className="p-8 text-center">
                    <GraduationCap className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-white mb-2">Skills Roadmap</h3>
                    <p className="text-gray-400 mb-4 max-w-md mx-auto">
                      {selectedJob.analysis.fitScore < 7
                        ? "This role has some skill gaps. Generate a personalized learning roadmap to become a strong candidate."
                        : "Generate a roadmap to strengthen your candidacy and prepare for future career growth."}
                    </p>
                    <Button
                      variant="primary"
                      onClick={handleGenerateRoadmap}
                      disabled={isGeneratingRoadmap}
                      isLoading={isGeneratingRoadmap}
                      leftIcon={<Sparkles className="w-4 h-4" />}
                      className={selectedJob.analysis.fitScore < 7 ? 'bg-yellow-600 hover:bg-yellow-500' : ''}
                    >
                      Generate Learning Path
                    </Button>
                  </Card>
                ) : (
                  <SkillsRoadmapView roadmap={selectedJob.skillsRoadmap} />
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// Phone Screen Prep View
const PhoneScreenPrepView: React.FC<{ prep: PhoneScreenPrep }> = ({ prep }) => {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['elevator', 'questions']));

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(section)) next.delete(section);
      else next.add(section);
      return next;
    });
  };

  return (
    <div className="space-y-4">
      {/* Elevator Pitch */}
      <Card>
        <CardContent className="p-4 bg-gradient-to-br from-blue-900/20 to-purple-900/20">
          <h4 className="text-sm font-semibold text-blue-300 mb-2">Your Elevator Pitch</h4>
          <p className="text-sm text-white">{prep.elevatorPitch}</p>
        </CardContent>
      </Card>

      {/* Likely Questions */}
      <Card>
        <button
          onClick={() => toggleSection('questions')}
          className="w-full p-4 flex items-center justify-between text-left"
        >
          <h4 className="font-semibold text-white flex items-center gap-2">
            <MessageCircle className="w-4 h-4 text-yellow-400" />
            Likely Questions ({prep.likelyQuestions.length})
          </h4>
          {expandedSections.has('questions') ? (
            <ChevronUp className="w-4 h-4 text-gray-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-gray-400" />
          )}
        </button>
        {expandedSections.has('questions') && (
          <CardContent className="pt-0 px-4 pb-4">
            <div className="space-y-3">
              {prep.likelyQuestions.map((q, i) => (
                <div key={i} className="bg-gray-800/50 p-3 rounded-lg border border-gray-700">
                  <p className="text-sm font-medium text-white mb-2">Q: {q.question}</p>
                  <p className="text-sm text-gray-400">A: {q.suggestedAnswer}</p>
                </div>
              ))}
            </div>
          </CardContent>
        )}
      </Card>

      {/* Talking Points */}
      <Card>
        <CardContent className="p-4">
          <h4 className="text-sm font-semibold text-green-400 mb-3">Key Talking Points</h4>
          <ul className="space-y-2">
            {prep.talkingPoints.map((point, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-gray-300">
                <CheckCircle className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                {point}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {/* Questions to Ask */}
      <Card>
        <CardContent className="p-4">
          <h4 className="text-sm font-semibold text-blue-400 mb-3">Questions to Ask</h4>
          <ul className="space-y-2">
            {prep.questionsToAsk.map((q, i) => (
              <li key={i} className="text-sm text-gray-300 p-2 bg-gray-800/50 rounded">
                {q}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {/* Closing Statement */}
      <Card>
        <CardContent className="p-4">
          <h4 className="text-sm font-semibold text-purple-400 mb-2">Closing Statement</h4>
          <p className="text-sm text-gray-300 italic">"{prep.closingStatement}"</p>
        </CardContent>
      </Card>
    </div>
  );
};

// Technical Interview Prep View
const TechnicalInterviewPrepView: React.FC<{ prep: TechnicalInterviewPrep; stories: any[] }> = ({ prep, stories }) => {
  return (
    <div className="space-y-4">
      {/* Focus Areas */}
      <Card>
        <CardContent className="p-4">
          <h4 className="text-sm font-semibold text-blue-400 mb-3">Focus Areas</h4>
          <div className="flex flex-wrap gap-2">
            {prep.focusAreas.map((area, i) => (
              <Badge key={i} variant="info" size="sm">{area}</Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Likely Topics */}
      <Card>
        <CardContent className="p-4">
          <h4 className="text-sm font-semibold text-yellow-400 mb-3">Topics to Study</h4>
          <div className="space-y-2">
            {prep.likelyTopics.map((topic, i) => (
              <div key={i} className="flex items-start gap-3 p-3 bg-gray-800/50 rounded-lg border border-gray-700">
                <span
                  className={cn(
                    'px-2 py-0.5 rounded text-xs font-bold uppercase',
                    topic.depth === 'deep'
                      ? 'bg-red-900/30 text-red-400'
                      : topic.depth === 'intermediate'
                        ? 'bg-yellow-900/30 text-yellow-400'
                        : 'bg-gray-700 text-gray-400'
                  )}
                >
                  {topic.depth}
                </span>
                <div className="flex-1">
                  <p className="font-medium text-white">{topic.topic}</p>
                  <p className="text-xs text-gray-400 mt-1">{topic.notes}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* System Design Topics */}
      {prep.systemDesignTopics.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <h4 className="text-sm font-semibold text-purple-400 mb-3">System Design Topics</h4>
            <ul className="space-y-1">
              {prep.systemDesignTopics.map((topic, i) => (
                <li key={i} className="text-sm text-gray-300">• {topic}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Coding Patterns */}
      {prep.codingPatterns.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <h4 className="text-sm font-semibold text-green-400 mb-3">Coding Patterns to Review</h4>
            <div className="flex flex-wrap gap-2">
              {prep.codingPatterns.map((pattern, i) => (
                <span key={i} className="px-2 py-1 bg-green-900/30 text-green-300 rounded text-xs border border-green-800">
                  {pattern}
                </span>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Study Resources */}
      {prep.studyResources.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <h4 className="text-sm font-semibold text-orange-400 mb-3">Study Resources</h4>
            <div className="space-y-2">
              {prep.studyResources.map((resource, i) => (
                <div key={i} className="flex items-center gap-3 text-sm">
                  <span
                    className={cn(
                      'px-1.5 py-0.5 rounded text-xs',
                      resource.priority === 'high'
                        ? 'bg-red-900/30 text-red-400'
                        : resource.priority === 'medium'
                          ? 'bg-yellow-900/30 text-yellow-400'
                          : 'bg-gray-700 text-gray-400'
                    )}
                  >
                    {resource.priority}
                  </span>
                  <span className="text-gray-300">{resource.topic}:</span>
                  <span className="text-blue-400">{resource.resource}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

// Application Strategy View
const ApplicationStrategyView: React.FC<{ strategy: ApplicationStrategy }> = ({ strategy }) => {
  const getCompetitivenessColor = (level: string) => {
    if (level === 'strong') return 'text-green-400 bg-green-900/30 border-green-700';
    if (level === 'moderate') return 'text-yellow-400 bg-yellow-900/30 border-yellow-700';
    return 'text-red-400 bg-red-900/30 border-red-700';
  };

  return (
    <div className="space-y-4">
      {/* Fit Assessment */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-start gap-4">
            <div
              className={cn(
                'px-4 py-3 rounded-xl border text-center min-w-[80px]',
                getCompetitivenessColor(strategy.fitAssessment.competitiveness)
              )}
            >
              <span className="text-2xl font-bold">{strategy.fitAssessment.score}</span>
              <span className="text-xs block uppercase">{strategy.fitAssessment.competitiveness}</span>
            </div>
            <div className="flex-1">
              <p className="text-sm text-gray-300">{strategy.fitAssessment.summary}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Strengths & Gaps */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-4">
            <h4 className="text-sm font-semibold text-green-400 mb-3">Strengths</h4>
            <ul className="space-y-1">
              {strategy.fitAssessment.strengths.map((s, i) => (
                <li key={i} className="text-sm text-gray-300 flex items-start gap-2">
                  <CheckCircle className="w-3 h-3 text-green-400 mt-1 flex-shrink-0" />
                  {s}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <h4 className="text-sm font-semibold text-yellow-400 mb-3">Gaps to Address</h4>
            <ul className="space-y-1">
              {strategy.fitAssessment.gaps.map((g, i) => (
                <li key={i} className="text-sm text-gray-300 flex items-start gap-2">
                  <AlertTriangle className="w-3 h-3 text-yellow-400 mt-1 flex-shrink-0" />
                  {g}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Application Timing */}
      <Card>
        <CardContent className="p-4">
          <h4 className="text-sm font-semibold text-blue-400 mb-2">Application Timing</h4>
          <p className="text-sm text-gray-300">{strategy.applicationTiming}</p>
        </CardContent>
      </Card>

      {/* Customization Tips */}
      <Card>
        <CardContent className="p-4">
          <h4 className="text-sm font-semibold text-purple-400 mb-3">Customization Tips</h4>
          <ul className="space-y-2">
            {strategy.customizationTips.map((tip, i) => (
              <li key={i} className="text-sm text-gray-300 p-2 bg-gray-800/50 rounded">
                {tip}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {/* Application Checklist */}
      <Card>
        <CardContent className="p-4">
          <h4 className="text-sm font-semibold text-green-400 mb-3">Application Checklist</h4>
          <div className="space-y-2">
            {strategy.applicationChecklist.map((item, i) => (
              <div key={i} className="flex items-center gap-3">
                <span
                  className={cn(
                    'px-2 py-0.5 rounded text-xs',
                    item.priority === 'required'
                      ? 'bg-red-900/30 text-red-400'
                      : item.priority === 'recommended'
                        ? 'bg-yellow-900/30 text-yellow-400'
                        : 'bg-gray-700 text-gray-400'
                  )}
                >
                  {item.priority}
                </span>
                <span className="text-sm text-gray-300">{item.item}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Follow-up Strategy */}
      <Card>
        <CardContent className="p-4">
          <h4 className="text-sm font-semibold text-orange-400 mb-2">Follow-up Strategy</h4>
          <p className="text-sm text-gray-300">{strategy.followUpStrategy}</p>
        </CardContent>
      </Card>
    </div>
  );
};

// Skills Roadmap View
const SkillsRoadmapView: React.FC<{ roadmap: SkillsRoadmap }> = ({ roadmap }) => {
  const [expandedSkills, setExpandedSkills] = useState<Set<string>>(new Set());

  const toggleSkill = (skill: string) => {
    setExpandedSkills((prev) => {
      const next = new Set(prev);
      if (next.has(skill)) next.delete(skill);
      else next.add(skill);
      return next;
    });
  };

  const getPriorityColor = (priority: string) => {
    if (priority === 'critical') return 'bg-red-900/30 text-red-400 border-red-700';
    if (priority === 'important') return 'bg-yellow-900/30 text-yellow-400 border-yellow-700';
    return 'bg-gray-700 text-gray-400 border-gray-600';
  };

  const getLevelColor = (level: string) => {
    if (level === 'none') return 'text-red-400';
    if (level === 'beginner') return 'text-orange-400';
    if (level === 'intermediate') return 'text-yellow-400';
    if (level === 'advanced') return 'text-green-400';
    return 'text-blue-400';
  };

  const getCostBadge = (cost: string) => {
    if (cost === 'free') return 'bg-green-900/30 text-green-400';
    if (cost === 'paid') return 'bg-purple-900/30 text-purple-400';
    return 'bg-blue-900/30 text-blue-400';
  };

  return (
    <div className="space-y-6">
      {/* Summary Header */}
      <Card>
        <CardContent className="p-4 bg-gradient-to-br from-yellow-900/20 to-orange-900/20">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="font-semibold text-white flex items-center gap-2">
                <Rocket className="w-5 h-5 text-yellow-400" />
                Your Learning Path
              </h3>
              <p className="text-sm text-gray-300 mt-1">{roadmap.summary}</p>
            </div>
            <div className="text-right">
              <div className="flex items-center gap-2 text-sm">
                <span className="text-gray-400">Current Fit:</span>
                <span className={cn(
                  'font-bold',
                  roadmap.currentFitScore >= 7 ? 'text-green-400' : roadmap.currentFitScore >= 5 ? 'text-yellow-400' : 'text-red-400'
                )}>
                  {roadmap.currentFitScore}/10
                </span>
                <TrendingUp className="w-4 h-4 text-gray-500" />
                <span className="font-bold text-green-400">{roadmap.targetFitScore}/10</span>
              </div>
              <div className="text-xs text-gray-500 mt-1 flex items-center gap-1 justify-end">
                <Clock className="w-3 h-3" />
                Est. time: {roadmap.totalEstimatedTime}
              </div>
            </div>
          </div>

          {/* Quick Wins */}
          {roadmap.quickWins.length > 0 && (
            <div className="mt-4 p-3 bg-green-900/20 rounded-lg border border-green-800/50">
              <h4 className="text-xs font-bold text-green-400 uppercase mb-2 flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> Quick Wins - Do This Week
              </h4>
              <ul className="space-y-1">
                {roadmap.quickWins.map((win, i) => (
                  <li key={i} className="text-sm text-gray-300 flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                    {win}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Skill Gaps */}
      <Card>
        <CardHeader>
          <h3 className="font-semibold text-white flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-blue-400" />
            Skills to Develop ({roadmap.skillGaps.length})
          </h3>
        </CardHeader>
        <CardContent className="p-4 space-y-3">
          {roadmap.skillGaps.map((gap, i) => (
            <div
              key={i}
              className="bg-gray-800/50 rounded-lg border border-gray-700 overflow-hidden"
            >
              <button
                onClick={() => toggleSkill(gap.skill)}
                className="w-full p-3 flex items-center justify-between text-left hover:bg-gray-800/70 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span
                    className={cn(
                      'px-2 py-0.5 rounded text-xs font-medium border',
                      getPriorityColor(gap.priority)
                    )}
                  >
                    {gap.priority}
                  </span>
                  <span className="font-medium text-white">{gap.skill}</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-xs">
                    <span className={getLevelColor(gap.currentLevel)}>{gap.currentLevel}</span>
                    <span className="text-gray-500 mx-1">→</span>
                    <span className={getLevelColor(gap.targetLevel)}>{gap.targetLevel}</span>
                  </div>
                  <Badge variant="default" size="sm">{gap.estimatedTime}</Badge>
                  {expandedSkills.has(gap.skill) ? (
                    <ChevronUp className="w-4 h-4 text-gray-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-gray-400" />
                  )}
                </div>
              </button>

              {expandedSkills.has(gap.skill) && (
                <div className="px-3 pb-3 border-t border-gray-700 pt-3">
                  {/* Learning Resources */}
                  {gap.learningResources && gap.learningResources.length > 0 && (
                    <div className="mb-3">
                      <h5 className="text-xs font-bold text-gray-400 uppercase mb-2">Learning Resources</h5>
                      <div className="space-y-2">
                        {gap.learningResources.map((resource, j) => (
                          <div
                            key={j}
                            className="flex items-center justify-between p-2 bg-gray-900/50 rounded text-sm"
                          >
                            <div className="flex items-center gap-2">
                              <span className={cn('px-1.5 py-0.5 rounded text-xs', getCostBadge(resource.cost))}>
                                {resource.cost}
                              </span>
                              <span className="text-gray-300">{resource.name}</span>
                              <span className="text-gray-500 text-xs">({resource.provider})</span>
                            </div>
                            <div className="flex items-center gap-2">
                              {resource.estimatedHours && (
                                <span className="text-xs text-gray-500">{resource.estimatedHours}h</span>
                              )}
                              {resource.url && (
                                <a
                                  href={resource.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-400 hover:text-blue-300"
                                >
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Practice Projects */}
                  {gap.practiceProjects && gap.practiceProjects.length > 0 && (
                    <div>
                      <h5 className="text-xs font-bold text-gray-400 uppercase mb-2">Practice Projects</h5>
                      <ul className="space-y-1">
                        {gap.practiceProjects.map((project, j) => (
                          <li key={j} className="text-sm text-gray-300 flex items-start gap-2">
                            <Code className="w-4 h-4 text-purple-400 mt-0.5 flex-shrink-0" />
                            {project}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Stepping Stone Roles */}
      {roadmap.steppingStoneRoles && roadmap.steppingStoneRoles.length > 0 && (
        <Card>
          <CardHeader>
            <h3 className="font-semibold text-white flex items-center gap-2">
              <MapPin className="w-5 h-5 text-purple-400" />
              Stepping Stone Roles
            </h3>
          </CardHeader>
          <CardContent className="p-4 space-y-3">
            {roadmap.steppingStoneRoles.map((role, i) => (
              <div key={i} className="p-3 bg-gray-800/50 rounded-lg border border-gray-700">
                <div className="flex items-start justify-between mb-2">
                  <h4 className="font-medium text-white">{role.roleTitle}</h4>
                  <span className={cn(
                    'px-2 py-0.5 rounded text-xs font-bold',
                    role.fitScore >= 7 ? 'bg-green-900/30 text-green-400' : 'bg-yellow-900/30 text-yellow-400'
                  )}>
                    {role.fitScore}/10 fit
                  </span>
                </div>
                <p className="text-sm text-gray-400 mb-2">{role.whyItHelps}</p>
                <div className="flex flex-wrap gap-1">
                  {role.skillsYoullGain.map((skill, j) => (
                    <span key={j} className="px-2 py-0.5 bg-purple-900/30 text-purple-300 rounded text-xs">
                      +{skill}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Certifications */}
      {roadmap.certifications && roadmap.certifications.length > 0 && (
        <Card>
          <CardHeader>
            <h3 className="font-semibold text-white flex items-center gap-2">
              <Award className="w-5 h-5 text-yellow-400" />
              Recommended Certifications
            </h3>
          </CardHeader>
          <CardContent className="p-4">
            <div className="space-y-2">
              {roadmap.certifications.map((cert, i) => (
                <div key={i} className="flex items-center justify-between p-2 bg-gray-800/50 rounded">
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      'px-2 py-0.5 rounded text-xs',
                      cert.relevance === 'required' ? 'bg-red-900/30 text-red-400' :
                        cert.relevance === 'highly-valued' ? 'bg-yellow-900/30 text-yellow-400' :
                          'bg-gray-700 text-gray-400'
                    )}>
                      {cert.relevance}
                    </span>
                    <span className="text-sm text-white">{cert.name}</span>
                    <span className="text-xs text-gray-500">({cert.provider})</span>
                  </div>
                  <div className="text-xs text-gray-400">
                    {cert.estimatedPrepTime} • {cert.cost}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Milestones */}
      {roadmap.milestones.length > 0 && (
        <Card>
          <CardHeader>
            <h3 className="font-semibold text-white flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-green-400" />
              Your Journey Milestones
            </h3>
          </CardHeader>
          <CardContent className="p-4">
            <div className="relative">
              {/* Timeline line */}
              <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-700" />

              <div className="space-y-4">
                {roadmap.milestones.map((milestone, i) => (
                  <div key={i} className="relative pl-10">
                    <div className={cn(
                      'absolute left-2.5 w-3 h-3 rounded-full border-2',
                      i === 0 ? 'bg-blue-500 border-blue-400' :
                        i === roadmap.milestones.length - 1 ? 'bg-green-500 border-green-400' :
                          'bg-gray-600 border-gray-500'
                    )} />
                    <div className="p-3 bg-gray-800/50 rounded-lg">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="font-medium text-white text-sm">{milestone.title}</h4>
                        <div className="flex items-center gap-2 text-xs">
                          <span className="text-gray-500">{milestone.estimatedTimeFromStart}</span>
                          <span className={cn(
                            'font-bold',
                            milestone.expectedFitScore >= 8 ? 'text-green-400' : 'text-yellow-400'
                          )}>
                            {milestone.expectedFitScore}/10
                          </span>
                        </div>
                      </div>
                      <p className="text-sm text-gray-400">{milestone.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Reapply Timeline */}
      {roadmap.reapplyTimeline && (
        <div className="text-center text-sm text-gray-400 py-4 border-t border-gray-800">
          <Clock className="w-4 h-4 inline mr-1" />
          Suggested time to reapply: <span className="text-white font-medium">{roadmap.reapplyTimeline}</span>
        </div>
      )}
    </div>
  );
};

export default AnalyzerPage;
