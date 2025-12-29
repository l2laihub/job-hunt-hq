// Application Status
export type ApplicationStatus = 'wishlist' | 'applied' | 'interviewing' | 'offer' | 'rejected';

// Achievement type for profile
export interface Achievement {
  description: string;
  metrics?: string;
  skills: string[];
  storyType: 'technical' | 'leadership' | 'impact' | 'collaboration';
}

// Role in work history
export interface Role {
  company: string;
  title: string;
  duration: string;
  highlights: string[];
}

// ============================================
// PROJECT DOCUMENTATION TYPES
// ============================================

// Media asset (screenshot, diagram, etc.)
export interface MediaAsset {
  id: string;
  type: 'screenshot' | 'architecture' | 'flowchart' | 'other';
  url: string;                    // Supabase storage URL
  filename: string;
  caption: string;
  annotations?: ImageAnnotation[];
  uploadedAt: string;
}

// Annotation on an image (callout, label)
export interface ImageAnnotation {
  id: string;
  x: number;                      // Percentage position (0-100)
  y: number;                      // Percentage position (0-100)
  label: string;
  description?: string;
  color?: string;                 // Annotation color
}

// Technical decision made during project
export interface TechnicalDecision {
  id: string;
  decision: string;               // What you decided
  context: string;                // Why it was needed
  alternatives: string[];         // Other options considered
  rationale: string;              // Why you chose this
  outcome: string;                // Result/impact
  tags: string[];                 // e.g., ['scalability', 'performance']
}

// Challenge solved during project
export interface ProjectChallenge {
  id: string;
  challenge: string;              // The problem
  approach: string;               // How you solved it
  technicalDetails: string;       // Deep dive
  lessonsLearned: string;
  relatedStoryIds?: string[];     // Links to Experience Bank STAR stories
}

// Quantifiable metric from project
export interface ProjectMetric {
  id: string;
  metric: string;                 // e.g., "Response time"
  before?: string;                // e.g., "2.5s"
  after: string;                  // e.g., "200ms"
  improvement?: string;           // e.g., "92% faster"
  context: string;
}

// Document file (markdown, code, etc.) for project documentation
export interface DocumentFile {
  id: string;
  type: 'markdown' | 'code' | 'text';
  filename: string;
  content: string;                // File content (stored in DB, not storage)
  language?: string;              // For code files: tsx, ts, js, py, etc.
  description?: string;           // User's note about the file
  uploadedAt: string;
  fileSize: number;               // Size in bytes
}

// Full project documentation
export interface ProjectDocumentation {
  // Visual assets
  screenshots: MediaAsset[];
  architectureDiagrams: MediaAsset[];

  // Document files (markdown, code, etc.)
  documentFiles?: DocumentFile[];

  // Technical narrative
  technicalDecisions: TechnicalDecision[];
  challenges: ProjectChallenge[];
  metrics: ProjectMetric[];

  // System context
  systemContext: string;          // Role in larger ecosystem
  integrations: string[];         // External APIs/services
  teamSize?: number;
  duration?: string;              // e.g., "6 months"
  myRole: string;                 // Your specific contribution

  // AI-generated content (cached)
  aiSummary?: string;
  talkingPoints?: string[];
  interviewQuestions?: string[];  // Likely questions about this project
}

// Default empty documentation
export const DEFAULT_PROJECT_DOCUMENTATION: ProjectDocumentation = {
  screenshots: [],
  architectureDiagrams: [],
  documentFiles: [],
  technicalDecisions: [],
  challenges: [],
  metrics: [],
  systemContext: '',
  integrations: [],
  myRole: '',
};

// Side project
export interface Project {
  id?: string;                    // Unique identifier
  name: string;
  description: string;
  techStack: string[];
  status: 'active' | 'launched' | 'paused';
  traction?: string;

  // Documentation (may be stored separately or inline)
  documentation?: ProjectDocumentation;
  hasDocumentation?: boolean;     // Flag if docs exist in separate table
}

