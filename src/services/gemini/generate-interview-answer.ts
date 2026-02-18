/**
 * AI Service: Generate Interview Answer with Intelligent Format Selection
 *
 * This service intelligently detects question types and generates answers
 * using the most appropriate format:
 * - Behavioral/Experience → STAR format
 * - System Design → Requirements-Design-Tradeoffs format
 * - Conceptual → Explain-Example-Tradeoffs format
 * - Problem-Solving → Approach-Implementation-Complexity format
 *
 * Experience is woven in as supporting evidence for non-behavioral questions,
 * rather than being the primary structure.
 */

import { geminiClient, requireGemini, DEFAULT_MODEL, DEFAULT_THINKING_BUDGET } from './client';
import { parseGeminiJson } from './parse-json';
import { Type, Schema } from '@google/genai';
import type {
  UserProfile,
  Experience,
  JDAnalysis,
  CompanyResearch,
  TechnicalQuestionType,
  AnswerFormatType,
  AnswerSection,
  FollowUpQA,
  FTEAnalysis,
} from '@/src/types';
import type { PredictedQuestion } from '@/src/types/interview-prep';

// ============================================
// TYPES
// ============================================

export interface GenerateInterviewAnswerParams {
  question: PredictedQuestion;
  profile: UserProfile;
  stories: Experience[];
  analysis?: JDAnalysis;
  research?: CompanyResearch;
  company: string;
  role: string;
}

export interface GeneratedInterviewAnswer {
  // Question classification
  detectedQuestionType: TechnicalQuestionType;
  answerFormat: AnswerFormatType;

  // Core answer content
  title: string;
  sections: AnswerSection[];
  narrative: string;
  bulletPoints: string[];

  // For STAR-format answers (behavioral/experience)
  star?: {
    situation: string;
    task: string;
    action: string;
    result: string;
  };

  // Metrics and evidence
  metrics: {
    primary?: string;
    secondary: string[];
  };

  // Sources and tags
  sources: {
    storyIds: string[];
    profileSections: string[];
    synthesized: boolean;
  };
  tags: string[];

  // Coaching and practice support
  keyTalkingPoints: string[];
  deliveryTips: string[];
  followUpQuestions: FollowUpQA[];
  coachingNotes: string;

  // Variations for different angles
  variations?: {
    leadership?: string;
    technical?: string;
    challenge?: string;
  };
}

export interface RefineInterviewAnswerParams {
  currentAnswer: GeneratedInterviewAnswer;
  refinementFeedback: string;
  question: string;
  company: string;
  role: string;
}

// ============================================
// SCHEMAS
// ============================================

const interviewAnswerSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    detectedQuestionType: {
      type: Type.STRING,
      enum: ['behavioral-technical', 'conceptual', 'system-design', 'problem-solving', 'experience'],
      description: 'The detected type of interview question',
    },
    answerFormat: {
      type: Type.STRING,
      enum: ['STAR', 'Explain-Example-Tradeoffs', 'Requirements-Design-Tradeoffs', 'Approach-Implementation-Complexity'],
      description: 'The format used for the answer',
    },
    title: {
      type: Type.STRING,
      description: 'A concise, memorable title for this answer',
    },
    sections: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          label: { type: Type.STRING, description: 'Section label (e.g., "Requirements", "Situation", "Explanation")' },
          content: { type: Type.STRING, description: 'Section content with rich detail' },
        },
        required: ['label', 'content'],
      },
      description: 'Structured sections based on the answer format',
    },
    narrative: {
      type: Type.STRING,
      description: 'Full conversational answer (2-3 minutes) with markdown formatting for emphasis',
    },
    bulletPoints: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: 'Key points to remember when delivering this answer',
    },
    star: {
      type: Type.OBJECT,
      description: 'STAR breakdown (only populated for behavioral/experience questions)',
      properties: {
        situation: { type: Type.STRING },
        task: { type: Type.STRING },
        action: { type: Type.STRING },
        result: { type: Type.STRING },
      },
    },
    metrics: {
      type: Type.OBJECT,
      properties: {
        primary: { type: Type.STRING, description: 'Most impressive quantified result' },
        secondary: { type: Type.ARRAY, items: { type: Type.STRING }, description: 'Additional metrics' },
      },
      required: ['secondary'],
    },
    sources: {
      type: Type.OBJECT,
      properties: {
        matchedStoryIndices: {
          type: Type.ARRAY,
          items: { type: Type.INTEGER },
          description: 'Indices of stories referenced from the provided list',
        },
        profileSectionsUsed: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: 'Profile sections used (e.g., "technicalSkills", "recentRoles")',
        },
        synthesized: {
          type: Type.BOOLEAN,
          description: 'True if AI synthesized content beyond direct sources',
        },
      },
    },
    tags: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: 'Skills and themes demonstrated',
    },
    keyTalkingPoints: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: 'Critical points to hit during delivery',
    },
    deliveryTips: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: 'Tips for tone, pacing, and presentation',
    },
    followUpQuestions: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          question: { type: Type.STRING },
          likelihood: { type: Type.STRING, enum: ['high', 'medium', 'low'] },
          suggestedAnswer: { type: Type.STRING },
          keyPoints: { type: Type.ARRAY, items: { type: Type.STRING } },
        },
        required: ['question', 'likelihood', 'suggestedAnswer', 'keyPoints'],
      },
      description: 'Likely follow-up questions with suggested responses',
    },
    coachingNotes: {
      type: Type.STRING,
      description: 'Expert coaching advice for this specific answer',
    },
    variations: {
      type: Type.OBJECT,
      properties: {
        leadership: { type: Type.STRING, description: 'How to emphasize leadership aspects' },
        technical: { type: Type.STRING, description: 'How to emphasize technical depth' },
        challenge: { type: Type.STRING, description: 'How to emphasize problem-solving/challenges' },
      },
    },
  },
  required: [
    'detectedQuestionType',
    'answerFormat',
    'title',
    'sections',
    'narrative',
    'bulletPoints',
    'metrics',
    'tags',
    'keyTalkingPoints',
    'deliveryTips',
    'followUpQuestions',
    'coachingNotes',
  ],
};

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Pre-classify question type based on keywords and category
 * This provides hints to the AI but it can override based on deeper analysis
 */
function getQuestionTypeHint(question: PredictedQuestion): {
  likelyType: TechnicalQuestionType;
  confidence: 'high' | 'medium' | 'low';
  reasoning: string;
} {
  const q = question.question.toLowerCase();
  const category = question.category;

  // System Design indicators (high confidence)
  if (
    q.includes('design a') ||
    q.includes('architect') ||
    q.includes('how would you build') ||
    q.includes('design the') ||
    q.includes('scale') && (q.includes('system') || q.includes('service')) ||
    q.includes('system design') ||
    q.includes('high-level design')
  ) {
    return {
      likelyType: 'system-design',
      confidence: 'high',
      reasoning: 'Question asks for system/architecture design',
    };
  }

  // Conceptual/Theory indicators
  if (
    q.includes('explain') ||
    q.includes('what is') ||
    q.includes('what are') ||
    q.includes('difference between') ||
    q.includes('how does') ||
    q.includes('why is') ||
    q.includes('compare') ||
    q.includes('trade-off') ||
    q.includes('pros and cons')
  ) {
    // Check if it's asking for explanation with experience context
    if (q.includes('tell me about') || q.includes('your experience')) {
      return {
        likelyType: 'behavioral-technical',
        confidence: 'medium',
        reasoning: 'Conceptual question but asks for personal experience context',
      };
    }
    return {
      likelyType: 'conceptual',
      confidence: 'high',
      reasoning: 'Question asks for explanation or comparison of concepts',
    };
  }

  // Problem-solving/Algorithm indicators
  if (
    q.includes('implement') ||
    q.includes('write a function') ||
    q.includes('write code') ||
    q.includes('algorithm') ||
    q.includes('solve') ||
    q.includes('optimize') ||
    q.includes('given an array') ||
    q.includes('given a string')
  ) {
    return {
      likelyType: 'problem-solving',
      confidence: 'high',
      reasoning: 'Question asks for coding solution or algorithm',
    };
  }

  // Behavioral indicators (high confidence)
  if (
    q.includes('tell me about a time') ||
    q.includes('describe a situation') ||
    q.includes('give me an example of') ||
    q.includes('walk me through') ||
    q.includes('have you ever') ||
    q.includes('what was your role in') ||
    q.includes('how did you handle') ||
    q.includes('describe when you')
  ) {
    return {
      likelyType: 'experience',
      confidence: 'high',
      reasoning: 'Question explicitly asks for past experience narrative',
    };
  }

  // Category-based fallback
  if (category === 'behavioral' || category === 'situational') {
    return {
      likelyType: 'experience',
      confidence: 'medium',
      reasoning: 'Question category suggests behavioral format',
    };
  }

  if (category === 'technical') {
    // Technical questions could be conceptual or behavioral-technical
    if (q.includes('your') || q.includes('you')) {
      return {
        likelyType: 'behavioral-technical',
        confidence: 'medium',
        reasoning: 'Technical question with personal context',
      };
    }
    return {
      likelyType: 'conceptual',
      confidence: 'low',
      reasoning: 'Generic technical question, likely conceptual',
    };
  }

  // Default fallback
  return {
    likelyType: 'experience',
    confidence: 'low',
    reasoning: 'Could not determine type, defaulting to experience-based',
  };
}

