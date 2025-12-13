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
  notes: string;
  createdAt: string;
  updatedAt: string;
  // Freelance specific
  platform?: 'upwork' | 'direct' | 'other';
  proposalSent?: string;
}

export const DEFAULT_PROFILE: UserProfile = {
  name: "Senior Engineer",
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