// User Profile
export interface UserProfile {
  name: string;
  email?: string;
  phone?: string;
  headline: string;
  yearsExperience: number;
  technicalSkills: string[];
  softSkills: string[];
  industries: string[];
  keyAchievements: Achievement[];
  recentRoles: Role[];
  currentSituation: string;
  goals: string[];
  constraints: string[];
  activeProjects: Project[];
  preferences: {
    targetRoles: string[];
    workStyle: 'remote' | 'hybrid' | 'onsite' | 'flexible';
    salaryRange: { min: number; max: number };
    dealBreakers: string[];
    priorityFactors: string[];
  };
  freelanceProfile: {
    hourlyRate: { min: number; max: number };
    availableHours: string;
    preferredProjectTypes: string[];
    uniqueSellingPoints: string[];
  };
}

// Application Recommendation Types
export type RecommendationVerdict =
  | 'strong-apply'      // Fit score ≥8, no deal breakers, aligned with goals
  | 'apply'             // Fit score 6-7, minor gaps, worth pursuing
  | 'consider'          // Fit score 5-6, moderate gaps, weigh options
  | 'upskill-first'     // Low fit but aligns with goals, needs development
  | 'pass';             // Deal breakers present or severe misalignment

export type GapSeverity = 'minor' | 'moderate' | 'critical';

export interface SkillGapDetail {
  skill: string;
  severity: GapSeverity;
  importance: string;  // Why this skill matters for the role
  timeToAcquire?: string;  // Estimated time to learn
  suggestion?: string;  // How to acquire this skill
}

export interface DealBreakerMatch {
  userDealBreaker: string;  // From user's profile
  jobRequirement: string;   // What the JD requires
  severity: 'hard' | 'soft';  // Hard = absolute no, Soft = negotiable
}

export interface CareerAlignment {
  alignmentScore: number;  // 0-10
  alignsWithGoals: string[];  // Which of user's goals this role supports
  misalignedAreas: string[];  // Areas where role doesn't fit goals
  growthPotential: 'high' | 'medium' | 'low';
  trajectoryImpact: string;  // How this affects career trajectory
}

export interface CompensationFit {
  salaryInRange: boolean;
  assessment: string;  // "Below your minimum", "Within range", "Above expectations"
  marketComparison?: string;  // How it compares to market
  negotiationLeverage?: string;  // Your leverage for negotiation
}

export interface ApplicationRecommendation {
  verdict: RecommendationVerdict;
  confidence: number;  // 0-100
  summary: string;  // 1-2 sentence recommendation
  primaryReasons: string[];  // Top 3 reasons for the verdict
  actionItems: string[];  // What to do next based on verdict
}

// Base JD Analysis
export interface BaseJDAnalysis {
  fitScore: number;
  reasoning: string;
  analyzedAt: string;

  // NEW: Enhanced recommendation fields
  recommendation: ApplicationRecommendation;
  careerAlignment: CareerAlignment;
  compensationFit?: CompensationFit;
  dealBreakerMatches: DealBreakerMatch[];
  skillGapsDetailed: SkillGapDetail[];

  // NEW: Work style compatibility
  workStyleMatch: {
    compatible: boolean;
    jobWorkStyle: 'remote' | 'hybrid' | 'onsite' | 'unknown';
    notes?: string;
  };
}

// Full-time Employee Analysis
export interface FTEAnalysis extends BaseJDAnalysis {
  analysisType: 'fulltime';
  requiredSkills: string[];
  matchedSkills: string[];
  missingSkills: string[];
  roleType: 'IC-heavy' | 'balanced' | 'management-heavy';
  redFlags: string[];
  greenFlags: string[];
  talkingPoints: string[];
  questionsToAsk: string[];
  salaryAssessment?: string;
}

// Freelance Analysis
export interface FreelanceAnalysis extends BaseJDAnalysis {
  analysisType: 'freelance';
  projectType: 'fixed-price' | 'hourly' | 'retainer';
  estimatedEffort?: string;
  requiredSkills: string[];
  matchedSkills: string[];
  missingSkills: string[];
  redFlags: string[];
  greenFlags: string[];
  proposalAngle: string;
  openingHook: string;
  relevantExperience: string[];
  questionsForClient: string[];
  suggestedBid: {
    hourly?: number;
    fixed?: number;
    rationale: string;
  };
}

// Contract Analysis (W-2/1099 contract roles)
export interface ContractAnalysis extends BaseJDAnalysis {
  analysisType: 'contract';
  contractType: 'W-2' | '1099' | 'corp-to-corp' | 'unknown';
  duration?: string;
  extensionLikely?: boolean;
  requiredSkills: string[];
  matchedSkills: string[];
  missingSkills: string[];
  redFlags: string[];
  greenFlags: string[];
  roleType: 'IC-heavy' | 'balanced' | 'management-heavy';
  talkingPoints: string[];
  questionsToAsk: string[];
  rateAssessment?: string;
  conversionPotential?: string;
}

