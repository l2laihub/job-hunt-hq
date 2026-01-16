/**
 * Feature Capabilities Map
 *
 * Defines all application features the AI Assistant should know about.
 * Used for feature awareness and capability discovery.
 */

import type { AssistantContextType } from '@/src/types/assistant';

// ============================================
// FEATURE DEFINITIONS
// ============================================

export interface FeatureCapability {
  name: string;
  description: string;
  route: string;
  contextType: AssistantContextType;
  capabilities: string[];
  examples: string[];
}

/**
 * All application features the AI Assistant can help with
 */
export const FEATURE_CAPABILITIES: Record<string, FeatureCapability> = {
  jobAnalysis: {
    name: 'Job Analysis',
    description: 'Analyze job descriptions to understand fit and prepare applications',
    route: '/analyzer',
    contextType: 'application',
    capabilities: [
      'Analyze job descriptions for fit scoring',
      'Calculate compatibility with your profile',
      'Identify matched and missing skills',
      'Generate personalized talking points',
      'Create cover letters in multiple styles',
      'Prepare phone screen questions and answers',
      'Build technical interview prep materials',
      'Create application strategy plans',
      'Generate skills roadmaps for aspirational roles',
      'Answer application screening questions',
    ],
    examples: [
      'Analyze this job description for me',
      'How well do I fit this role?',
      'What skills am I missing for this job?',
      'Generate a cover letter for this position',
      'Help me prepare for the phone screen',
    ],
  },

  interviewPrep: {
    name: 'Interview Preparation',
    description: 'Comprehensive interview preparation with predicted questions and practice',
    route: '/interview-prep',
    contextType: 'interview-prep',
    capabilities: [
      'Predict likely interview questions',
      'Match your STAR stories to questions',
      'Create preparation checklists',
      'Track interview readiness score',
      'Generate quick reference materials',
      'Practice answering questions',
      'Provide feedback on your answers',
      'Suggest relevant stories for questions',
    ],
    examples: [
      'What questions should I expect?',
      'Help me prepare for my interview tomorrow',
      'Which of my stories should I use for behavioral questions?',
      'Practice interview questions with me',
      "What's my readiness score?",
    ],
  },

  companyResearch: {
    name: 'Company Research',
    description: 'Research companies before applying or interviewing',
    route: '/research',
    contextType: 'company-research',
    capabilities: [
      'Research company overview and culture',
      'Find recent news and sentiment',
      'Identify red flags and green flags',
      'Discover interview difficulty and process',
      'Find key people to connect with',
      'Analyze engineering culture and tech stack',
      'Assess salary ranges and compensation',
    ],
    examples: [
      'Research [Company Name] for me',
      'What are the red flags about this company?',
      'What is the interview process like at this company?',
      'What tech stack does this company use?',
    ],
  },

  stories: {
    name: 'Experience Bank (STAR Stories)',
    description: 'Manage and improve your STAR-formatted interview stories',
    route: '/stories',
    contextType: 'story',
    capabilities: [
      'Format experiences into STAR structure',
      'Improve story clarity and impact',
      'Add metrics and quantifiable results',
      'Create variations (leadership, technical, challenge)',
      'Generate follow-up questions',
      'Tag stories for easy retrieval',
      'Match stories to interview questions',
    ],
    examples: [
      'Help me improve this story',
      'What metrics should I add to this story?',
      'Create a leadership variation of this story',
      'What follow-up questions might I get?',
    ],
  },

  technicalAnswers: {
    name: 'Technical Answers Bank',
    description: 'Prepare and practice answers to technical interview questions',
    route: '/answers',
    contextType: 'general',
    capabilities: [
      'Generate answers to technical questions',
      'Create structured answer formats',
      'Prepare for system design questions',
      'Practice conceptual explanations',
      'Build follow-up Q&A pairs',
      'Track practice progress',
    ],
    examples: [
      'How should I answer "Explain microservices"?',
      'Help me prepare for system design questions',
      'Generate an answer for this technical question',
    ],
  },

  resumeEnhancement: {
    name: 'Resume Enhancement',
    description: 'Optimize your resume for specific roles and ATS systems',
    route: '/enhance',
    contextType: 'enhancement',
    capabilities: [
      'Analyze resume for improvement areas',
      'Optimize for ATS compatibility',
      'Tailor resume for specific jobs',
      'Suggest keyword additions',
      'Improve achievement descriptions',
      'Reorder experiences for relevance',
    ],
    examples: [
      'How can I improve my resume?',
      'Optimize my resume for this job',
      'What keywords am I missing?',
      'Make my achievements more impactful',
    ],
  },

  profile: {
    name: 'Profile Builder',
    description: 'Build and maintain your professional profile',
    route: '/profile',
    contextType: 'profile',
    capabilities: [
      'Improve your headline',
      'Organize and categorize skills',
      'Enhance achievement descriptions',
      'Update work history',
      'Set career goals and preferences',
      'Manage multiple profiles',
    ],
    examples: [
      'Help me improve my headline',
      'What skills should I highlight?',
      'Review my profile completeness',
    ],
  },

  copilot: {
    name: 'Interview Copilot',
    description: 'Real-time AI assistance during mock interviews',
    route: '/copilot',
    contextType: 'general',
    capabilities: [
      'Detect questions in real-time',
      'Suggest relevant STAR stories',
      'Provide talking points',
      'Anticipate follow-up questions',
      'Track interview session history',
    ],
    examples: [
      'Start a mock interview session',
      'Review my last interview session',
    ],
  },

  dashboard: {
    name: 'Application Dashboard',
    description: 'Track and manage your job applications',
    route: '/',
    contextType: 'general',
    capabilities: [
      'Track application status',
      'View application statistics',
      'Manage application pipeline',
      'Filter and search applications',
    ],
    examples: [
      'Show my application statistics',
      'What applications am I working on?',
      'How many interviews do I have scheduled?',
    ],
  },
};

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get all features as an array
 */
