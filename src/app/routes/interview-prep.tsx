import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { toast } from '@/src/stores';
import { useApplications, useStories, useUnifiedActiveProfileId, useProfile, useInterviewPrep } from '@/src/hooks/useAppData';
import {
  predictInterviewQuestions,
  generateQuickRefFromSession,
} from '@/src/services/gemini';
import { Button, Card, Badge, Select, Dialog } from '@/src/components/ui';
import { cn, formatDate, formatRelativeTime } from '@/src/lib/utils';
import type {
  InterviewPrepSession,
  InterviewStage,
  JobApplication,
} from '@/src/types';
import { INTERVIEW_STAGES } from '@/src/types';
import {
  Target,
  Calendar,
  Clock,
  AlertCircle,
  FileText,
  Building2,
  ListChecks,
  MessageSquare,
  Mic,
  Plus,
  Settings,
  Trash2,
  Link,
} from 'lucide-react';

// Sub-components
import { PrepChecklist } from '@/src/components/interview-prep/PrepChecklist';
import { QuestionBank } from '@/src/components/interview-prep/QuestionBank';
import { PracticePanel } from '@/src/components/interview-prep/PracticePanel';
import { InterviewDayCard } from '@/src/components/interview-prep/InterviewDayCard';

type TabType = 'checklist' | 'questions' | 'practice' | 'day';

const tabConfig: { id: TabType; label: string; icon: React.ElementType }[] = [
  { id: 'checklist', label: 'Prep Checklist', icon: ListChecks },
  { id: 'questions', label: 'Questions', icon: MessageSquare },
  { id: 'practice', label: 'Practice', icon: Mic },
  { id: 'day', label: 'Interview Day', icon: FileText },
];

// Readiness gauge component
const ReadinessGauge: React.FC<{ score: number }> = ({ score }) => {
  const getColor = () => {
    if (score >= 80) return 'text-green-400';
    if (score >= 60) return 'text-yellow-400';
    if (score >= 40) return 'text-orange-400';
    return 'text-red-400';
  };

  const getLabel = () => {
    if (score >= 80) return 'Ready';
    if (score >= 60) return 'Almost Ready';
    if (score >= 40) return 'In Progress';
    return 'Just Started';
  };

  return (
    <Card className="p-4">
      <div className="text-center">
        <div className={cn('text-4xl font-bold', getColor())}>{score}%</div>
        <div className="text-sm text-gray-400 mt-1">Readiness</div>
        <div className={cn('text-xs font-medium mt-2', getColor())}>{getLabel()}</div>
        <div className="mt-3 h-2 bg-gray-800 rounded-full overflow-hidden">
          <div
            className={cn('h-full rounded-full transition-all duration-500', {
              'bg-green-500': score >= 80,
              'bg-yellow-500': score >= 60 && score < 80,
              'bg-orange-500': score >= 40 && score < 60,
              'bg-red-500': score < 40,
            })}
            style={{ width: `${score}%` }}
          />
        </div>
      </div>
    </Card>
  );
};

// Upcoming interview card
const UpcomingCard: React.FC<{
  date?: string;
  time?: string;
  type: InterviewStage;
  onEdit: () => void;
}> = ({ date, time, type, onEdit }) => {
  const stageInfo = INTERVIEW_STAGES.find((s) => s.value === type);

  return (
    <Card className="p-4 cursor-pointer hover:border-blue-500/50 transition-colors" onClick={onEdit}>
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 text-gray-400 text-sm">
            <Calendar className="w-4 h-4" />
            {date ? formatDate(date) : 'Not scheduled'}
          </div>
          {time && (
            <div className="flex items-center gap-2 text-gray-500 text-xs mt-1">
              <Clock className="w-3 h-3" />
              {time}
            </div>
          )}
        </div>
        <Badge variant="default" className="text-xs">
          {stageInfo?.label || type}
        </Badge>
      </div>
      <p className="text-xs text-gray-500 mt-2 line-clamp-2">{stageInfo?.description}</p>
    </Card>
  );
};