export type JDAnalysis = FTEAnalysis | FreelanceAnalysis | ContractAnalysis;

// Research Types
export interface NewsItem {
  headline: string;
  date: string;
  source: string;
  sentiment: 'positive' | 'neutral' | 'negative';
  summary: string;
}

export interface ResearchFlag {
  flag: string;
  detail: string;
  source: string;
  severity?: 'low' | 'medium' | 'high';
}

export interface Person {
  name: string;
  role: string;
  linkedin?: string;
  notes?: string;
}

export interface CompanyResearch {
  id: string;
  companyName: string;
  roleContext?: string;
  overview: {
    description: string;
    industry: string;
    size: string;
    founded: string;
    headquarters: string;
    fundingStatus: string;
    lastFunding?: string;
  };
  recentNews: NewsItem[];
  engineeringCulture: {
    techBlog?: string;
    openSource?: string;
    knownStack: string[];
    teamSize?: string;
    remotePolicy: 'remote' | 'hybrid' | 'onsite' | 'unknown';
    notes?: string;
  };
  redFlags: ResearchFlag[];
  greenFlags: ResearchFlag[];
  keyPeople: Person[];
  interviewIntel: {
    glassdoorRating?: string;
    interviewDifficulty?: string;
    commonTopics: string[];
    salaryRange?: string;
    employeeSentiment?: string;
  };
  verdict: {
    overall: 'green' | 'yellow' | 'red';
    summary: string;
    topConcern?: string;
    topPositive?: string;
  };
  searchedAt: string;
  sourcesUsed: string[];
}

// STAR Format
export interface STAR {
  situation: string;
  task: string;
  action: string;
  result: string;
}

// Experience/Story
export interface Experience {
  id: string;
  title: string;
  rawInput: string;
  inputMethod: 'manual' | 'voice' | 'import';
  star: STAR;
  metrics: {
    primary?: string;
    secondary: string[];
    missing?: string[];
  };
  tags: string[];
  variations: {
    leadership?: string;
    technical?: string;
    challenge?: string;
  };
  followUpQuestions: string[];
  coachingNotes?: string;
  usedInInterviews?: string[];
  timesUsed: number;
  createdAt: string;
  updatedAt: string;
  // Profile linking for multi-profile support
  profileId?: string;
}

export interface QuestionMatch {
  storyId: string;
  storyTitle: string;
  fitScore: number;
  reasoning: string;
  suggestedAngle: string;
  openingLine: string;
}

// Technical Answer Generator Types
export type TechnicalQuestionType =
  | 'behavioral-technical'
  | 'conceptual'
  | 'system-design'
  | 'problem-solving'
  | 'experience';

export type AnswerFormatType =
  | 'STAR'
  | 'Explain-Example-Tradeoffs'
  | 'Requirements-Design-Tradeoffs'
  | 'Approach-Implementation-Complexity';

export interface AnswerSection {
  label: string;
  content: string;
}

export interface FollowUpQA {
  question: string;
  likelihood: 'high' | 'medium' | 'low';
  suggestedAnswer: string;
  keyPoints: string[];
}

export interface AnswerSources {
  storyIds: string[];
  profileSections: string[];
  synthesized: boolean;
}

export interface TechnicalAnswer {
  id: string;
  question: string;
  questionType: TechnicalQuestionType;
  format: {
    type: AnswerFormatType;
    sections: AnswerSection[];
  };
  sources: AnswerSources;
  answer: {
    structured: AnswerSection[];
    narrative: string;
    bulletPoints: string[];
  };
  followUps: FollowUpQA[];
  metadata: {
    targetRole?: string;
    targetCompany?: string;
    applicationId?: string;
    difficulty: 'junior' | 'mid' | 'senior' | 'staff';
    tags: string[];
  };
  usedInInterviews: string[];
  timesUsed: number;
  practiceCount: number;
  lastPracticedAt?: string;
  createdAt: string;
  updatedAt: string;
  // Profile linking for multi-profile support
  profileId?: string;
}

