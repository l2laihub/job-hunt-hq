/**
 * AI Assistant Service: Context-Aware Career Coach Chat
 *
 * This service provides conversational AI assistance for job search,
 * interview preparation, and career guidance. It automatically
 * incorporates relevant context from the user's profile, applications,
 * and interview prep data.
 */

import { geminiClient, requireGemini, DEFAULT_MODEL, DEFAULT_THINKING_BUDGET } from './client';
import type {
  UserProfile,
  UserProfileWithMeta,
  JobApplication,
  AnalyzedJob,
  CompanyResearch,
  Experience,
  JDAnalysis,
  FTEAnalysis,
} from '@/src/types';
import type { InterviewPrepSession } from '@/src/types/interview-prep';
import type {
  AssistantContext,
  AssistantMessage,
  createAssistantMessage,
  ASSISTANT_NAME,
} from '@/src/types/assistant';

// Re-export for convenience
export { ASSISTANT_NAME } from '@/src/types/assistant';

// ============================================
// TYPES
// ============================================

export interface GenerateAssistantResponseParams {
  message: string;
  context: AssistantContext | null;
  conversationHistory: AssistantMessage[];
  profile: UserProfileWithMeta | UserProfile | null;
}

export interface AssistantResponseMetadata {
  generationTimeMs: number;
  contextUsed: {
    profileSummary?: boolean;
    applicationData?: boolean;
    companyResearch?: boolean;
    storyIds?: string[];
    prepSession?: boolean;
  };
}

// ============================================
// CONTEXT BUILDERS
// ============================================

/**
 * Build profile summary for system prompt
 */
function buildProfileSummary(profile: UserProfileWithMeta | UserProfile | null): string {
  if (!profile) {
    return 'No profile information available. The user should set up their profile for personalized advice.';
  }

  // Check if profile has actual data beyond defaults
  const hasSkills = profile.technicalSkills?.length > 0;
  const hasRoles = profile.recentRoles?.length > 0;
  const hasAchievements = profile.keyAchievements?.length > 0;
  const hasGoals = profile.goals?.length > 0;
  const hasProfileData = hasSkills || hasRoles || hasAchievements;

  // Get profile name - prefer metadata name if available (UserProfileWithMeta)
  const profileMetadata = 'metadata' in profile ? (profile as UserProfileWithMeta).metadata : null;
  const profileName = profileMetadata?.name || profile.name;
  const userName = profile.name !== 'Senior Engineer' ? profile.name : ''; // Exclude default placeholder

  const roles = profile.recentRoles
    .slice(0, 3)
    .map((r) => `- ${r.title} at ${r.company} (${r.duration})`)
    .join('\n');

  const achievements = profile.keyAchievements
    .slice(0, 3)
    .map((a) => `- ${a.description}${a.metrics ? ` [${a.metrics}]` : ''}`)
    .join('\n');

  // Build profile summary with data completeness note
  let summary = `
## User Profile
**Profile:** ${profileName}${userName ? ` (${userName})` : ''}
**Headline:** ${profile.headline || 'Not set'}
**Experience:** ${profile.yearsExperience} years
`;

  if (!hasProfileData) {
    summary += `
**⚠️ Profile Data:** Limited - The user's profile has minimal information filled in. You should:
1. Acknowledge this and provide general advice
2. Encourage them to fill in their profile for more personalized guidance
3. Ask clarifying questions about their background when needed
`;
  }

  summary += `
**Technical Skills:** ${profile.technicalSkills.slice(0, 12).join(', ') || 'None listed'}
**Industries:** ${profile.industries.join(', ') || 'Not specified'}

**Recent Roles:**
${roles || 'No roles listed - encourage user to add their work history'}

**Key Achievements:**
${achievements || 'No achievements listed'}

**Current Situation:** ${profile.currentSituation || 'Looking for opportunities'}
**Goals:** ${profile.goals.slice(0, 3).join(', ') || 'Not specified'}
**Target Roles:** ${profile.preferences?.targetRoles?.slice(0, 3).join(', ') || 'Not specified'}
**Deal Breakers:** ${profile.preferences?.dealBreakers?.slice(0, 3).join(', ') || 'None specified'}
`;

  return summary.trim();
}

