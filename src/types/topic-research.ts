/**
 * Topic Research Types
 * Types for the AI Assistant's topic research feature
 */

// ============================================
// RESEARCH TYPE CATEGORIES
// ============================================

/**
 * Types of research the assistant can perform
 */
export type TopicResearchType =
  | 'salary'      // Salary/compensation research
  | 'industry'    // Industry trends and market analysis
  | 'technical'   // Technical topics (frameworks, languages, concepts)
  | 'interview';  // Interview topics (company-specific interview prep)

/**
 * Research status
 */
export type ResearchStatus = 'pending' | 'completed' | 'failed';

// ============================================
// CLASSIFICATION TYPES
// ============================================

/**
 * Result from classifying a message for research intent
 */
export interface ResearchClassification {
  needsResearch: boolean;
  researchType: TopicResearchType | null;
  confidence: number;           // 0-100
  extractedQuery: string;       // Refined query for research
  reasoning: string;            // Why this classification
}

// ============================================
// SOURCE TYPES
// ============================================

/**
 * Source information from grounding
 */
export interface ResearchSource {
  title?: string;
  url: string;
  snippet?: string;
}

// ============================================
// BASE RESEARCH TYPE
// ============================================

/**
 * Base fields for all research types
 */
export interface BaseTopicResearch {
  id: string;
  userId?: string;
  profileId?: string;
  type: TopicResearchType;
  query: string;              // Original user query
  status: ResearchStatus;

  // Linking to job context
  applicationId?: string;
  analyzedJobId?: string;
  companyContext?: string;    // Company name if relevant
  roleContext?: string;       // Role if relevant

  // Sources from Google Search grounding
  sources: ResearchSource[];
  searchedAt: string;

  // Metadata
  tags: string[];
  isFavorite: boolean;
  createdAt: string;
  updatedAt: string;
}

// ============================================
// SALARY RESEARCH
// ============================================

/**
 * Salary/compensation research data
 */
export interface SalaryResearchData {
  role: string;
  location?: string;
  experienceLevel?: string;
  rangeEstimate: {
    low: number;
    median: number;
    high: number;
    currency: string;
  };
  factors: string[];            // Factors affecting salary
  byCompanySize?: {
    startup?: string;
    midsize?: string;
    enterprise?: string;
  };
  negotiationTips: string[];
  marketTrend: 'increasing' | 'stable' | 'decreasing';
  comparison?: {
    vsUserTarget?: 'above' | 'within' | 'below';
    notes?: string;
  };
  summary: string;
}

export interface SalaryResearch extends BaseTopicResearch {
  type: 'salary';
  data: SalaryResearchData;
}

// ============================================
// INDUSTRY RESEARCH
// ============================================

/**
 * Industry trends research data
 */
export interface IndustryResearchData {
  industry: string;
  currentTrends: {
    trend: string;
    impact: 'high' | 'medium' | 'low';
    description: string;
  }[];
  emergingTech: string[];
  marketOutlook: 'growing' | 'stable' | 'contracting';
  keyPlayers: string[];
  skillsInDemand: string[];
  challenges: string[];
  opportunities: string[];
  timeframe?: string;            // e.g., "2024-2025"
  summary: string;
}

export interface IndustryResearch extends BaseTopicResearch {
  type: 'industry';
  data: IndustryResearchData;
}

// ============================================
// TECHNICAL RESEARCH
// ============================================

/**
 * Technical topic research data
 */
export interface TechnicalResearchData {
  topic: string;
  category: 'framework' | 'language' | 'concept' | 'tool' | 'methodology' | 'other';
  overview: string;
  keyFeatures: string[];
  useCases: string[];
  prosAndCons: {
    pros: string[];
    cons: string[];
  };
  alternatives: {
    name: string;
    comparison: string;
  }[];
  learningResources: {
    type: 'course' | 'book' | 'tutorial' | 'documentation' | 'other';
    name: string;
    url?: string;
    difficulty?: 'beginner' | 'intermediate' | 'advanced';
  }[];
  interviewRelevance: {
    commonQuestions: string[];
    keyPointsToKnow: string[];
  };
  marketAdoption: 'mainstream' | 'growing' | 'niche' | 'emerging' | 'declining';
  summary: string;
}

export interface TechnicalResearch extends BaseTopicResearch {
  type: 'technical';
  data: TechnicalResearchData;
}

// ============================================
// INTERVIEW RESEARCH
// ============================================

/**
 * Interview topic research data
 */
export interface InterviewResearchData {
  company?: string;
  role?: string;
  interviewProcess: {
    stages: string[];
    typicalDuration?: string;
    format?: string;
  };
  commonQuestions: {
    question: string;
    category: 'behavioral' | 'technical' | 'situational' | 'culture' | 'other';
    tips?: string;
  }[];
  technicalTopics: string[];
  companyValues?: string[];
  whatTheyLookFor: string[];
  redFlags: string[];           // What to avoid
  tips: string[];
  recentInsights?: string[];    // From Glassdoor, Blind, etc.
  difficulty: 'easy' | 'medium' | 'hard';
  summary: string;
}