export interface PracticeSession {
  id: string;
  answerId: string;
  durationSeconds?: number;
  transcript?: string;
  audioBlob?: string; // Base64 encoded audio data
  audioMimeType?: string; // e.g., 'audio/webm', 'audio/mp4'
  selfRating?: number;
  notes?: string;
  areasToImprove?: string[];
  createdAt: string;
}

// Job Application
export interface JobApplication {
  id: string;
  type: 'fulltime' | 'freelance';
  company: string;
  role: string;
  status: ApplicationStatus;
  salaryRange?: string;
  dateApplied?: string;
  source: 'linkedin' | 'upwork' | 'direct' | 'referral' | 'other';
  jobDescriptionRaw?: string;
  analysis?: JDAnalysis;
  companyResearch?: CompanyResearch;
  notes: string;
  createdAt: string;
  updatedAt: string;
  platform?: 'upwork' | 'direct' | 'other';
  proposalSent?: string;
  // Profile linking for multi-profile support
  profileId?: string;
}

// Interview Types
export interface InterviewConfig {
  type: 'behavioral' | 'technical' | 'system-design' | 'mixed';
  difficulty: 'easy' | 'medium' | 'hard';
  duration: number;
  contextAppId?: string;
  focusAreas: string[];
}

export interface InterviewFeedback {
  overallScore: number;
  strengths: string[];
  weaknesses: string[];
  communication: {
    clarity: string;
    pacing: string;
    confidence: string;
  };
  technicalAccuracy?: string;
  starStructureUse?: string;
  summary: string;
}

export interface TranscriptItem {
  role: 'user' | 'model';
  text: string;
  timestamp: string;
}

// Cover Letter Types
export type CoverLetterStyle = 'professional' | 'story-driven' | 'technical-focused' | 'startup-casual';

// Screening Question Types (extracted from JD for Upwork/LinkedIn)
export interface ScreeningQuestion {
  question: string;
  isRequired: boolean;
  questionType: 'technical' | 'experience' | 'availability' | 'rate' | 'general';
}

export interface CoverLetter {
  id: string;
  style: CoverLetterStyle;
  content: string;
  keyPoints: string[];
  wordCount: number;
  generatedAt: string;
  editedContent?: string;
  editedAt?: string;
}

// Phone Screen Prep Types
export interface PhoneScreenPrep {
  companyResearchPoints: string[];
  likelyQuestions: { question: string; suggestedAnswer: string }[];
  questionsToAsk: string[];
  talkingPoints: string[];
  redFlagResponses: string[];
  elevatorPitch: string;
  closingStatement: string;
  generatedAt: string;
}

// Technical Interview Prep Types
export interface TechnicalInterviewPrep {
  focusAreas: string[];
  likelyTopics: { topic: string; depth: 'basic' | 'intermediate' | 'deep'; notes: string }[];
  relevantStoryIds: string[];
  systemDesignTopics: string[];
  codingPatterns: string[];
  behavioralQuestions: { question: string; recommendedStoryId?: string; suggestedApproach: string }[];
  studyResources: { topic: string; resource: string; priority: 'high' | 'medium' | 'low' }[];
  practiceProblems: string[];
  generatedAt: string;
  // Enhanced topic details (Phase 1-3)
  topicDetails?: Record<string, TopicDetails>;
}

// Topic Details for expandable study cards (Phase 1-3)
export interface TopicQuestion {
  question: string;
  difficulty: 'basic' | 'intermediate' | 'advanced';
  answer: string;
  keyPoints: string[];
  followUp?: string;
}

export interface TopicResource {
  title: string;
  url: string;
  type: 'article' | 'video' | 'course' | 'documentation' | 'practice';
  source: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
}

export interface TopicDetails {
  topic: string;
  keyConcepts: string[];
  questions: TopicQuestion[];
  resources: TopicResource[];
  practiceNotes?: string;
  // Practice tracking
  practiceCount: number;
  lastPracticedAt?: string;
  confidenceLevel?: 'low' | 'medium' | 'high';
  generatedAt: string;
}

// Application Strategy Types
export interface ApplicationStrategy {
  fitAssessment: {
    score: number;
    summary: string;
    strengths: string[];
    gaps: string[];
    dealBreakers: string[];
    competitiveness: 'strong' | 'moderate' | 'weak';
  };
  applicationTiming: string;
  customizationTips: string[];
  networkingOpportunities: string[];
  salaryNegotiationNotes: string[];
  applicationChecklist: { item: string; priority: 'required' | 'recommended' | 'optional' }[];
  followUpStrategy: string;
  generatedAt: string;
}