/**
 * Helper to check if analysis is FTE type
 */
function isFTEAnalysis(analysis: JDAnalysis): analysis is FTEAnalysis {
  return analysis.analysisType === 'fulltime';
}

/**
 * Build application context for system prompt
 */
function buildApplicationContext(
  application?: JobApplication,
  analyzedJob?: AnalyzedJob,
  companyResearch?: CompanyResearch
): string {
  if (!application && !analyzedJob) {
    return '';
  }

  let context = '\n## Current Job Being Viewed\n';

  // Get job info from either source
  const company = application?.company || analyzedJob?.company || 'Not specified';
  const role = application?.role || analyzedJob?.role || 'Not specified';
  const jobType = application?.type || analyzedJob?.type || 'fulltime';
  const analysis = application?.analysis || analyzedJob?.analysis;

  context += `**Company:** ${company}\n`;
  context += `**Role:** ${role}\n`;
  context += `**Job Type:** ${jobType}\n`;

  if (application?.status) {
    context += `**Application Status:** ${application.status}\n`;
  }

  if (analysis) {
    context += `\n### Analysis Summary\n`;
    context += `**Fit Score:** ${analysis.fitScore}/10\n`;
    context += `**Recommendation:** ${analysis.recommendation?.verdict || 'N/A'}\n`;

    // Include key reasons for the fit score
    if (isFTEAnalysis(analysis)) {
      if (analysis.keyReasons?.length) {
        context += `**Why This Score:**\n`;
        analysis.keyReasons.slice(0, 3).forEach((reason) => {
          context += `- ${reason}\n`;
        });
      }
      if (analysis.talkingPoints?.length) {
        context += `**Talking Points for Interview:**\n`;
        analysis.talkingPoints.slice(0, 4).forEach((point) => {
          context += `- ${point}\n`;
        });
      }
    }

    if (analysis.matchedSkills?.length) {
      context += `**Matched Skills:** ${analysis.matchedSkills.slice(0, 10).join(', ')}\n`;
    }
    if (analysis.missingSkills?.length) {
      context += `**Skills to Develop:** ${analysis.missingSkills.slice(0, 5).join(', ')}\n`;
    }

    // Include requirements breakdown
    if (analysis.requirements) {
      context += `\n### Job Requirements Analysis\n`;
      if (analysis.requirements.mustHave?.length) {
        context += `**Must-Have Skills:**\n`;
        analysis.requirements.mustHave.slice(0, 5).forEach((skill) => {
          context += `- ${skill}\n`;
        });
      }
      if (analysis.requirements.niceToHave?.length) {
        context += `**Nice-to-Have:**\n`;
        analysis.requirements.niceToHave.slice(0, 5).forEach((skill) => {
          context += `- ${skill}\n`;
        });
      }
    }
  }

  // Include job description excerpt for context (truncate for token efficiency)
  if (analyzedJob?.jobDescription) {
    const jdExcerpt = analyzedJob.jobDescription.length > 2000
      ? analyzedJob.jobDescription.substring(0, 2000) + '...'
      : analyzedJob.jobDescription;
    context += `\n### Job Description\n\`\`\`\n${jdExcerpt}\n\`\`\`\n`;
  }

  // Add prep materials status
  if (analyzedJob) {
    const prepItems: string[] = [];
    if (analyzedJob.phoneScreenPrep) prepItems.push('phone screen prep');
    if (analyzedJob.technicalInterviewPrep) prepItems.push('technical interview prep');
    if (analyzedJob.coverLetters?.length) prepItems.push(`${analyzedJob.coverLetters.length} cover letter(s)`);
    if (analyzedJob.applicationStrategy) prepItems.push('application strategy');
    if (analyzedJob.skillsRoadmap) prepItems.push('skills roadmap');

    if (prepItems.length) {
      context += `\n**Available Prep Materials:** ${prepItems.join(', ')}\n`;
    }

    // Include technical prep focus areas if available
    if (analyzedJob.technicalInterviewPrep?.focusAreas?.length) {
      context += `**Technical Focus Areas:** ${analyzedJob.technicalInterviewPrep.focusAreas.slice(0, 5).join(', ')}\n`;
    }
  }

  if (companyResearch) {
    context += `\n### Company Research\n`;
    context += `- Industry: ${companyResearch.overview?.industry || 'N/A'}\n`;
    context += `- Size: ${companyResearch.overview?.size || 'N/A'}\n`;
    context += `- Culture: ${companyResearch.engineeringCulture?.remotePolicy || 'N/A'} work policy\n`;
    context += `- Interview Difficulty: ${companyResearch.interviewIntel?.interviewDifficulty || 'N/A'}\n`;

    if (companyResearch.redFlags?.length) {
      context += `- Red Flags: ${companyResearch.redFlags.slice(0, 2).map((f) => f.flag).join(', ')}\n`;
    }
    if (companyResearch.greenFlags?.length) {
      context += `- Green Flags: ${companyResearch.greenFlags.slice(0, 2).map((f) => f.flag).join(', ')}\n`;
    }
    context += `- Verdict: ${companyResearch.verdict?.overall || 'N/A'} - ${companyResearch.verdict?.summary || ''}\n`;
  }

  return context;
}