export interface InterviewResearch extends BaseTopicResearch {
  type: 'interview';
  data: InterviewResearchData;
}

// ============================================
// UNION TYPE
// ============================================

/**
 * Union type for all research types
 */
export type TopicResearch =
  | SalaryResearch
  | IndustryResearch
  | TechnicalResearch
  | InterviewResearch;

// ============================================
// TYPE GUARDS
// ============================================

export function isSalaryResearch(r: TopicResearch): r is SalaryResearch {
  return r.type === 'salary';
}

export function isIndustryResearch(r: TopicResearch): r is IndustryResearch {
  return r.type === 'industry';
}

export function isTechnicalResearch(r: TopicResearch): r is TechnicalResearch {
  return r.type === 'technical';
}

export function isInterviewResearch(r: TopicResearch): r is InterviewResearch {
  return r.type === 'interview';
}

// ============================================
// DATABASE ROW TYPES
// ============================================

/**
 * Database row type for topic_research table
 */
export interface TopicResearchRow {
  id: string;
  user_id: string;
  profile_id: string | null;
  type: string;
  query: string;
  status: string;
  application_id: string | null;
  analyzed_job_id: string | null;
  company_context: string | null;
  role_context: string | null;
  data: Record<string, unknown>;
  sources: ResearchSource[];
  tags: string[];
  is_favorite: boolean;
  searched_at: string;
  created_at: string;
  updated_at: string;
}

// ============================================
// CONVERTERS
// ============================================

/**
 * Convert database row to TopicResearch
 */
export function topicResearchRowToResearch(row: TopicResearchRow): TopicResearch {
  const base: BaseTopicResearch = {
    id: row.id,
    userId: row.user_id,
    profileId: row.profile_id || undefined,
    type: row.type as TopicResearchType,
    query: row.query,
    status: row.status as ResearchStatus,
    applicationId: row.application_id || undefined,
    analyzedJobId: row.analyzed_job_id || undefined,
    companyContext: row.company_context || undefined,
    roleContext: row.role_context || undefined,
    sources: row.sources || [],
    tags: row.tags || [],
    isFavorite: row.is_favorite,
    searchedAt: row.searched_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };

  // Return with type-specific data
  return {
    ...base,
    data: row.data,
  } as TopicResearch;
}

/**
 * Convert TopicResearch to database row
 */
export function topicResearchToRow(
  research: Omit<TopicResearch, 'id' | 'userId' | 'createdAt' | 'updatedAt'>,
  userId: string
): Omit<TopicResearchRow, 'id' | 'created_at' | 'updated_at'> {
  return {
    user_id: userId,
    profile_id: research.profileId || null,
    type: research.type,
    query: research.query,
    status: research.status,
    application_id: research.applicationId || null,
    analyzed_job_id: research.analyzedJobId || null,
    company_context: research.companyContext || null,
    role_context: research.roleContext || null,
    data: research.data as Record<string, unknown>,
    sources: research.sources,
    tags: research.tags,
    is_favorite: research.isFavorite,
    searched_at: research.searchedAt,
  };
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get display label for research type
 */
export function getResearchTypeLabel(type: TopicResearchType): string {
  const labels: Record<TopicResearchType, string> = {
    salary: 'Salary & Compensation',
    industry: 'Industry Trends',
    technical: 'Technical Topic',
    interview: 'Interview Prep',
  };
  return labels[type];
}

/**
 * Get icon name for research type (for use with lucide-react)
 */
export function getResearchTypeIcon(type: TopicResearchType): string {
  const icons: Record<TopicResearchType, string> = {
    salary: 'DollarSign',
    industry: 'TrendingUp',
    technical: 'Code',
    interview: 'MessageSquare',
  };
  return icons[type];
}

/**
 * Create a new topic research object
 */
export function createTopicResearch<T extends TopicResearchType>(
  type: T,
  query: string,
  data: T extends 'salary' ? SalaryResearchData :
        T extends 'industry' ? IndustryResearchData :
        T extends 'technical' ? TechnicalResearchData :
        InterviewResearchData,
  options?: {
    applicationId?: string;
    analyzedJobId?: string;
    companyContext?: string;
    roleContext?: string;
    profileId?: string;
    sources?: ResearchSource[];
    tags?: string[];
  }
): Omit<TopicResearch, 'id' | 'userId' | 'createdAt' | 'updatedAt'> {
  const now = new Date().toISOString();

  return {
    type,
    query,
    status: 'completed',
    data,
    sources: options?.sources || [],
    tags: options?.tags || [],
    isFavorite: false,
    searchedAt: now,
    applicationId: options?.applicationId,
    analyzedJobId: options?.analyzedJobId,
    companyContext: options?.companyContext,
    roleContext: options?.roleContext,
    profileId: options?.profileId,
  } as Omit<TopicResearch, 'id' | 'userId' | 'createdAt' | 'updatedAt'>;
}
