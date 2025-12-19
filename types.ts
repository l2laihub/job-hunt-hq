
export type ApplicationStatus = 'wishlist' | 'applied' | 'interviewing' | 'offer' | 'rejected';

export interface Achievement {
  description: string;
  metrics?: string;
  skills: string[];
  storyType: 'technical' | 'leadership' | 'impact' | 'collaboration';
}

export interface Role {
  company: string;
  title: string;
  duration: string;
  highlights: string[];
}

export interface Project {
  name: string;
  description: string;
  techStack: string[];
  status: 'active' | 'launched' | 'paused';
  traction?: string;
}

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

export interface BaseJDAnalysis {
  fitScore: number;
  reasoning: string;
  analyzedAt: string;
}

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

export type JDAnalysis = FTEAnalysis | FreelanceAnalysis;

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
  severity?: 'low' | 'medium' | 'high'; // only for red flags
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

// Experience Bank Types
export interface STAR {
  situation: string;
  task: string;
  action: string;
  result: string;
}

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

export interface JobApplication {
  id: string;
  type: 'fulltime' | 'freelance';
  company: string;
  role: string;
  status: ApplicationStatus;
  salaryRange?: string; // used for budget in freelance
  dateApplied?: string;
  source: 'linkedin' | 'upwork' | 'direct' | 'referral' | 'other';
  jobDescriptionRaw?: string;
  analysis?: JDAnalysis;
  companyResearch?: CompanyResearch;
  notes: string;
  createdAt: string;
  updatedAt: string;
  // Freelance specific
  platform?: 'upwork' | 'direct' | 'other';
  proposalSent?: string;
}

// Mock Interview Types
export interface InterviewConfig {
  type: 'behavioral' | 'technical' | 'system-design' | 'mixed';
  difficulty: 'easy' | 'medium' | 'hard';
  duration: number; // minutes
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

export const DEFAULT_PROFILE: UserProfile = {
  name: "Senior Engineer",
  email: "",
  phone: "",
  headline: "Senior Software Engineer",
  yearsExperience: 5,
  technicalSkills: [],
  softSkills: [],
  industries: [],
  keyAchievements: [],
  recentRoles: [],
  currentSituation: "Looking for new opportunities",
  goals: [],
  constraints: [],
  activeProjects: [],
  preferences: {
    targetRoles: ["Software Engineer"],
    workStyle: "remote",
    salaryRange: { min: 100000, max: 200000 },
    dealBreakers: [],
    priorityFactors: []
  },
  freelanceProfile: {
    hourlyRate: { min: 50, max: 100 },
    availableHours: "20 hrs/week",
    preferredProjectTypes: [],
    uniqueSellingPoints: []
  }
};