/**
 * Build interview prep context
 */
function buildInterviewPrepContext(prepSession?: InterviewPrepSession): string {
  if (!prepSession) return '';

  let context = '\n## Interview Preparation Status\n';
  context += `**Interview Type:** ${prepSession.interviewType}\n`;
  context += `**Readiness Score:** ${prepSession.readinessScore}%\n`;

  if (prepSession.interviewDate) {
    context += `**Interview Date:** ${prepSession.interviewDate}\n`;
  }

  // Checklist progress
  const completedItems = prepSession.checklist.filter((i) => i.status === 'completed').length;
  const totalItems = prepSession.checklist.length;
  context += `**Checklist Progress:** ${completedItems}/${totalItems} items completed\n`;

  // Predicted questions progress
  const preparedQuestions = prepSession.predictedQuestions.filter((q) => q.isPrepared).length;
  const totalQuestions = prepSession.predictedQuestions.length;
  context += `**Questions Prepared:** ${preparedQuestions}/${totalQuestions}\n`;

  // High priority unprepared questions
  const unpreparedHighPriority = prepSession.predictedQuestions
    .filter((q) => !q.isPrepared && q.likelihood === 'high')
    .slice(0, 3)
    .map((q) => q.question);

  if (unpreparedHighPriority.length) {
    context += `\n**High-Priority Questions to Prepare:**\n`;
    context += unpreparedHighPriority.map((q) => `- ${q}`).join('\n');
  }

  return context;
}

/**
 * Build stories context
 */
function buildStoriesContext(stories?: Experience[]): string {
  if (!stories?.length) return '';

  const storySummaries = stories
    .slice(0, 6)
    .map((s) => `- "${s.title}" [${s.tags.slice(0, 3).join(', ')}]`)
    .join('\n');

  return `
## Available STAR Stories
${storySummaries}

(${stories.length} total stories available in Experience Bank)
`;
}

/**
 * Build conversation history for context
 */
function buildConversationContext(history: AssistantMessage[]): string {
  if (history.length === 0) return '';

  // Include last 10 messages for context
  const recentHistory = history.slice(-10);

  const formattedHistory = recentHistory
    .map((msg) => {
      const role = msg.role === 'user' ? 'User' : 'Prep';
      // Truncate long messages
      const content = msg.content.length > 500 ? msg.content.slice(0, 500) + '...' : msg.content;
      return `**${role}:** ${content}`;
    })
    .join('\n\n');

  return `
## Conversation History
${formattedHistory}
`;
}

// ============================================
// SYSTEM PROMPT
// ============================================