export function getAllFeatures(): FeatureCapability[] {
  return Object.values(FEATURE_CAPABILITIES);
}

/**
 * Get feature by route
 */
export function getFeatureByRoute(route: string): FeatureCapability | undefined {
  return Object.values(FEATURE_CAPABILITIES).find((f) => f.route === route);
}

/**
 * Get feature by context type
 */
export function getFeatureByContextType(
  contextType: AssistantContextType
): FeatureCapability | undefined {
  return Object.values(FEATURE_CAPABILITIES).find((f) => f.contextType === contextType);
}

/**
 * Build a prompt summarizing all feature capabilities
 * (Used when user asks "What can you do?")
 */
export function buildFeatureCapabilitiesPrompt(): string {
  const features = getAllFeatures();

  const featureList = features
    .map((f) => {
      const capabilities = f.capabilities.slice(0, 4).join(', ');
      return `**${f.name}** (${f.route})\n${f.description}\nCapabilities: ${capabilities}`;
    })
    .join('\n\n');

  return `## What I Can Help You With

I'm your AI career coach and I can assist you with many aspects of your job search:

${featureList}

Just ask me about any of these features or tell me what you need help with!`;
}

/**
 * Get example prompts for all features
 */
export function getAllExamplePrompts(): string[] {
  return Object.values(FEATURE_CAPABILITIES).flatMap((f) => f.examples);
}

/**
 * Check if a message is asking about capabilities
 */
export function isAskingAboutCapabilities(message: string): boolean {
  const lower = message.toLowerCase();
  const patterns = [
    /what\s+can\s+you\s+(do|help)/,
    /what\s+are\s+you(r)?\s+(features|capabilities)/,
    /what\s+features/,
    /how\s+can\s+you\s+help/,
    /what\s+do\s+you\s+do/,
    /tell\s+me\s+about\s+yourself/,
    /what\s+can\s+i\s+(use\s+you|ask\s+you)\s+for/,
  ];

  return patterns.some((p) => p.test(lower));
}