/**
 * Build context from user profile
 */
function buildProfileContext(profile: UserProfile): string {
  const roles = profile.recentRoles
    .slice(0, 4)
    .map((r) => `- ${r.title} at ${r.company} (${r.duration})\n  Key highlights: ${r.highlights.slice(0, 3).join('; ')}`)
    .join('\n');

  const achievements = profile.keyAchievements
    .slice(0, 5)
    .map((a) => `- ${a.description}${a.metrics ? ` [${a.metrics}]` : ''} (${a.storyType})`)
    .join('\n');

  const projects = profile.activeProjects
    .slice(0, 3)
    .map((p) => `- ${p.name}: ${p.description} [${p.techStack.slice(0, 4).join(', ')}]`)
    .join('\n');

  return `
## Candidate Profile
**Name:** ${profile.name}
**Headline:** ${profile.headline}
**Experience:** ${profile.yearsExperience} years

**Technical Skills:** ${profile.technicalSkills.slice(0, 15).join(', ')}
**Soft Skills:** ${profile.softSkills.slice(0, 8).join(', ')}
**Industries:** ${profile.industries.join(', ')}

### Recent Roles
${roles || 'No roles listed'}

### Key Achievements
${achievements || 'No achievements listed'}

### Active Projects
${projects || 'No projects listed'}

**Current Situation:** ${profile.currentSituation || 'Not specified'}
**Goals:** ${profile.goals.slice(0, 3).join(', ') || 'Not specified'}
`.trim();
}

/**
 * Build stories context for AI reference
 */
function buildStoriesContext(stories: Experience[]): string {
  if (stories.length === 0) return 'No STAR stories available in experience bank.';

  return stories
    .slice(0, 10)
    .map((s, i) => {
      return `[Story ${i}] "${s.title}"
  Tags: ${s.tags.slice(0, 5).join(', ')}
  Result: ${s.star.result.slice(0, 150)}...
  Metric: ${s.metrics?.primary || 'No primary metric'}`;
    })
    .join('\n\n');
}

/**
 * Helper to check if analysis is FTE type
 */
function isFTEAnalysis(analysis: JDAnalysis): analysis is FTEAnalysis {
  return analysis.analysisType === 'fulltime';
}

/**
 * Build job context
 */
