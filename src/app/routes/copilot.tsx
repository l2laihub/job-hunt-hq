import React, { useMemo } from 'react';
import { useProfile, useApplications, useStories, useUnifiedActiveProfileId, useInterviewPrep, useTechnicalAnswers } from '@/src/hooks/useAppData';
import { InterviewCopilot } from '@/components/InterviewCopilot';

export const CopilotPage: React.FC = () => {
  const activeProfileId = useUnifiedActiveProfileId();
  const { profile } = useProfile();
  const { applications: allApplications } = useApplications();
  const { stories: allStories } = useStories();
  const { sessions: allInterviewPrepSessions } = useInterviewPrep();
  const { answers: allTechnicalAnswers } = useTechnicalAnswers();

  // Filter applications by active profile
  const applications = useMemo(() => {
    if (!activeProfileId) return allApplications;
    return allApplications.filter((app) => !app.profileId || app.profileId === activeProfileId);
  }, [allApplications, activeProfileId]);

  // Filter stories by active profile
  const stories = useMemo(() => {
    if (!activeProfileId) return allStories;
    return allStories.filter((s) => !s.profileId || s.profileId === activeProfileId);
  }, [allStories, activeProfileId]);

  // Filter interview prep sessions by active profile
  const interviewPrepSessions = useMemo(() => {
    if (!activeProfileId) return allInterviewPrepSessions;
    return allInterviewPrepSessions.filter((s) => !s.profileId || s.profileId === activeProfileId);
  }, [allInterviewPrepSessions, activeProfileId]);

  // Filter technical answers by active profile
  const technicalAnswers = useMemo(() => {
    if (!activeProfileId) return allTechnicalAnswers;
    return allTechnicalAnswers.filter((a) => !a.profileId || a.profileId === activeProfileId);
  }, [allTechnicalAnswers, activeProfileId]);

  // Show loading state if profile not ready
  if (!profile) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-gray-400">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <InterviewCopilot
      profile={profile}
      stories={stories}
      applications={applications}
      interviewPrepSessions={interviewPrepSessions}
      technicalAnswers={technicalAnswers}
    />
  );
};

export default CopilotPage;