// Practice stats card
const PracticeStatsCard: React.FC<{ session: InterviewPrepSession }> = ({ session }) => {
  const practiceCount = session.practiceSessionIds.length;
  const questionsWithPractice = session.predictedQuestions.filter((q) => q.practiceCount > 0).length;

  return (
    <Card className="p-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-purple-900/30 rounded-lg flex items-center justify-center">
          <Mic className="w-5 h-5 text-purple-400" />
        </div>
        <div>
          <div className="text-lg font-semibold text-white">{practiceCount}</div>
          <div className="text-xs text-gray-400">Practice sessions</div>
        </div>
      </div>
      {session.lastPracticedAt && (
        <p className="text-xs text-gray-500 mt-2">
          Last: {formatRelativeTime(session.lastPracticedAt)}
        </p>
      )}
      <p className="text-xs text-gray-500 mt-1">
        {questionsWithPractice}/{session.predictedQuestions.length} questions practiced
      </p>
    </Card>
  );
};

// Quick access cards
const QuickAccessCards: React.FC<{
  application?: JobApplication;
  session: InterviewPrepSession;
}> = ({ application, session }) => {
  const matchedStories = session.predictedQuestions.filter((q) => q.matchedStoryId).length;
  const gaps = session.predictedQuestions.filter(
    (q) => q.likelihood === 'high' && !q.isPrepared
  ).length;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {application?.analysis && (
        <Card className="p-3 hover:border-blue-500/50 transition-colors cursor-pointer">
          <div className="flex items-center gap-2 text-blue-400 text-sm font-medium">
            <FileText className="w-4 h-4" />
            JD Analysis
          </div>
          <div className="text-2xl font-bold text-white mt-1">
            {application.analysis.fitScore}/10
          </div>
          <p className="text-xs text-gray-500">Fit Score</p>
        </Card>
      )}

      {application?.companyResearch && (
        <Card className="p-3 hover:border-purple-500/50 transition-colors cursor-pointer">
          <div className="flex items-center gap-2 text-purple-400 text-sm font-medium">
            <Building2 className="w-4 h-4" />
            Research
          </div>
          <div className="text-sm text-white mt-1 line-clamp-1">
            {application.companyResearch.overview.industry}
          </div>
          <p className="text-xs text-gray-500">{application.companyResearch.overview.size}</p>
        </Card>
      )}

      <Card className="p-3">
        <div className="flex items-center gap-2 text-green-400 text-sm font-medium">
          <Link className="w-4 h-4" />
          Matched Stories
        </div>
        <div className="text-2xl font-bold text-white mt-1">{matchedStories}</div>
        <p className="text-xs text-gray-500">Stories linked</p>
      </Card>

      <Card className={cn('p-3', gaps > 0 && 'border-yellow-700/50')}>
        <div className="flex items-center gap-2 text-yellow-400 text-sm font-medium">
          <AlertCircle className="w-4 h-4" />
          Gaps
        </div>
        <div className="text-2xl font-bold text-white mt-1">{gaps}</div>
        <p className="text-xs text-gray-500">High-priority unprepared</p>
      </Card>
    </div>
  );
};

// New session modal
const NewSessionModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  applications: JobApplication[];
  onCreateSession: (appId: string, type: InterviewStage) => void;
}> = ({ isOpen, onClose, applications, onCreateSession }) => {
  const [selectedAppId, setSelectedAppId] = useState<string>('');
  const [selectedType, setSelectedType] = useState<InterviewStage>('phone-screen');

  const handleCreate = () => {
    if (!selectedAppId) {
      toast.error('Please select an application');
      return;
    }
    onCreateSession(selectedAppId, selectedType);
    onClose();
  };

  return (
    <Dialog isOpen={isOpen} onClose={onClose} title="Start Interview Prep">
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Select Application
          </label>
          <Select
            value={selectedAppId}
            onChange={setSelectedAppId}
            options={applications.map((app) => ({
              value: app.id,
              label: `${app.company} - ${app.role}`,
            }))}
            placeholder="Choose an application..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Interview Type
          </label>
          <Select
            value={selectedType}
            onChange={(v) => setSelectedType(v as InterviewStage)}
            options={INTERVIEW_STAGES.map((s) => ({
              value: s.value,
              label: s.label,
            }))}
          />
          <p className="text-xs text-gray-500 mt-1">
            {INTERVIEW_STAGES.find((s) => s.value === selectedType)?.description}
          </p>
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={!selectedAppId}>
            <Plus className="w-4 h-4 mr-2" />
            Start Prep
          </Button>
        </div>
      </div>
    </Dialog>
  );
};

