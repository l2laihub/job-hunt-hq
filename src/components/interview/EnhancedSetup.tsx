import React, { useMemo, useCallback, useState } from 'react';
import { useUnifiedActiveProfileId, useApplications, useInterviewPrep } from '@/src/hooks/useAppData';
import { Button, Card, CardHeader, CardContent, Select, Badge } from '@/src/components/ui';
import { cn } from '@/src/lib/utils';
import type {
  EnhancedInterviewConfig,
  InterviewPrepSession,
  PredictedQuestion,
  QuestionCategory,
} from '@/src/types/interview-prep';
import {
  Play,
  Settings,
  AlertCircle,
  FileText,
  Mic,
  Clock,
  Target,
  ChevronRight,
  Filter,
} from 'lucide-react';

interface EnhancedSetupProps {
  onStartInterview: (config: EnhancedInterviewConfig, questions: PredictedQuestion[]) => void;
}

// Interview types for selection
const interviewTypes = [
  { value: 'behavioral', label: 'Behavioral' },
  { value: 'technical', label: 'Technical' },
  { value: 'system-design', label: 'System Design' },
  { value: 'mixed', label: 'Mixed' },
];

const difficulties = [
  { value: 'easy', label: 'Easy - Encouraging' },
  { value: 'medium', label: 'Medium - Professional' },
  { value: 'hard', label: 'Hard - Challenging' },
];

const questionPriorities = [
  { value: 'unpracticed', label: 'Unpracticed First (Recommended)' },
  { value: 'high-likelihood', label: 'High Likelihood First' },
  { value: 'random', label: 'Random Selection' },
];

const questionCounts = [
  { value: '3', label: '3 questions (~10 min)' },
  { value: '5', label: '5 questions (~15 min)' },
  { value: '8', label: '8 questions (~25 min)' },
  { value: '10', label: '10 questions (~30 min)' },
];

/**
 * Session selector card
 */
const SessionCard: React.FC<{
  session: InterviewPrepSession;
  company: string;
  role: string;
  isSelected: boolean;
  onClick: () => void;
}> = ({ session, company, role, isSelected, onClick }) => {
  const preparedCount = session.predictedQuestions.filter((q) => q.isPrepared).length;
  const totalCount = session.predictedQuestions.length;
  const prepPercentage = totalCount > 0 ? Math.round((preparedCount / totalCount) * 100) : 0;

  return (
    <Card
      className={cn(
        'p-4 cursor-pointer transition-all',
        isSelected ? 'border-blue-500 bg-blue-900/20' : 'hover:border-gray-600'
      )}
      onClick={onClick}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-white truncate">{company}</h4>
          <p className="text-sm text-gray-400 truncate">{role}</p>
          <div className="flex items-center gap-2 mt-2">
            <Badge className="text-xs bg-gray-800 text-gray-300">
              {session.interviewType}
            </Badge>
            <span className="text-xs text-gray-500">
              {totalCount} questions
            </span>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <div
            className={cn(
              'w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold',
              session.readinessScore >= 70
                ? 'bg-green-900/40 text-green-400'
                : session.readinessScore >= 40
                ? 'bg-yellow-900/40 text-yellow-400'
                : 'bg-red-900/40 text-red-400'
            )}
          >
            {session.readinessScore}
          </div>
          <span className="text-xs text-gray-500">{prepPercentage}% prep</span>
        </div>
      </div>
    </Card>
  );
};

/**
 * Question stats display
 */