function buildSystemPrompt(
  context: AssistantContext | null,
  profile: UserProfileWithMeta | UserProfile | null,
  conversationHistory: AssistantMessage[]
): string {
  const profileSummary = buildProfileSummary(profile);
  const applicationContext = buildApplicationContext(
    context?.application,
    context?.analyzedJob,
    context?.companyResearch
  );
  const prepContext = buildInterviewPrepContext(context?.prepSession);
  const storiesContext = buildStoriesContext(context?.stories);
  const conversationContext = buildConversationContext(conversationHistory);

  return `You are Prep, an AI career coach assistant for Prepprly - a job search and interview preparation app.

## Your Role
You help job seekers with:
- Job search strategy and application optimization
- Interview preparation tailored to specific roles and companies
- Career guidance and goal-setting
- Resume and profile improvement advice
- Mock interview practice and feedback
- Answering questions about job applications, companies, and interview prep

## Personality
- Supportive but direct - give actionable advice
- Professional yet conversational
- Reference the user's actual experience and data when available
- Be concise - aim for 2-4 paragraph responses unless more detail is needed
- Use markdown formatting for readability (bold, bullets, headers)

${profileSummary}

${applicationContext}

${prepContext}

${storiesContext}

${conversationContext}

## Current Context
**Type:** ${context?.type || 'general'}
**Summary:** ${context?.summary || 'No specific context loaded.'}

## Guidelines
1. **USE THE CONTEXT ABOVE:** You have access to the user's profile, the current job they're viewing, and analysis data. ALWAYS reference this specific information in your responses.
2. **Be Specific:** When discussing fit, skills, or preparation - reference the ACTUAL job requirements and user skills shown above.
3. **Be Actionable:** End responses with clear next steps when appropriate.
4. **Be Personalized:** Reference the user's actual skills, experience, and goals from their profile.
5. **Be Encouraging:** Support the user while being honest about areas to improve.
6. **Be Concise:** Keep responses focused and scannable (2-4 paragraphs).

IMPORTANT: If the user asks about their fit for a role and you have job context above, you MUST use that information to give a specific, personalized answer. Do NOT say you don't know about them or the role if the context is provided above.
`.trim();
}

// ============================================
// MAIN GENERATION FUNCTION
// ============================================

/**
 * Generate an assistant response to a user message
 */
export async function generateAssistantResponse(
  params: GenerateAssistantResponseParams
): Promise<{ content: string; metadata: AssistantResponseMetadata }> {
  requireGemini();

  const { message, context, conversationHistory, profile: passedProfile } = params;
  const startTime = Date.now();

  // Use passed profile, but fall back to context profile if passed profile is null
  // This handles race conditions where context.profile might be populated but direct profile isn't
  const profile = passedProfile || context?.profile || null;

  // Build the system prompt with all context
  const systemPrompt = buildSystemPrompt(context, profile, conversationHistory);

  // Build the contents with system context prepended as a "model" message for reliability
  // This ensures the model sees the context even if systemInstruction isn't working properly
  const contents = [
    { role: 'user' as const, parts: [{ text: `[SYSTEM CONTEXT - Use this information to personalize your response]\n\n${systemPrompt}\n\n---\n\nNow respond to the following user message:` }] },
    { role: 'model' as const, parts: [{ text: 'I understand. I have access to the user profile, job context, and all the information provided above. I will use this to give personalized, specific responses. What would you like to know?' }] },
    { role: 'user' as const, parts: [{ text: message }] },
  ];

  // Make the API call
  // Using contents array with context prepended for more reliable context injection
  const result = await geminiClient!.models.generateContent({
    model: DEFAULT_MODEL,
    contents,
    config: {
      thinkingConfig: { thinkingBudget: DEFAULT_THINKING_BUDGET },
      temperature: 0.8, // Slightly higher for more natural conversation
    },
  });

  const responseContent = result.text || 'I apologize, but I was unable to generate a response. Please try again.';
  const generationTimeMs = Date.now() - startTime;

  // Build metadata about what context was used
  const metadata: AssistantResponseMetadata = {
    generationTimeMs,
    contextUsed: {
      profileSummary: !!profile,
      applicationData: !!(context?.application || context?.analyzedJob), // Track either application or analyzed job
      companyResearch: !!context?.companyResearch,
      storyIds: context?.stories?.map((s) => s.id),
      prepSession: !!context?.prepSession,
    },
  };

  return {
    content: responseContent,
    metadata,
  };
}

// ============================================
// STREAMING SUPPORT (for future use)
// ============================================

/**
 * Generate assistant response with streaming
 * Returns an async generator that yields content chunks
 */