function buildJobContext(
  company: string,
  role: string,
  analysis?: JDAnalysis,
  research?: CompanyResearch
): string {
  let context = `
## Target Position
**Company:** ${company}
**Role:** ${role}
`;

  if (analysis) {
    context += `**Fit Score:** ${analysis.fitScore}/10\n`;
    context += `**Key Requirements:** ${analysis.matchedSkills?.slice(0, 8).join(', ') || 'N/A'}\n`;

    if (isFTEAnalysis(analysis) && analysis.talkingPoints?.length > 0) {
      context += `**Points to Emphasize:** ${analysis.talkingPoints.slice(0, 4).join('; ')}\n`;
    }
  }

  if (research) {
    context += `\n### Company Context\n`;
    context += `- Industry: ${research.overview?.industry || 'N/A'}\n`;
    context += `- Tech Stack: ${research.engineeringCulture?.knownStack?.slice(0, 6).join(', ') || 'N/A'}\n`;
    context += `- Engineering Culture: ${research.engineeringCulture?.notes?.slice(0, 100) || 'N/A'}\n`;
    if (research.interviewIntel?.commonTopics?.length > 0) {
      context += `- Interview Focus Areas: ${research.interviewIntel.commonTopics.slice(0, 4).join(', ')}\n`;
    }
  }

  return context;
}

// ============================================
// MAIN GENERATION FUNCTION
// ============================================

export async function generateInterviewAnswer(
  params: GenerateInterviewAnswerParams
): Promise<GeneratedInterviewAnswer> {
  requireGemini();

  const { question, profile, stories, analysis, research, company, role } = params;

  // Pre-classify the question
  const typeHint = getQuestionTypeHint(question);

  // Build context sections
  const profileContext = buildProfileContext(profile);
  const storiesContext = buildStoriesContext(stories);
  const jobContext = buildJobContext(company, role, analysis, research);

  const prompt = `You are an expert interview coach helping a candidate prepare the perfect answer for an interview question.

${profileContext}

${jobContext}

## Available STAR Stories from Experience Bank
${storiesContext}

## The Interview Question
"${question.question}"

**Category:** ${question.category}
**Likelihood:** ${question.likelihood}
**Difficulty:** ${question.difficulty}
**Source:** ${question.source}
${question.suggestedApproach ? `**Suggested Approach:** ${question.suggestedApproach}` : ''}

## Question Type Classification (Your Analysis)
Initial hint: ${typeHint.likelyType} (${typeHint.confidence} confidence - ${typeHint.reasoning})

**CRITICAL: Override the hint if your analysis suggests a different type!**

First, analyze the question to determine the CORRECT question type:
- **experience** / **behavioral-technical**: Questions asking about past experiences ("Tell me about a time...", "Describe when you...", "How did you handle...") → Use STAR format
- **system-design**: Questions asking to design systems or architecture ("Design a...", "How would you architect...", "Build a scalable...") → Use Requirements-Design-Tradeoffs format
- **conceptual**: Questions asking to explain concepts ("What is...", "Explain...", "Compare X and Y...", "How does X work...") → Use Explain-Example-Tradeoffs format
- **problem-solving**: Questions asking to solve coding/algorithm problems ("Implement...", "Write a function...", "Given an array...") → Use Approach-Implementation-Complexity format

## Format Guidelines by Question Type

### For STAR Format (experience/behavioral-technical):
Structure: Situation → Task → Action → Result
- Lead with the narrative, make it personal
- Use "I" statements extensively
- Include specific metrics in the Result
- Keep total delivery time: 2-3 minutes

### For Requirements-Design-Tradeoffs Format (system-design):
Structure:
1. **Clarifying Questions** (What to ask the interviewer first)
2. **Requirements** (Functional & non-functional)
3. **High-Level Architecture** (Component overview with brief explanation)
4. **Key Components Deep Dive** (2-3 critical components in detail)
5. **Data Model** (If applicable)
6. **Scalability & Trade-offs** (How to scale, alternative approaches)
7. **Experience Connection** (Brief: "I've built something similar at...")

- Think forward, demonstrate architectural thinking
- Show you can break down complex problems
- Discuss trade-offs explicitly
- Reference experience as PROOF, not primary structure

### For Explain-Example-Tradeoffs Format (conceptual):
Structure:
1. **Core Explanation** (Clear, concise definition)
2. **How It Works** (Mechanism/implementation details)
3. **Real-World Example** (Concrete application)
4. **Trade-offs & When to Use** (Pros, cons, alternatives)
5. **Experience Connection** (Brief: "In my work with...")

- Be technically precise
- Use analogies for complex concepts
- Show depth of understanding

### For Approach-Implementation-Complexity Format (problem-solving):
Structure:
1. **Clarification** (Edge cases, constraints)
2. **Approach** (Algorithm/strategy)
3. **Implementation** (Step-by-step or pseudocode)
4. **Complexity Analysis** (Time & space)
5. **Optimization** (Better approaches if time)
6. **Experience Connection** (Brief: "I've used this pattern when...")

## Your Task

Generate a comprehensive interview answer that:
1. Uses the CORRECT format for the detected question type
2. Draws from the candidate's REAL experience (reference specific stories by index)
3. Includes quantified metrics wherever possible
4. Is tailored for the ${role} role at ${company}
5. Sounds authentic to someone with ${profile.yearsExperience} years of experience
6. Can be delivered in 2-4 minutes depending on format
7. Anticipates and prepares for follow-up questions

**For non-behavioral questions (system-design, conceptual, problem-solving):**
- The candidate's experience should be woven in as supporting evidence
- Do NOT structure the entire answer around a past story
- Lead with forward-thinking problem-solving, use experience as proof points

**For behavioral questions:**
- Lead with the STAR narrative
- Make it personal and specific
- Populate the 'star' field in addition to 'sections'

Generate the complete answer following the schema.`;

  const result = await geminiClient!.models.generateContent({
    model: DEFAULT_MODEL,
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      responseSchema: interviewAnswerSchema,
      thinkingConfig: { thinkingBudget: DEFAULT_THINKING_BUDGET * 2 },
      temperature: 0.7,
    },
  });

  const text = result.text || '';

  try {
    const parsed = parseGeminiJson<any>(text, { context: 'generateInterviewAnswer' });

    // Map story indices back to IDs
    const matchedStoryIds = (parsed.sources?.matchedStoryIndices || [])
      .map((idx: number) => stories[idx]?.id)
      .filter(Boolean);

    // Construct the final answer object
    const answer: GeneratedInterviewAnswer = {
      detectedQuestionType: parsed.detectedQuestionType,
      answerFormat: parsed.answerFormat,
      title: parsed.title,
      sections: parsed.sections || [],
      narrative: parsed.narrative,
      bulletPoints: parsed.bulletPoints || [],
      star: parsed.star,
      metrics: {
        primary: parsed.metrics?.primary,
        secondary: parsed.metrics?.secondary || [],
      },
      sources: {
        storyIds: matchedStoryIds,
        profileSections: parsed.sources?.profileSectionsUsed || [],
        synthesized: parsed.sources?.synthesized || false,
      },
      tags: parsed.tags || [],
      keyTalkingPoints: parsed.keyTalkingPoints || [],
      deliveryTips: parsed.deliveryTips || [],
      followUpQuestions: parsed.followUpQuestions || [],
      coachingNotes: parsed.coachingNotes,
      variations: parsed.variations,
    };

    return answer;
  } catch (error) {
    console.error('Failed to parse generated interview answer:', error);
    throw new Error('Failed to generate interview answer. Please try again.');
  }
}