// Analyzed Job (main entity for enhanced analyzer)
export type AnalyzedJobType = 'fulltime' | 'contract' | 'freelance';

export interface AnalyzedJob {
  id: string;
  jobDescription: string;
  type: AnalyzedJobType;

  // Basic extracted info
  company?: string;
  role?: string;
  location?: string;
  salaryRange?: string;
  source?: string;
  jobUrl?: string;

  // Core analysis
  analysis: JDAnalysis;

  // Generated content (on-demand)
  coverLetters: CoverLetter[];
  phoneScreenPrep?: PhoneScreenPrep;
  technicalInterviewPrep?: TechnicalInterviewPrep;
  applicationStrategy?: ApplicationStrategy;
  skillsRoadmap?: SkillsRoadmap;

  // Application questions & answers
  applicationQuestions?: ApplicationQuestionAnswer[];

  // Screening questions extracted from JD (Upwork, LinkedIn, etc.)
  screeningQuestions?: ScreeningQuestion[];

  // Linking
  applicationId?: string; // If saved as job application

  // Metadata
  isFavorite: boolean;
  notes?: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  // Profile linking for multi-profile support
  profileId?: string;
}

// Resume Enhancement Types
export type EnhancementMode = 'professional' | 'job-tailored';

export type SuggestionSection =
  | 'headline'
  | 'summary'
  | 'experience'
  | 'skills'
  | 'achievements'
  | 'projects';

export type SuggestionType =
  | 'rewrite'      // Improve wording/clarity
  | 'reorder'      // Change position for relevance
  | 'add'          // Add missing content
  | 'remove'       // Remove irrelevant content
  | 'quantify'     // Add metrics/numbers
  | 'keyword';     // Add ATS keywords

export interface EnhancementSuggestion {
  id: string;
  section: SuggestionSection;
  type: SuggestionType;
  targetIndex?: number;        // For array items (roles, achievements, etc.)
  field?: string;              // Specific field within section
  original: string;
  suggested: string;
  reason: string;
  impact: 'high' | 'medium' | 'low';
  keywords?: string[];         // Keywords being added
  applied: boolean;
}

export interface ExperienceRelevance {
  roleIndex: number;
  company: string;
  title: string;
  relevanceScore: number;
  matchedKeywords: string[];
  reason: string;
}

export interface ResumeAnalysis {
  overallScore: number;
  atsScore: number;
  strengthAreas: string[];
  improvementAreas: string[];
  missingKeywords: string[];
  matchedKeywords: string[];
  experienceRelevance: ExperienceRelevance[];
  recommendedOrder: number[];  // Reordered indices for experiences
  skillsAnalysis: {
    strongMatch: string[];
    partialMatch: string[];
    missing: string[];
    irrelevant: string[];
  };
  summary: string;
}

export interface EnhancedRole extends Role {
  originalIndex: number;
  relevanceScore?: number;
  enhancedHighlights: string[];
}

export interface EnhancedProfile {
  headline: string;
  summary?: string;
  technicalSkills: string[];
  softSkills: string[];
  recentRoles: EnhancedRole[];
  keyAchievements: Achievement[];
}

export interface ResumeEnhancement {
  id: string;
  mode: EnhancementMode;
  jobId?: string;              // Link to AnalyzedJob if tailored
  jobTitle?: string;
  companyName?: string;

  // Analysis results
  analysis: ResumeAnalysis;

  // Suggestions
  suggestions: EnhancementSuggestion[];
  appliedSuggestionIds: string[];

  // Enhanced content preview
  enhancedProfile: EnhancedProfile;

  // Metadata
  createdAt: string;
  updatedAt: string;
}

// Application Question Answer Types - for LinkedIn/Company Application Questions
export interface ApplicationQuestionAnswer {
  id: string;
  question: string;
  questionType: 'behavioral' | 'experience' | 'technical' | 'motivation' | 'situational' | 'custom';
  generatedAnswer: string;
  sources: {
    profileSections: string[]; // e.g., ['recentRoles', 'keyAchievements']
    storyIds: string[]; // STAR stories used
    synthesized: boolean; // If answer was synthesized from multiple sources
  };
  alternativeAnswers?: string[]; // Shorter/longer variations
  keyPoints: string[];
  wordCount: number;
  characterCount: number;
  editedAnswer?: string;
  editedAt?: string;
  copyCount: number;
  createdAt: string;
}