export async function* generateAssistantResponseStream(
  params: GenerateAssistantResponseParams
): AsyncGenerator<string, void, unknown> {
  requireGemini();

  const { message, context, conversationHistory, profile } = params;

  // Build the system prompt with all context
  const systemPrompt = buildSystemPrompt(context, profile, conversationHistory);

  // Build the contents with system context prepended for reliable context injection
  const contents = [
    { role: 'user' as const, parts: [{ text: `[SYSTEM CONTEXT - Use this information to personalize your response]\n\n${systemPrompt}\n\n---\n\nNow respond to the following user message:` }] },
    { role: 'model' as const, parts: [{ text: 'I understand. I have access to the user profile, job context, and all the information provided above. I will use this to give personalized, specific responses. What would you like to know?' }] },
    { role: 'user' as const, parts: [{ text: message }] },
  ];

  // Make the streaming API call
  // Using contents array with context prepended for more reliable context injection
  const stream = await geminiClient!.models.generateContentStream({
    model: DEFAULT_MODEL,
    contents,
    config: {
      thinkingConfig: { thinkingBudget: DEFAULT_THINKING_BUDGET },
      temperature: 0.8,
    },
  });

  // Yield chunks as they arrive
  for await (const chunk of stream) {
    if (chunk.text) {
      yield chunk.text;
    }
  }
}

// ============================================
// RESEARCH-ENHANCED RESPONSE
// ============================================

/**
 * Build research context for system prompt
 */
function buildResearchContext(research: { type: string; data: unknown; sources?: Array<{ url: string; title?: string }> }): string {
  if (!research) return '';

  const { type, data, sources } = research;
  let researchSummary = `\n## Research Results (${type})\n`;

  // Add type-specific summary
  switch (type) {
    case 'salary': {
      const salaryData = data as {
        role: string;
        rangeEstimate: { low: number; median: number; high: number; currency: string };
        marketTrend: string;
        factors?: string[];
        summary: string;
      };
      researchSummary += `**Role:** ${salaryData.role}
**Salary Range:** ${salaryData.rangeEstimate.currency}${salaryData.rangeEstimate.low.toLocaleString()} - ${salaryData.rangeEstimate.currency}${salaryData.rangeEstimate.high.toLocaleString()}
**Median:** ${salaryData.rangeEstimate.currency}${salaryData.rangeEstimate.median.toLocaleString()}
**Market Trend:** ${salaryData.marketTrend}
**Key Factors:** ${salaryData.factors?.slice(0, 4).join(', ') || 'Various factors'}
**Summary:** ${salaryData.summary}
`;
      break;
    }
    case 'industry': {
      const industryData = data as {
        industry: string;
        currentTrends: Array<{ trend: string; impact: string }>;
        marketOutlook: string;
        skillsInDemand: string[];
        summary: string;
      };
      researchSummary += `**Industry:** ${industryData.industry}
**Market Outlook:** ${industryData.marketOutlook}
**Key Trends:** ${industryData.currentTrends?.slice(0, 3).map((t) => t.trend).join(', ') || 'Multiple trends identified'}
**In-Demand Skills:** ${industryData.skillsInDemand?.slice(0, 5).join(', ') || 'Various skills'}
**Summary:** ${industryData.summary}
`;
      break;
    }
    case 'technical': {
      const techData = data as {
        topic: string;
        category: string;
        overview: string;
        keyFeatures: string[];
        marketAdoption: string;
        summary: string;
      };
      researchSummary += `**Topic:** ${techData.topic}
**Category:** ${techData.category}
**Market Adoption:** ${techData.marketAdoption}
**Key Features:** ${techData.keyFeatures?.slice(0, 4).join(', ') || 'Multiple features'}
**Overview:** ${techData.overview?.slice(0, 300)}${techData.overview?.length > 300 ? '...' : ''}
`;
      break;
    }
    case 'interview': {
      const interviewData = data as {
        company?: string;
        role?: string;
        interviewProcess: { stages: string[] };
        difficulty: string;
        tips: string[];
        summary: string;
      };
      researchSummary += `**Company:** ${interviewData.company || 'General'}
**Role:** ${interviewData.role || 'Various'}
**Process:** ${interviewData.interviewProcess?.stages?.join(' → ') || 'Multiple stages'}
**Difficulty:** ${interviewData.difficulty}
**Key Tips:** ${interviewData.tips?.slice(0, 3).join('; ') || 'Various tips'}
**Summary:** ${interviewData.summary}
`;
      break;
    }
  }

  // Add sources if available
  if (sources && sources.length > 0) {
    researchSummary += `\n**Sources:** ${sources.slice(0, 3).map((s) => s.title || s.url).join(', ')}`;
  }

  return researchSummary;
}