// ============================================
// REFINEMENT FUNCTION
// ============================================

export async function refineInterviewAnswer(
  params: RefineInterviewAnswerParams
): Promise<GeneratedInterviewAnswer> {
  requireGemini();

  const { currentAnswer, refinementFeedback, question, company, role } = params;

  // Build sections string for context
  const sectionsStr = currentAnswer.sections
    .map((s) => `**${s.label}:**\n${s.content}`)
    .join('\n\n');

  const prompt = `You are an expert interview coach. A candidate has generated an interview answer and wants to refine it based on their feedback.

## Current Answer

**Title:** ${currentAnswer.title}
**Question Type:** ${currentAnswer.detectedQuestionType}
**Answer Format:** ${currentAnswer.answerFormat}

### Structured Answer
${sectionsStr}

### Narrative Version
${currentAnswer.narrative}

### Key Talking Points
${currentAnswer.keyTalkingPoints.map((p, i) => `${i + 1}. ${p}`).join('\n')}

### Metrics
- Primary: ${currentAnswer.metrics.primary || 'None'}
- Secondary: ${currentAnswer.metrics.secondary.join(', ') || 'None'}

### Tags
${currentAnswer.tags.join(', ')}

### Coaching Notes
${currentAnswer.coachingNotes}

## Interview Context
- Question: "${question}"
- Company: ${company}
- Role: ${role}

## User's Refinement Request
"${refinementFeedback}"

## Your Task

Refine the answer based on the user's feedback while:
1. Maintaining the same answer format (${currentAnswer.answerFormat})
2. Keeping the content authentic and specific
3. Preserving or improving metrics
4. Ensuring the answer still addresses the interview question effectively
5. Keeping the delivery time appropriate (2-4 minutes)

Common refinement requests:
- Making it more concise or adding more detail
- Emphasizing different skills or achievements
- Adding or improving metrics
- Making it sound more natural/conversational
- Deepening technical content
- Improving specific sections
- Adding more concrete examples

Generate the complete refined answer with all fields updated appropriately.`;

  const result = await geminiClient!.models.generateContent({
    model: DEFAULT_MODEL,
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      responseSchema: interviewAnswerSchema,
      thinkingConfig: { thinkingBudget: DEFAULT_THINKING_BUDGET },
      temperature: 0.7,
    },
  });

  const text = result.text || '';

  try {
    const parsed = parseGeminiJson<any>(text, { context: 'refineInterviewAnswer' });

    // Preserve source story IDs from original (refinement shouldn't change sources)
    const answer: GeneratedInterviewAnswer = {
      detectedQuestionType: parsed.detectedQuestionType || currentAnswer.detectedQuestionType,
      answerFormat: parsed.answerFormat || currentAnswer.answerFormat,
      title: parsed.title,
      sections: parsed.sections || [],
      narrative: parsed.narrative,
      bulletPoints: parsed.bulletPoints || [],
      star: parsed.star,
      metrics: {
        primary: parsed.metrics?.primary,
        secondary: parsed.metrics?.secondary || [],
      },
      sources: currentAnswer.sources, // Preserve original sources
      tags: parsed.tags || [],
      keyTalkingPoints: parsed.keyTalkingPoints || [],
      deliveryTips: parsed.deliveryTips || [],
      followUpQuestions: parsed.followUpQuestions || [],
      coachingNotes: parsed.coachingNotes,
      variations: parsed.variations,
    };

    return answer;
  } catch (error) {
    console.error('Failed to parse refined interview answer:', error);
    throw new Error('Failed to refine answer. Please try again.');
  }
}

