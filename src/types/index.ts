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

// Side project
export interface Project {
  name: string;
  description: string;
  techStack: string[];
  status: 'active' | 'launched' | 'paused';
  traction?: string;
}

// User Profile
export interface UserProfile {
  name: string;
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

// Base JD Analysis
export interface BaseJDAnalysis {
  fitScore: number;
  reasoning: string;
  analyzedAt: string;
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
}

export interface PracticeSession {
  id: string;
  answerId: string;
  duration: number;
  transcript?: string;
  audioBlob?: string; // Base64 encoded audio data
  audioMimeType?: string; // e.g., 'audio/webm', 'audio/mp4'
  selfRating?: number;
  notes?: string;
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

  // Linking
  applicationId?: string; // If saved as job application

  // Metadata
  isFavorite: boolean;
  notes?: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
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

// Default Profile
export const DEFAULT_PROFILE: UserProfile = {
  name: 'Senior Engineer',
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
