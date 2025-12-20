/**
 * Database Service Types
 * Type converters between Supabase rows and application types
 */
import type {
  UserProfile,
  UserProfileWithMeta,
  ProfileMetadata,
  JobApplication,
  Experience,
  CompanyResearch,
  JDAnalysis,
} from '@/src/types';
import type {
  ProfileRow,
  ApplicationRow,
  StoryRow,
  CompanyResearchRow,
  TechnicalAnswerRow,
  AnalyzedJobRow,
  PracticeSessionRow,
  Json,
} from '@/src/lib/supabase/types';

// ============================================
// Profile Converters
// ============================================

export function profileRowToUserProfileWithMeta(row: ProfileRow): UserProfileWithMeta {
  const metadata: ProfileMetadata = {
    id: row.id,
    name: row.name,
    description: row.description || undefined,
    color: row.color || '#3B82F6',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    isDefault: row.is_default,
  };

  const profile: UserProfileWithMeta = {
    metadata,
    name: row.display_name,
    email: row.email || undefined,
    phone: row.phone || undefined,
    headline: row.headline,
    yearsExperience: row.years_experience,
    currentSituation: row.current_situation,
    technicalSkills: (row.technical_skills as unknown as string[]) || [],
    softSkills: (row.soft_skills as unknown as string[]) || [],
    industries: (row.industries as unknown as string[]) || [],
    goals: (row.goals as unknown as string[]) || [],
    constraints: (row.constraints as unknown as string[]) || [],
    keyAchievements: (row.key_achievements as unknown as UserProfile['keyAchievements']) || [],
    recentRoles: (row.recent_roles as unknown as UserProfile['recentRoles']) || [],
    activeProjects: (row.active_projects as unknown as UserProfile['activeProjects']) || [],
    preferences: (row.preferences as unknown as UserProfile['preferences']) || {
      targetRoles: [],
      workStyle: 'remote',
      salaryRange: { min: 100000, max: 200000 },
      dealBreakers: [],
      priorityFactors: [],
    },
    freelanceProfile: (row.freelance_profile as unknown as UserProfile['freelanceProfile']) || {
      hourlyRate: { min: 50, max: 100 },
      availableHours: '20 hrs/week',
      preferredProjectTypes: [],
      uniqueSellingPoints: [],
    },
  };

  return profile;
}

export function userProfileWithMetaToRow(
  profile: UserProfileWithMeta,
  userId: string
): Omit<ProfileRow, 'created_at' | 'updated_at'> {
  return {
    id: profile.metadata.id,
    user_id: userId,
    name: profile.metadata.name,
    description: profile.metadata.description || null,
    color: profile.metadata.color || '#3B82F6',
    is_default: profile.metadata.isDefault,
    display_name: profile.name,
    email: profile.email || null,
    phone: profile.phone || null,
    headline: profile.headline,
    years_experience: profile.yearsExperience,
    current_situation: profile.currentSituation,
    technical_skills: profile.technicalSkills as unknown as Json,
    soft_skills: profile.softSkills as unknown as Json,
    industries: profile.industries as unknown as Json,
    goals: profile.goals as unknown as Json,
    constraints: profile.constraints as unknown as Json,
    key_achievements: profile.keyAchievements as unknown as Json,
    recent_roles: profile.recentRoles as unknown as Json,
    active_projects: profile.activeProjects as unknown as Json,
    preferences: profile.preferences as unknown as Json,
    freelance_profile: profile.freelanceProfile as unknown as Json,
  };
}

// ============================================
// Application Converters
// ============================================