const QuestionStats: React.FC<{
  questions: PredictedQuestion[];
  selectedCategories: Set<QuestionCategory>;
}> = ({ questions, selectedCategories }) => {
  const stats = useMemo(() => {
    const filtered =
      selectedCategories.size > 0
        ? questions.filter((q) => selectedCategories.has(q.category))
        : questions;

    return {
      total: filtered.length,
      unpracticed: filtered.filter((q) => q.practiceCount === 0).length,
      highLikelihood: filtered.filter((q) => q.likelihood === 'high').length,
      prepared: filtered.filter((q) => q.isPrepared).length,
      byCategory: filtered.reduce((acc, q) => {
        acc[q.category] = (acc[q.category] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
    };
  }, [questions, selectedCategories]);

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <div className="bg-gray-800/50 rounded-lg p-3">
        <div className="text-2xl font-bold text-white">{stats.total}</div>
        <div className="text-xs text-gray-400">Total Questions</div>
      </div>
      <div className="bg-gray-800/50 rounded-lg p-3">
        <div className="text-2xl font-bold text-yellow-400">{stats.unpracticed}</div>
        <div className="text-xs text-gray-400">Unpracticed</div>
      </div>
      <div className="bg-gray-800/50 rounded-lg p-3">
        <div className="text-2xl font-bold text-red-400">{stats.highLikelihood}</div>
        <div className="text-xs text-gray-400">High Likelihood</div>
      </div>
      <div className="bg-gray-800/50 rounded-lg p-3">
        <div className="text-2xl font-bold text-green-400">{stats.prepared}</div>
        <div className="text-xs text-gray-400">With Answers</div>
      </div>
    </div>
  );
};

/**
 * Category filter chips
 */
const CategoryFilter: React.FC<{
  questions: PredictedQuestion[];
  selected: Set<QuestionCategory>;
  onToggle: (category: QuestionCategory) => void;
}> = ({ questions, selected, onToggle }) => {
  const categories = useMemo(() => {
    const counts: Record<QuestionCategory, number> = {
      behavioral: 0,
      technical: 0,
      situational: 0,
      'role-specific': 0,
      'company-specific': 0,
    };
    questions.forEach((q) => {
      counts[q.category]++;
    });
    return Object.entries(counts)
      .filter(([, count]) => count > 0)
      .map(([category, count]) => ({ category: category as QuestionCategory, count }));
  }, [questions]);

  if (categories.length <= 1) return null;

  return (
    <div className="flex flex-wrap gap-2">
      <span className="text-xs text-gray-500 flex items-center gap-1">
        <Filter className="w-3 h-3" /> Filter:
      </span>
      {categories.map(({ category, count }) => (
        <button
          key={category}
          onClick={() => onToggle(category)}
          className={cn(
            'px-2 py-1 rounded-full text-xs transition-colors',
            selected.has(category)
              ? 'bg-blue-600 text-white'
              : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
          )}
        >
          {category} ({count})
        </button>
      ))}
      {selected.size > 0 && (
        <button
          onClick={() => selected.forEach((c) => onToggle(c))}
          className="px-2 py-1 rounded-full text-xs bg-gray-700 text-gray-300 hover:bg-gray-600"
        >
          Clear
        </button>
      )}
    </div>
  );
};

export const EnhancedSetup: React.FC<EnhancedSetupProps> = ({ onStartInterview }) => {
  const activeProfileId = useUnifiedActiveProfileId();
  const { sessions: allSessions } = useInterviewPrep();
  const { applications: allApplications } = useApplications();

  // Filter by active profile - be lenient with profile matching
  const sessions = useMemo(() => {
    // If no active profile, show all sessions
    if (!activeProfileId) return allSessions;
    // Show sessions that match profile OR have no profile set
    return allSessions.filter((s) => !s.profileId || s.profileId === activeProfileId);
  }, [allSessions, activeProfileId]);

  const applications = useMemo(() => {
    // If no active profile, show all applications
    if (!activeProfileId) return allApplications;
    // Show applications that match profile OR have no profile set
    return allApplications.filter((a) => !a.profileId || a.profileId === activeProfileId);
  }, [allApplications, activeProfileId]);

  // State
  const [selectedSessionId, setSelectedSessionId] = useState<string>('');
  const [interviewType, setInterviewType] = useState<EnhancedInterviewConfig['type']>('mixed');
  const [difficulty, setDifficulty] = useState<EnhancedInterviewConfig['difficulty']>('medium');
  const [questionPriority, setQuestionPriority] =
    useState<EnhancedInterviewConfig['questionPriority']>('unpracticed');
  const [maxQuestions, setMaxQuestions] = useState(5);
  const [showPreparedAnswers, setShowPreparedAnswers] = useState(true);
  const [enablePerQuestionFeedback, setEnablePerQuestionFeedback] = useState(true);
  const [selectedCategories, setSelectedCategories] = useState<Set<QuestionCategory>>(new Set());

  // Get selected session and application
  const selectedSession = useMemo(
    () => sessions.find((s) => s.id === selectedSessionId),
    [sessions, selectedSessionId]
  );

  const selectedApplication = useMemo(() => {
    if (!selectedSession) return undefined;
    return applications.find((a) => a.id === selectedSession.applicationId);
  }, [selectedSession, applications]);

  // Get questions based on config
  const availableQuestions = useMemo(() => {
    if (!selectedSession) return [];
    let questions = [...selectedSession.predictedQuestions];

    // Filter by category
    if (selectedCategories.size > 0) {
      questions = questions.filter((q) => selectedCategories.has(q.category));
    }

    // Filter by interview type
    if (interviewType !== 'mixed') {
      const categoryMap: Record<string, QuestionCategory[]> = {
        behavioral: ['behavioral', 'situational'],
        technical: ['technical'],
        'system-design': ['technical', 'role-specific'],
      };
      const allowedCategories = categoryMap[interviewType] || [];
      if (allowedCategories.length > 0) {
        questions = questions.filter((q) => allowedCategories.includes(q.category));
      }
    }

    // Sort by priority
    switch (questionPriority) {
      case 'unpracticed':
        questions.sort((a, b) => {
          if (a.practiceCount === 0 && b.practiceCount > 0) return -1;
          if (a.practiceCount > 0 && b.practiceCount === 0) return 1;
          return (
            (a.likelihood === 'high' ? 0 : a.likelihood === 'medium' ? 1 : 2) -
            (b.likelihood === 'high' ? 0 : b.likelihood === 'medium' ? 1 : 2)
          );
        });
        break;
      case 'high-likelihood':
        questions.sort((a, b) => {
          const likelihoodOrder = { high: 0, medium: 1, low: 2 };
          return likelihoodOrder[a.likelihood] - likelihoodOrder[b.likelihood];
        });
        break;
      case 'random':
        questions.sort(() => Math.random() - 0.5);
        break;
    }

    return questions.slice(0, maxQuestions);
  }, [selectedSession, selectedCategories, interviewType, questionPriority, maxQuestions]);

  // Toggle category filter
  const toggleCategory = useCallback((category: QuestionCategory) => {
    setSelectedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  }, []);

  // Handle start interview
  const handleStart = useCallback(() => {
    if (!selectedSession || availableQuestions.length === 0) return;

    const config: EnhancedInterviewConfig = {
      type: interviewType,
      difficulty,
      duration: Math.ceil(maxQuestions * 3), // ~3 min per question
      prepSessionId: selectedSession.id,
      applicationId: selectedSession.applicationId,
      questionPriority,
      maxQuestions,
      showPreparedAnswers,
      enablePerQuestionFeedback,
      focusCategories: selectedCategories.size > 0 ? Array.from(selectedCategories) : undefined,
    };

    onStartInterview(config, availableQuestions);
  }, [
    selectedSession,
    availableQuestions,
    interviewType,
    difficulty,
    questionPriority,
    maxQuestions,
    showPreparedAnswers,
    enablePerQuestionFeedback,
    selectedCategories,
    onStartInterview,
  ]);

  // Sessions with applications for display
  const sessionsWithApps = useMemo(() => {
    return sessions
      .map((session) => {
        const app = applications.find((a) => a.id === session.applicationId);
        return { session, app };
      })
      .filter(({ app }) => app !== undefined)
      .sort((a, b) => {
        // Sort by interview date if available, then by readiness
        if (a.session.interviewDate && b.session.interviewDate) {
          return (
            new Date(a.session.interviewDate).getTime() -
            new Date(b.session.interviewDate).getTime()
          );
        }
        return b.session.readinessScore - a.session.readinessScore;
      });
  }, [sessions, applications]);

  // No sessions available
  if (sessionsWithApps.length === 0) {
    return (
      <Card className="p-8 text-center">
        <AlertCircle className="w-12 h-12 mx-auto mb-4 text-yellow-400 opacity-50" />
        <h3 className="text-lg font-medium text-white mb-2">No Interview Prep Sessions</h3>
        <p className="text-gray-400 text-sm mb-6 max-w-md mx-auto">
          To start practicing, you need to create an interview prep session first. Here's how:
        </p>
        <ol className="text-left text-sm text-gray-400 mb-6 max-w-md mx-auto space-y-2">
          <li className="flex items-start gap-2">
            <span className="bg-blue-600 text-white w-5 h-5 rounded-full flex items-center justify-center text-xs shrink-0 mt-0.5">1</span>
            <span>Go to <strong className="text-white">Interview Prep</strong> in the sidebar</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="bg-blue-600 text-white w-5 h-5 rounded-full flex items-center justify-center text-xs shrink-0 mt-0.5">2</span>
            <span>Select a job application from your list</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="bg-blue-600 text-white w-5 h-5 rounded-full flex items-center justify-center text-xs shrink-0 mt-0.5">3</span>
            <span>Click <strong className="text-white">"Start Interview Prep"</strong> to generate questions</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="bg-blue-600 text-white w-5 h-5 rounded-full flex items-center justify-center text-xs shrink-0 mt-0.5">4</span>
            <span>Return here to practice with AI-powered mock interviews</span>
          </li>
        </ol>
        <div className="flex gap-3 justify-center">
          <Button variant="outline" onClick={() => (window.location.href = '/')}>
            Go to Dashboard
          </Button>
          <Button variant="primary" onClick={() => (window.location.href = '/interview-prep')}>
            Go to Interview Prep
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Session Selection */}
      <Card>
        <CardHeader>
          <h3 className="font-semibold text-white flex items-center gap-2">
            <Target className="w-4 h-4 text-blue-400" />
            Select Interview Prep Session
          </h3>
        </CardHeader>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-64 overflow-y-auto">
            {sessionsWithApps.map(({ session, app }) => (
              <SessionCard
                key={session.id}
                session={session}
                company={app!.company}
                role={app!.role}
                isSelected={selectedSessionId === session.id}
                onClick={() => setSelectedSessionId(session.id)}
              />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Context & Stats (when session selected) */}
      {selectedSession && selectedApplication && (
        <>
          {/* Application Context */}
          <Card className="bg-gradient-to-r from-blue-900/20 to-purple-900/20 border-blue-800/50">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-medium text-white">{selectedApplication.company}</h4>
                  <p className="text-sm text-gray-400">{selectedApplication.role}</p>
                  {selectedApplication.analysis && (
                    <div className="flex items-center gap-2 mt-2">
                      <Badge
                        className={cn(
                          'text-xs',
                          selectedApplication.analysis.fitScore >= 7
                            ? 'bg-green-900/40 text-green-400'
                            : selectedApplication.analysis.fitScore >= 5
                            ? 'bg-yellow-900/40 text-yellow-400'
                            : 'bg-red-900/40 text-red-400'
                        )}
                      >
                        Fit: {selectedApplication.analysis.fitScore}/10
                      </Badge>
                      {selectedApplication.jobDescriptionRaw && (
                        <Badge className="text-xs bg-gray-800 text-gray-300">
                          <FileText className="w-3 h-3 mr-1" />
                          JD Loaded
                        </Badge>
                      )}
                    </div>
                  )}
                </div>
                <div className="text-right">
                  <div className="text-sm text-gray-400">Interview Type</div>
                  <div className="text-white font-medium capitalize">
                    {selectedSession.interviewType.replace('-', ' ')}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Question Stats */}
          <QuestionStats
            questions={selectedSession.predictedQuestions}
            selectedCategories={selectedCategories}
          />

          {/* Category Filter */}
          <CategoryFilter
            questions={selectedSession.predictedQuestions}
            selected={selectedCategories}
            onToggle={toggleCategory}
          />
        </>
      )}

      {/* Configuration */}
      <Card>
        <CardHeader>
          <h3 className="font-semibold text-white flex items-center gap-2">
            <Settings className="w-4 h-4" />
            Interview Settings
          </h3>
        </CardHeader>
        <CardContent className="p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label="Interview Type"
              value={interviewType}
              onChange={(val) => setInterviewType(val as EnhancedInterviewConfig['type'])}
              options={interviewTypes}
            />
            <Select
              label="Difficulty"
              value={difficulty}
              onChange={(val) => setDifficulty(val as EnhancedInterviewConfig['difficulty'])}
              options={difficulties}
            />
            <Select
              label="Question Priority"
              value={questionPriority}
              onChange={(val) =>
                setQuestionPriority(val as EnhancedInterviewConfig['questionPriority'])
              }
              options={questionPriorities}
            />
            <Select
              label="Number of Questions"
              value={maxQuestions.toString()}
              onChange={(val) => setMaxQuestions(parseInt(val))}
              options={questionCounts}
            />
          </div>

          {/* Toggle options */}
          <div className="flex flex-wrap gap-4 pt-2 border-t border-gray-800">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={enablePerQuestionFeedback}
                onChange={(e) => setEnablePerQuestionFeedback(e.target.checked)}
                className="rounded"
              />
              <span className="text-sm text-gray-300">Show feedback after each question</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showPreparedAnswers}
                onChange={(e) => setShowPreparedAnswers(e.target.checked)}
                className="rounded"
              />
              <span className="text-sm text-gray-300">Compare to prepared answers</span>
            </label>
          </div>
        </CardContent>
      </Card>

      {/* Ready to Start */}
      {selectedSession && (
        <Card className="bg-gradient-to-r from-green-900/10 to-blue-900/10 border-green-800/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium text-white flex items-center gap-2">
                  <Mic className="w-4 h-4 text-green-400" />
                  Ready to Practice
                </h4>
                <p className="text-sm text-gray-400 mt-1">
                  {availableQuestions.length} questions selected •{' '}
                  {availableQuestions.filter((q) => q.matchedAnswerId).length} with prepared answers
                </p>
              </div>
              <div className="flex items-center gap-2 text-gray-400">
                <Clock className="w-4 h-4" />
                <span className="text-sm">~{Math.ceil(availableQuestions.length * 3)} min</span>
              </div>
            </div>

            <Button
              size="lg"
              className="w-full mt-4"
              disabled={!selectedSession || availableQuestions.length === 0}
              onClick={handleStart}
            >
              <Play className="w-5 h-5 mr-2" />
              Start Mock Interview
              <ChevronRight className="w-5 h-5 ml-2" />
            </Button>

            {availableQuestions.length === 0 && (
              <p className="text-xs text-yellow-400 text-center mt-2">
                No questions match your filters. Try adjusting the settings.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Tips */}
      <Card className="bg-blue-900/10 border-blue-800/30">
        <CardContent className="p-4">
          <h4 className="text-sm font-semibold text-blue-300 mb-2">Tips for Success</h4>
          <ul className="text-sm text-gray-400 space-y-1 list-disc list-inside">
            <li>Find a quiet space and test your microphone first</li>
            <li>Use the STAR format for behavioral questions</li>
            <li>Speak clearly and take a moment to think before answering</li>
            <li>Review feedback after each question to improve immediately</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
};

export default EnhancedSetup;