// Schedule modal
const ScheduleModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  session: InterviewPrepSession;
  onSave: (updates: Partial<InterviewPrepSession>) => void;
}> = ({ isOpen, onClose, session, onSave }) => {
  const [date, setDate] = useState(session.interviewDate || '');
  const [time, setTime] = useState(session.interviewTime || '');
  const [type, setType] = useState<InterviewStage>(session.interviewType);
  const [location, setLocation] = useState(session.interviewLocation || '');
  const [interviewer, setInterviewer] = useState(session.interviewerName || '');
  const [interviewerRole, setInterviewerRole] = useState(session.interviewerRole || '');

  const handleSave = () => {
    onSave({
      interviewDate: date || undefined,
      interviewTime: time || undefined,
      interviewType: type,
      interviewLocation: location || undefined,
      interviewerName: interviewer || undefined,
      interviewerRole: interviewerRole || undefined,
    });
    onClose();
  };

  return (
    <Dialog isOpen={isOpen} onClose={onClose} title="Interview Details">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Time</label>
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Interview Type</label>
          <Select
            value={type}
            onChange={(v) => setType(v as InterviewStage)}
            options={INTERVIEW_STAGES.map((s) => ({ value: s.value, label: s.label }))}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Location / Meeting Link
          </label>
          <input
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="https://zoom.us/... or Office address"
            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Interviewer Name
            </label>
            <input
              type="text"
              value={interviewer}
              onChange={(e) => setInterviewer(e.target.value)}
              placeholder="Optional"
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Interviewer Role
            </label>
            <input
              type="text"
              value={interviewerRole}
              onChange={(e) => setInterviewerRole(e.target.value)}
              placeholder="Optional"
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save Details</Button>
        </div>
      </div>
    </Dialog>
  );
};

// Empty state
const EmptyState: React.FC<{
  title: string;
  description: string;
  action?: { label: string; onClick: () => void };
  linkTo?: string;
  linkLabel?: string;
}> = ({ title, description, action, linkTo, linkLabel }) => (
  <Card className="p-8 text-center">
    <Target className="w-12 h-12 mx-auto text-gray-600 mb-4" />
    <h3 className="text-lg font-medium text-white mb-2">{title}</h3>
    <p className="text-gray-400 mb-4">{description}</p>
    {action && (
      <Button onClick={action.onClick}>
        <Plus className="w-4 h-4 mr-2" />
        {action.label}
      </Button>
    )}
    {linkTo && (
      <a href={linkTo} className="text-blue-400 hover:text-blue-300 text-sm">
        {linkLabel}
      </a>
    )}
  </Card>
);