export function applicationRowToJobApplication(row: ApplicationRow): JobApplication {
  return {
    id: row.id,
    type: row.type,
    company: row.company,
    role: row.role,
    status: row.status,
    source: row.source || 'other',
    salaryRange: row.salary_range || undefined,
    dateApplied: row.date_applied || undefined,
    notes: row.notes,
    jobDescriptionRaw: row.job_description_raw || undefined,
    platform: row.platform || undefined,
    proposalSent: row.proposal_sent || undefined,
    analysis: (row.analysis as unknown as JDAnalysis) || undefined,
    companyResearch: (row.company_research as unknown as CompanyResearch) || undefined,
    profileId: row.profile_id || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function jobApplicationToRow(
  app: JobApplication,
  userId: string
): Omit<ApplicationRow, 'created_at' | 'updated_at'> {
  return {
    id: app.id,
    user_id: userId,
    profile_id: app.profileId || null,
    type: app.type,
    company: app.company,
    role: app.role,
    status: app.status,
    source: app.source,
    salary_range: app.salaryRange || null,
    date_applied: app.dateApplied || null,
    notes: app.notes,
    job_description_raw: app.jobDescriptionRaw || null,
    platform: app.platform || null,
    proposal_sent: app.proposalSent || null,
    analysis: (app.analysis || null) as Json | null,
    company_research: (app.companyResearch || null) as Json | null,
  };
}

// ============================================
// Story Converters
// ============================================

export function storyRowToExperience(row: StoryRow): Experience {
  const star = row.star as unknown as Experience['star'];
  const metrics = row.metrics as unknown as Experience['metrics'];
  const variations = row.variations as unknown as Experience['variations'];

  return {
    id: row.id,
    title: row.title,
    rawInput: row.raw_input,
    inputMethod: row.input_method,
    star: star || { situation: '', task: '', action: '', result: '' },
    metrics: metrics || { primary: undefined, secondary: [], missing: [] },
    tags: row.tags || [],
    variations: variations || {},
    followUpQuestions: row.follow_up_questions || [],
    coachingNotes: row.coaching_notes || undefined,
    usedInInterviews: row.used_in_interviews || [],
    timesUsed: row.times_used,
    profileId: row.profile_id || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function experienceToRow(
  story: Experience,
  userId: string
): Omit<StoryRow, 'created_at' | 'updated_at'> {
  return {
    id: story.id,
    user_id: userId,
    profile_id: story.profileId || null,
    title: story.title,
    raw_input: story.rawInput,
    input_method: story.inputMethod,
    star: story.star as unknown as Json,
    metrics: story.metrics as unknown as Json,
    tags: story.tags,
    variations: story.variations as unknown as Json,
    follow_up_questions: story.followUpQuestions,
    coaching_notes: story.coachingNotes || null,
    used_in_interviews: story.usedInInterviews || [],
    times_used: story.timesUsed,
  };
}

// ============================================
// Company Research Converters
// ============================================

export function companyResearchRowToCompanyResearch(row: CompanyResearchRow): CompanyResearch {
  return {
    id: row.id,
    companyName: row.company_name,
    roleContext: row.role_context || undefined,
    overview: (row.overview as unknown as CompanyResearch['overview']) || {
      description: '',
      industry: '',
      size: '',
      founded: '',
      headquarters: '',
      fundingStatus: '',
    },
    recentNews: (row.recent_news as unknown as CompanyResearch['recentNews']) || [],
    engineeringCulture: (row.engineering_culture as unknown as CompanyResearch['engineeringCulture']) || {
      knownStack: [],
      remotePolicy: 'unknown',
    },
    redFlags: (row.red_flags as unknown as CompanyResearch['redFlags']) || [],
    greenFlags: (row.green_flags as unknown as CompanyResearch['greenFlags']) || [],
    keyPeople: (row.key_people as unknown as CompanyResearch['keyPeople']) || [],
    interviewIntel: (row.interview_intel as unknown as CompanyResearch['interviewIntel']) || {
      commonTopics: [],
    },
    verdict: (row.verdict as unknown as CompanyResearch['verdict']) || {
      overall: 'yellow',
      summary: '',
    },
    searchedAt: row.searched_at,
    sourcesUsed: row.sources_used || [],
  };
}

export function companyResearchToRow(
  research: CompanyResearch,
  userId: string
): Omit<CompanyResearchRow, 'created_at'> {
  return {
    id: research.id,
    user_id: userId,
    company_name: research.companyName,
    role_context: research.roleContext || null,
    overview: research.overview as unknown as Json,
    recent_news: research.recentNews as unknown as Json,
    engineering_culture: research.engineeringCulture as unknown as Json,
    red_flags: research.redFlags as unknown as Json,
    green_flags: research.greenFlags as unknown as Json,
    key_people: research.keyPeople as unknown as Json,
    interview_intel: research.interviewIntel as unknown as Json,
    verdict: research.verdict as unknown as Json,
    sources_used: research.sourcesUsed,
    searched_at: research.searchedAt,
  };
}

// Re-export row types for convenience
export type {
  ProfileRow,
  ApplicationRow,
  StoryRow,
  CompanyResearchRow,
  TechnicalAnswerRow,
  AnalyzedJobRow,
  PracticeSessionRow,
};