// Skills Roadmap Types - for aspirational jobs with low fit
export type SkillPriority = 'critical' | 'important' | 'nice-to-have';
export type SkillLevel = 'none' | 'beginner' | 'intermediate' | 'advanced' | 'expert';
export type ResourceType = 'course' | 'book' | 'tutorial' | 'project' | 'certification' | 'practice';
export type ResourceCost = 'free' | 'paid' | 'subscription';
export type CertificationRelevance = 'required' | 'highly-valued' | 'nice-to-have';

export interface LearningResource {
  type: ResourceType;
  name: string;
  provider: string;
  url?: string;
  estimatedHours?: number;
  cost: ResourceCost;
}

export interface SkillGap {
  skill: string;
  priority: SkillPriority;
  currentLevel: SkillLevel;
  targetLevel: SkillLevel;
  estimatedTime: string;
  learningResources?: LearningResource[];
  practiceProjects?: string[];
}

export interface ExperienceGap {
  area: string;
  currentExperience: string;
  requiredExperience: string;
  howToGain: string[];
}

export interface SteppingStoneRole {
  roleTitle: string;
  whyItHelps: string;
  fitScore: number;
  skillsYoullGain: string[];
}

export interface RoadmapCertification {
  name: string;
  provider: string;
  relevance: CertificationRelevance;
  estimatedPrepTime: string;
  cost: string;
}

export interface RoadmapMilestone {
  title: string;
  description: string;
  estimatedTimeFromStart: string;
  expectedFitScore: number;
}

export interface SkillsRoadmap {
  currentFitScore: number;
  targetFitScore: number;
  totalEstimatedTime: string;
  summary: string;
  skillGaps: SkillGap[];
  experienceGaps?: ExperienceGap[];
  steppingStoneRoles?: SteppingStoneRole[];
  certifications?: RoadmapCertification[];
  quickWins: string[];
  milestones: RoadmapMilestone[];
  reapplyTimeline?: string;
  generatedAt: string;
}

// Profile Metadata for multi-profile support
export interface ProfileMetadata {
  id: string;
  name: string; // Display name like "Frontend Focus", "Freelance Profile"
  description?: string;
  color?: string; // For visual distinction
  createdAt: string;
  updatedAt: string;
  isDefault: boolean;
}

// User Profile with metadata for multi-profile support
export interface UserProfileWithMeta extends UserProfile {
  metadata: ProfileMetadata;
}

// Helper to create default profile metadata
export function createProfileMetadata(name: string, isDefault = false): ProfileMetadata {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    name,
    createdAt: now,
    updatedAt: now,
    isDefault,
  };
}

// Default Profile
export const DEFAULT_PROFILE: UserProfile = {
  name: 'Senior Engineer',
  email: '',
  phone: '',
  headline: 'Senior Software Engineer',
  yearsExperience: 5,
  technicalSkills: [],
  softSkills: [],
  industries: [],
  keyAchievements: [],
  recentRoles: [],
  currentSituation: 'Looking for new opportunities',
  goals: [],
  constraints: [],
  activeProjects: [],
  preferences: {
    targetRoles: ['Software Engineer'],
    workStyle: 'remote',
    salaryRange: { min: 100000, max: 200000 },
    dealBreakers: [],
    priorityFactors: [],
  },
  freelanceProfile: {
    hourlyRate: { min: 50, max: 100 },
    availableHours: '20 hrs/week',
    preferredProjectTypes: [],
    uniqueSellingPoints: [],
  },
};

// Create a new profile with metadata
export function createDefaultProfileWithMeta(name: string, isDefault = false): UserProfileWithMeta {
  return {
    ...DEFAULT_PROFILE,
    metadata: createProfileMetadata(name, isDefault),
  };
}

// Profile colors for visual distinction
export const PROFILE_COLORS = [
  '#3B82F6', // blue
  '#8B5CF6', // purple
  '#10B981', // green
  '#F59E0B', // amber
  '#EF4444', // red
  '#EC4899', // pink
  '#06B6D4', // cyan
  '#84CC16', // lime
] as const;

// Re-export interview prep types
export * from './interview-prep';