/**
 * Generate assistant response with research context
 */
export async function generateAssistantResponseWithResearch(
  params: GenerateAssistantResponseParams & {
    research: { type: string; data: unknown; sources?: Array<{ url: string; title?: string }> };
  }
): Promise<{ content: string; metadata: AssistantResponseMetadata }> {
  requireGemini();

  const { message, context, conversationHistory, profile: passedProfile, research } = params;
  const startTime = Date.now();

  const profile = passedProfile || context?.profile || null;

  // Build the system prompt with research context included
  const baseSystemPrompt = buildSystemPrompt(context, profile, conversationHistory);
  const researchContext = buildResearchContext(research);

  const systemPrompt = `${baseSystemPrompt}

${researchContext}

## IMPORTANT: Research Results Available
I have just performed a web search and found the research results above. You MUST use this research data to provide a comprehensive, fact-based response. Reference specific numbers, trends, and insights from the research in your answer.`;

  const contents = [
    { role: 'user' as const, parts: [{ text: `[SYSTEM CONTEXT - Use this information to personalize your response]\n\n${systemPrompt}\n\n---\n\nNow respond to the following user message using the research results provided:` }] },
    { role: 'model' as const, parts: [{ text: 'I understand. I have access to the user profile, job context, and the research results from web search. I will use this to give a comprehensive, data-backed response. What would you like to know?' }] },
    { role: 'user' as const, parts: [{ text: message }] },
  ];

  const result = await geminiClient!.models.generateContent({
    model: DEFAULT_MODEL,
    contents,
    config: {
      thinkingConfig: { thinkingBudget: DEFAULT_THINKING_BUDGET },
      temperature: 0.7, // Slightly lower for more factual responses with research
    },
  });

  const responseContent = result.text || 'I apologize, but I was unable to generate a response. Please try again.';
  const generationTimeMs = Date.now() - startTime;

  const metadata: AssistantResponseMetadata = {
    generationTimeMs,
    contextUsed: {
      profileSummary: !!profile,
      applicationData: !!(context?.application || context?.analyzedJob),
      companyResearch: !!context?.companyResearch,
      storyIds: context?.stories?.map((s) => s.id),
      prepSession: !!context?.prepSession,
    },
  };

  return {
    content: responseContent,
    metadata,
  };
}

// ============================================
// QUICK RESPONSE HELPERS
// ============================================

/**
 * Generate quick suggestions based on current context
 */
export async function generateContextSuggestions(
  context: AssistantContext | null,
  profile: UserProfileWithMeta | UserProfile | null
): Promise<string[]> {
  // Return static suggestions based on context type
  // This avoids an API call for simple suggestions

  if (!context) {
    return [
      'Help me improve my resume',
      'What should I focus on in my job search?',
      'How can I prepare for interviews?',
    ];
  }

  switch (context.type) {
    case 'application':
      return [
        `How well do I fit the ${context.application?.role || 'role'}?`,
        'What should I highlight in my application?',
        'Help me prepare for the interview',
        'What questions should I ask them?',
      ];

    case 'interview-prep':
      return [
        'What are the most likely questions?',
        'Help me practice answering questions',
        'Review my readiness for this interview',
        'What should I research about the company?',
      ];

    case 'company-research':
      return [
        'What are the red flags I should watch for?',
        'How does this company compare to others?',
        'What questions should I ask about culture?',
      ];

    case 'story':
      return [
        'How can I improve this story?',
        'What metrics should I include?',
        'Help me practice telling this story',
      ];

    case 'profile':
      return [
        'How can I improve my headline?',
        'What skills should I highlight?',
        'Review my profile completeness',
      ];

    default:
      return [
        'Help me with my job search strategy',
        'What are my strongest selling points?',
        'How can I stand out in applications?',
      ];
  }
}