// ============================================
// CONVERSION HELPERS
// ============================================

/**
 * Convert GeneratedInterviewAnswer to Experience (for saving to stories)
 * Preserves full generated answer metadata for rich viewing
 */
export function interviewAnswerToExperience(
  answer: GeneratedInterviewAnswer,
  question: string,
  profileId?: string
): Partial<Experience> {
  // Build the generated answer metadata for rich viewing later
  const generatedAnswerMetadata: Experience['generatedAnswerMetadata'] = {
    detectedQuestionType: answer.detectedQuestionType,
    answerFormat: answer.answerFormat,
    sections: answer.sections,
    narrative: answer.narrative,
    bulletPoints: answer.bulletPoints,
    keyTalkingPoints: answer.keyTalkingPoints,
    deliveryTips: answer.deliveryTips,
    followUpQA: answer.followUpQuestions,
    sources: answer.sources,
  };

  // For STAR-format answers, use the star field directly
  if (answer.star && answer.answerFormat === 'STAR') {
    return {
      title: answer.title,
      rawInput: `Generated answer for: "${question}"`,
      inputMethod: 'import' as const,
      star: answer.star,
      metrics: answer.metrics,
      tags: answer.tags,
      variations: answer.variations,
      followUpQuestions: answer.followUpQuestions.map((f) => f.question),
      coachingNotes: answer.coachingNotes,
      profileId,
      generatedAnswerMetadata,
    };
  }

  // For non-STAR formats, synthesize a STAR-like structure from sections
  // This allows storing the answer in Experience format while preserving structure
  const sections = answer.sections;
  const getSection = (labels: string[]): string => {
    const section = sections.find((s) =>
      labels.some((l) => s.label.toLowerCase().includes(l.toLowerCase()))
    );
    return section?.content || '';
  };

  let star: Experience['star'];

  switch (answer.answerFormat) {
    case 'Requirements-Design-Tradeoffs':
      star = {
        situation: getSection(['Requirements', 'Context', 'Clarifying']),
        task: getSection(['High-Level', 'Architecture', 'Overview']),
        action: getSection(['Deep Dive', 'Components', 'Implementation', 'Data']),
        result: getSection(['Trade-offs', 'Scalability', 'Conclusion']),
      };
      break;
    case 'Explain-Example-Tradeoffs':
      star = {
        situation: getSection(['Explanation', 'Core', 'Definition']),
        task: getSection(['How It Works', 'Mechanism', 'Implementation']),
        action: getSection(['Example', 'Real-World', 'Application']),
        result: getSection(['Trade-offs', 'When to Use', 'Conclusion']),
      };
      break;
    case 'Approach-Implementation-Complexity':
      star = {
        situation: getSection(['Clarification', 'Problem', 'Understanding']),
        task: getSection(['Approach', 'Strategy', 'Algorithm']),
        action: getSection(['Implementation', 'Steps', 'Code']),
        result: getSection(['Complexity', 'Optimization', 'Analysis']),
      };
      break;
    default:
      // Fallback: use narrative split into sections
      star = {
        situation: answer.narrative.slice(0, 300),
        task: '',
        action: answer.sections.map((s) => s.content).join('\n\n'),
        result: answer.metrics.primary || 'See full answer for details',
      };
  }

  return {
    title: answer.title,
    rawInput: `Generated ${answer.answerFormat} answer for: "${question}"\n\n${answer.narrative}`,
    inputMethod: 'import' as const,
    star,
    metrics: answer.metrics,
    tags: answer.tags,
    variations: answer.variations,
    followUpQuestions: answer.followUpQuestions.map((f) => f.question),
    coachingNotes: `Format: ${answer.answerFormat}\n\n${answer.coachingNotes}`,
    profileId,
    generatedAnswerMetadata,
  };
}

