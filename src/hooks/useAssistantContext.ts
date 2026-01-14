/**
 * Assistant Context Detection Hook
 *
 * Automatically detects and builds context based on the current route
 * and available data for the AI assistant.
 */
import { useMemo, useEffect } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import type {
  AssistantContext,
  AssistantContextType,
} from '@/src/types/assistant';
import { CONTEXT_SUGGESTIONS } from '@/src/types/assistant';
import {
  useApplicationStore,
  useAnalyzedJobsStore,
  useStoriesStore,
  useCompanyResearchStore,
  useInterviewPrepStore,
} from '@/src/stores';
import {
  useSupabaseApplicationStore,
  useSupabaseAnalyzedJobsStore,
  useSupabaseStoriesStore,
  useSupabaseCompanyResearchStore,
  useSupabaseInterviewPrepStore,
} from '@/src/stores/supabase';
import { useAuth } from '@/src/lib/supabase';
import { useProfileData } from '@/src/hooks/useProfileData';

// ============================================
// ROUTE TO CONTEXT TYPE MAPPING
// ============================================

function getContextTypeFromRoute(pathname: string): AssistantContextType {
  // Normalize pathname
  const path = pathname.toLowerCase();

  if (path === '/' || path === '/dashboard') return 'general';
  if (path.startsWith('/analyzer')) return 'application';
  if (path.startsWith('/interview-prep')) return 'interview-prep';
  if (path.startsWith('/research')) return 'company-research';
  if (path.startsWith('/stories')) return 'story';
  if (path.startsWith('/profile')) return 'profile';
  if (path.startsWith('/enhance')) return 'enhancement';
  if (path.startsWith('/copilot')) return 'general'; // Copilot has its own assistant
  if (path.startsWith('/answers')) return 'general';
  if (path.startsWith('/mock-interview')) return 'interview-prep';

  return 'general';
}

// ============================================
// CONTEXT BUILDER
// ============================================

interface UseAssistantContextOptions {
  /**
   * Specific application ID to load context for
   */
  applicationId?: string;

  /**
   * Whether to auto-update context when route changes
   */
  autoUpdate?: boolean;
}

/**
 * Hook that detects and builds context for the AI assistant
 * based on the current route and available data.
 */