// Main page component
export const InterviewPrepPage: React.FC = () => {
  const activeProfileId = useUnifiedActiveProfileId();
  const { profile } = useProfile();
  const { applications: allApplications } = useApplications();
  const { stories: allStories } = useStories();

  // Use the unified interview prep hook for Supabase/localStorage switching
  const interviewPrepStore = useInterviewPrep();
  const {
    sessions,
    createSession,
    getSession,
    updateSession,
    deleteSession,
    setPredictedQuestions,
    setQuickReference,
  } = interviewPrepStore;

  // Filter by active profile
  const applications = useMemo(() => {
    if (!activeProfileId) return allApplications;
    return allApplications.filter((app) => !app.profileId || app.profileId === activeProfileId);
  }, [allApplications, activeProfileId]);

  const stories = useMemo(() => {
    if (!activeProfileId) return allStories;
    return allStories.filter((s) => !s.profileId || s.profileId === activeProfileId);
  }, [allStories, activeProfileId]);

  // Get interviewing applications
  const interviewingApps = useMemo(
    () => applications.filter((a) => a.status === 'interviewing'),
    [applications]
  );

  // State
  const [selectedAppId, setSelectedAppId] = useState<string>('');
  const [activeTab, setActiveTab] = useState<TabType>('checklist');
  const [showNewSessionModal, setShowNewSessionModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  // Set default selected app
  useEffect(() => {
    if (!selectedAppId && interviewingApps.length > 0) {
      // Try to find an app with an existing session
      const appWithSession = interviewingApps.find((app) => getSession(app.id));
      setSelectedAppId(appWithSession?.id || interviewingApps[0].id);
    }
  }, [interviewingApps, selectedAppId, getSession]);

  // Get current session and application
  const selectedApp = applications.find((a) => a.id === selectedAppId);
  // Use useMemo with sessions dependency to ensure re-render when session updates
  const session = useMemo(() => {
    if (!selectedAppId) return undefined;
    return sessions.find((s) => s.applicationId === selectedAppId);
  }, [selectedAppId, sessions]);

  // Generate predicted questions
  const handleGenerateQuestions = useCallback(
    async (targetSession?: InterviewPrepSession) => {
      // Get the current session from the store to ensure we have the latest data
      // Don't rely on closure's session which may be stale
      const currentStoreSession = selectedAppId
        ? sessions.find(s => s.applicationId === selectedAppId)
        : undefined;

      // Use targetSession (passed directly), or current store session, or closure session as fallback
      const sess = targetSession || currentStoreSession || session;

      if (!sess || !profile) {
        return;
      }

      // Use session.applicationId if available, otherwise fall back to selectedAppId
      const appId = sess.applicationId || selectedAppId;
      const app = applications.find((a) => a.id === appId);

      if (!app || !app.analysis) {
        toast.error('Missing job analysis', 'Analyze the job description first');
        return;
      }

      setIsGenerating(true);
      try {
        const questions = await predictInterviewQuestions({
          profile,
          analysis: app.analysis,
          research: app.companyResearch,
          stories,
          interviewType: sess.interviewType,
          company: app.company,
          role: app.role,
        });

        await setPredictedQuestions(sess.id, questions);
        toast.success('Questions generated', `${questions.length} questions predicted`);
      } catch (error) {
        console.error('Failed to generate questions:', error);
        toast.error('Generation failed', 'Could not predict interview questions');
      } finally {
        setIsGenerating(false);
      }
    },
    [session, profile, applications, stories, setPredictedQuestions, selectedAppId, sessions]
  );

  // Create new session
  const handleCreateSession = useCallback(
    async (appId: string, type: InterviewStage) => {
      const newSession = await createSession(appId, type, activeProfileId ?? undefined);
      setSelectedAppId(appId);
      toast.success('Prep session created', 'Start by completing your checklist');

      // Auto-generate questions
      if (newSession) {
        handleGenerateQuestions(newSession);
      }
    },
    [createSession, activeProfileId, handleGenerateQuestions]
  );

  // Generate quick reference
  const handleGenerateQuickRef = useCallback(async () => {
    if (!session || !profile) return;

    const app = applications.find((a) => a.id === session.applicationId);
    if (!app) return;

    setIsGenerating(true);
    try {
      const quickRef = await generateQuickRefFromSession(
        session,
        profile,
        stories,
        app.analysis,
        app.companyResearch,
        app.company,
        app.role
      );

      setQuickReference(session.id, quickRef);
      toast.success('Quick reference generated', 'Interview day card is ready');
    } catch (error) {
      console.error('Failed to generate quick reference:', error);
      toast.error('Generation failed', 'Could not create quick reference');
    } finally {
      setIsGenerating(false);
    }
  }, [session, profile, applications, stories, setQuickReference]);

  // Update session
  const handleUpdateSession = useCallback(
    (updates: Partial<InterviewPrepSession>) => {
      if (!session) return;
      updateSession(session.id, updates);
      toast.success('Details updated');
    },
    [session, updateSession]
  );

  // Delete session
  const handleDeleteSession = useCallback(() => {
    if (!session) return;
    if (window.confirm('Delete this prep session? This cannot be undone.')) {
      deleteSession(session.id);
      setSelectedAppId('');
      toast.success('Session deleted');
    }
  }, [session, deleteSession]);

  // Render
  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <Target className="w-7 h-7 text-blue-500" />
              Interview Prep Hub
            </h1>
            <p className="text-gray-400 text-sm mt-1">
              Prepare thoroughly for your upcoming interviews
            </p>
          </div>
          <Button onClick={() => setShowNewSessionModal(true)}>
            <Plus className="w-4 h-4 mr-2" />
            New Prep Session
          </Button>
        </div>

        {interviewingApps.length > 0 ? (
          <>
            {/* Application Selector */}
            <Card className="p-4">
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Select Application
                  </label>
                  <Select
                    value={selectedAppId}
                    onChange={setSelectedAppId}
                    options={interviewingApps.map((app) => ({
                      value: app.id,
                      label: `${app.company} - ${app.role}`,
                    }))}
                    placeholder="Choose an application to prepare for..."
                  />
                </div>
                {session && (
                  <div className="flex items-center gap-2 pt-6">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowScheduleModal(true)}
                    >
                      <Settings className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleDeleteSession}
                      className="text-red-400 hover:text-red-300"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </div>
            </Card>

            {session ? (
              <>
                {/* Stats Row */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <ReadinessGauge score={session.readinessScore} />
                  <UpcomingCard
                    date={session.interviewDate}
                    time={session.interviewTime}
                    type={session.interviewType}
                    onEdit={() => setShowScheduleModal(true)}
                  />
                  <PracticeStatsCard session={session} />
                </div>

                {/* Quick Access */}
                <QuickAccessCards application={selectedApp} session={session} />

                {/* Tab Navigation */}
                <div className="flex gap-1 border-b border-gray-800 overflow-x-auto">
                  {tabConfig.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={cn(
                        'flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap',
                        activeTab === tab.id
                          ? 'border-blue-500 text-blue-400'
                          : 'border-transparent text-gray-400 hover:text-white hover:border-gray-600'
                      )}
                    >
                      <tab.icon className="w-4 h-4" />
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* Tab Content */}
                <div className="min-h-[400px]">
                  {activeTab === 'checklist' && (
                    <PrepChecklist session={session} application={selectedApp} />
                  )}
                  {activeTab === 'questions' && (
                    <QuestionBank
                      session={session}
                      stories={stories}
                      onGenerateQuestions={handleGenerateQuestions}
                      isGenerating={isGenerating}
                      profile={profile}
                      analysis={selectedApp?.analysis}
                      research={selectedApp?.companyResearch}
                      company={selectedApp?.company}
                      role={selectedApp?.role}
                    />
                  )}
                  {activeTab === 'practice' && (
                    <PracticePanel session={session} />
                  )}
                  {activeTab === 'day' && (
                    <InterviewDayCard
                      session={session}
                      application={selectedApp}
                      stories={stories}
                      onGenerateQuickRef={handleGenerateQuickRef}
                      isGenerating={isGenerating}
                    />
                  )}
                </div>
              </>
            ) : selectedAppId ? (
              <EmptyState
                title="Start Interview Prep"
                description={`Prepare for your interview at ${selectedApp?.company}`}
                action={{
                  label: 'Begin Preparation',
                  onClick: () => setShowNewSessionModal(true),
                }}
              />
            ) : (
              <EmptyState
                title="Select an Application"
                description="Choose an application above to start preparing"
              />
            )}
          </>
        ) : (
          <EmptyState
            title="No Upcoming Interviews"
            description="Move applications to 'Interviewing' status to start preparing"
            linkTo="/"
            linkLabel="Go to Dashboard"
          />
        )}
      </div>

      {/* Modals */}
      <NewSessionModal
        isOpen={showNewSessionModal}
        onClose={() => setShowNewSessionModal(false)}
        applications={interviewingApps}
        onCreateSession={handleCreateSession}
      />

      {session && (
        <ScheduleModal
          isOpen={showScheduleModal}
          onClose={() => setShowScheduleModal(false)}
          session={session}
          onSave={handleUpdateSession}
        />
      )}
    </div>
  );
};

export default InterviewPrepPage;