/**
 * Get format display info for UI
 */
export function getFormatDisplayInfo(format: AnswerFormatType): {
  name: string;
  description: string;
  icon: string;
  color: string;
  sectionLabels: string[];
} {
  switch (format) {
    case 'STAR':
      return {
        name: 'STAR Format',
        description: 'Behavioral question - narrative from past experience',
        icon: 'story',
        color: 'purple',
        sectionLabels: ['Situation', 'Task', 'Action', 'Result'],
      };
    case 'Requirements-Design-Tradeoffs':
      return {
        name: 'System Design',
        description: 'Architecture question - forward-thinking design approach',
        icon: 'architecture',
        color: 'blue',
        sectionLabels: ['Requirements', 'High-Level Design', 'Deep Dive', 'Trade-offs'],
      };
    case 'Explain-Example-Tradeoffs':
      return {
        name: 'Conceptual',
        description: 'Theory question - explanation with examples',
        icon: 'lightbulb',
        color: 'green',
        sectionLabels: ['Explanation', 'How It Works', 'Example', 'Trade-offs'],
      };
    case 'Approach-Implementation-Complexity':
      return {
        name: 'Problem Solving',
        description: 'Coding question - algorithmic approach',
        icon: 'code',
        color: 'orange',
        sectionLabels: ['Approach', 'Implementation', 'Complexity', 'Optimization'],
      };
    default:
      return {
        name: 'General',
        description: 'Interview answer',
        icon: 'message',
        color: 'gray',
        sectionLabels: [],
      };
  }
}

/**
 * Get question type display name
 */
export function getQuestionTypeDisplayName(type: TechnicalQuestionType): string {
  switch (type) {
    case 'behavioral-technical':
      return 'Behavioral-Technical';
    case 'conceptual':
      return 'Conceptual/Theory';
    case 'system-design':
      return 'System Design';
    case 'problem-solving':
      return 'Problem Solving';
    case 'experience':
      return 'Behavioral/Experience';
    default:
      return 'Interview Question';
  }
}