export function useAssistantContext(
  options: UseAssistantContextOptions = {}
): AssistantContext {
  const { applicationId: explicitAppId, autoUpdate = true } = options;

  const location = useLocation();
  const [searchParams] = useSearchParams();

  // Check if user is authenticated to determine which stores to use
  const { user, isConfigured } = useAuth();
  const isAuthenticated = Boolean(user && isConfigured);

  // Get localStorage stores (fallback)
  const localApplications = useApplicationStore((s) => s.applications);
  const localSelectedAppIds = useApplicationStore((s) => s.selectedIds);
  const localAnalyzedJobs = useAnalyzedJobsStore((s) => s.jobs);
  const localSelectedJobId = useAnalyzedJobsStore((s) => s.selectedJobId);
  const localStories = useStoriesStore((s) => s.stories);
  const localCompanyResearch = useCompanyResearchStore((s) => s.research);
  const localPrepSessions = useInterviewPrepStore((s) => s.sessions);

  // Get Supabase stores (when authenticated)
  const supabaseApplications = useSupabaseApplicationStore((s) => s.applications);
  const supabaseSelectedAppIds = useSupabaseApplicationStore((s) => s.selectedIds);
  const supabaseAnalyzedJobs = useSupabaseAnalyzedJobsStore((s) => s.jobs);
  const supabaseSelectedJobId = useSupabaseAnalyzedJobsStore((s) => s.selectedJobId);
  const supabaseStories = useSupabaseStoriesStore((s) => s.stories);
  const supabaseCompanyResearch = useSupabaseCompanyResearchStore((s) => s.research);
  const supabasePrepSessions = useSupabaseInterviewPrepStore((s) => s.sessions);

  // Use Supabase stores when authenticated, otherwise localStorage
  // Add fallback empty arrays to prevent undefined errors before stores load
  const applications = (isAuthenticated ? supabaseApplications : localApplications) || [];
  const selectedAppIds = (isAuthenticated ? supabaseSelectedAppIds : localSelectedAppIds) || [];
  const analyzedJobs = (isAuthenticated ? supabaseAnalyzedJobs : localAnalyzedJobs) || [];
  const globalSelectedJobId = isAuthenticated ? supabaseSelectedJobId : localSelectedJobId;
  const stories = (isAuthenticated ? supabaseStories : localStories) || [];
  const companyResearch = (isAuthenticated ? supabaseCompanyResearch : localCompanyResearch) || [];
  const prepSessions = (isAuthenticated ? supabasePrepSessions : localPrepSessions) || [];

  // Use unified profile data hook - this automatically uses Supabase when authenticated
  const { activeProfile: profile } = useProfileData();

  // Build context
  const context = useMemo<AssistantContext>(() => {
    const pathname = location.pathname;
    const contextType = getContextTypeFromRoute(pathname);

    // Determine application ID from various sources
    const appIdFromUrl = searchParams.get('appId') || searchParams.get('applicationId');
    const appIdFromSelection = selectedAppIds.length === 1 ? selectedAppIds[0] : undefined;
    let applicationId: string | undefined = explicitAppId || appIdFromUrl || appIdFromSelection;

    // Load related data based on application ID
    let application = applicationId
      ? applications.find((a) => a.id === applicationId)
      : undefined;

    let analyzedJob = application?.id
      ? analyzedJobs.find((j) => j.applicationId === application!.id)
      : undefined;

    // If on analyzer page, prioritize the globally selected job from the store
    if (contextType === 'application' && globalSelectedJobId) {
      const selectedJob = analyzedJobs.find((j) => j.id === globalSelectedJobId);
      if (selectedJob) {
        analyzedJob = selectedJob;
        // If the selected job has an applicationId, use that
        if (selectedJob.applicationId) {
          applicationId = selectedJob.applicationId;
          application = applications.find((a) => a.id === applicationId);
        }
      }
    }

    // Fallback: If still no analyzed job and on analyzer page, try to find context from recent jobs
    if (!analyzedJob && contextType === 'application' && analyzedJobs.length > 0) {
      // Get the most recent analyzed job (likely the one being viewed)
      const sortedJobs = [...analyzedJobs].sort(
        (a, b) => new Date(b.analyzedAt || b.createdAt).getTime() - new Date(a.analyzedAt || a.createdAt).getTime()
      );

      // First try to find one with an applicationId
      const recentJobWithApp = sortedJobs.find((j) => j.applicationId);
      if (recentJobWithApp?.applicationId) {
        applicationId = recentJobWithApp.applicationId;
        application = applications.find((a) => a.id === applicationId);
        analyzedJob = recentJobWithApp;
      } else if (sortedJobs.length > 0) {
        // Use the most recent analyzed job even without applicationId
        analyzedJob = sortedJobs[0];
      }
    }

    // Try to find company research based on application or analyzed job
    let research = application?.company
      ? companyResearch.find(
          (r) => r.companyName.toLowerCase() === application!.company.toLowerCase()
        )
      : undefined;

    // If no research from application, try from analyzed job
    if (!research && analyzedJob?.company) {
      research = companyResearch.find(
        (r) => r.companyName.toLowerCase() === analyzedJob!.company!.toLowerCase()
      );
    }

    const prepSession = applicationId
      ? prepSessions.find((s) => s.applicationId === applicationId)
      : undefined;

    // Get profile-scoped stories
    const profileStories = profile?.metadata.id
      ? stories.filter((s) => s.profileId === profile.metadata.id)
      : stories;

    // Build summary based on context type
    let summary = '';
    switch (contextType) {
      case 'application':
        if (application) {
          summary = `Viewing ${application.company} - ${application.role} (${application.status})`;
          if (application.analysis) {
            summary += ` | Fit: ${application.analysis.fitScore}/10`;
          }
        } else if (analyzedJob) {
          // Use analyzed job data when no application linked
          summary = `Viewing ${analyzedJob.company || 'Job'} - ${analyzedJob.role || 'Role'}`;
          if (analyzedJob.analysis?.fitScore) {
            summary += ` | Fit: ${analyzedJob.analysis.fitScore}/10`;
          }
        } else {
          summary = 'Job analysis and preparation';
        }
        break;

      case 'interview-prep':
        if (prepSession && application) {
          summary = `Preparing for ${prepSession.interviewType} at ${application.company}`;
          summary += ` | Readiness: ${prepSession.readinessScore}%`;
        } else if (application) {
          summary = `Interview prep for ${application.company} - ${application.role}`;
        } else {
          summary = 'Interview preparation';
        }
        break;

      case 'company-research':
        if (research) {
          summary = `Researching ${research.companyName} | Verdict: ${research.verdict?.overall || 'N/A'}`;
        } else {
          summary = 'Company research and analysis';
        }
        break;

      case 'story':
        summary = `Experience Bank | ${profileStories.length} stories available`;
        break;

      case 'profile':
        if (profile) {
          summary = `Editing profile: ${profile.metadata.name}`;
        } else {
          summary = 'Profile setup and optimization';
        }
        break;

      case 'enhancement':
        summary = 'Resume enhancement and optimization';
        break;

      default:
        if (profile) {
          summary = `${profile.name} | ${applications.length} applications tracked`;
        } else {
          summary = 'General job search assistance';
        }
    }

    // Get suggestions for this context
    const suggestions = CONTEXT_SUGGESTIONS[contextType] || CONTEXT_SUGGESTIONS.general;

    return {
      type: contextType,
      route: pathname,
      applicationId,
      prepSessionId: prepSession?.id,
      application,
      analyzedJob,
      companyResearch: research,
      prepSession,
      stories: profileStories,
      profile: profile || undefined,
      summary,
      suggestions,
    };
  }, [
    location.pathname,
    searchParams,
    explicitAppId,
    isAuthenticated,
    applications,
    selectedAppIds,
    analyzedJobs,
    globalSelectedJobId,
    stories,
    companyResearch,
    prepSessions,
    profile,
  ]);

  return context;
}

/**
 * Hook that syncs context to the assistant store
 */
export function useAssistantContextSync(): void {
  const context = useAssistantContext();
  const setContext = useAssistantStore((s) => s.setContext);

  useEffect(() => {
    setContext(context);
  }, [context, setContext]);
}

// Import here to avoid circular dependency
import { useAssistantStore } from '@/src/stores/assistant';
