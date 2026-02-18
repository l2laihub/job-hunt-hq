/**
 * Research Classification Service
 *
 * Analyzes user messages to determine if they require web research
 * vs. a regular conversational response from the AI assistant.
 */
import { requireGemini, DEFAULT_MODEL } from './client';
import { parseGeminiJson } from './parse-json';
import { researchClassificationSchema } from './schemas';
import type { AssistantContext } from '@/src/types/assistant';
import type { ResearchClassification, TopicResearchType } from '@/src/types/topic-research';

/**
 * Keywords and patterns that suggest different research types
 */
const RESEARCH_PATTERNS: Record<TopicResearchType, RegExp[]> = {
  salary: [
    /\b(salary|compensation|pay|wages?|earnings?)\b/i,
    /\bhow much (do|does|can|should)\b.*\b(earn|make|get paid)\b/i,
    /\bpay (range|scale|rate)\b/i,
    /\bmarket rate\b/i,
    /\b(total comp|tc)\b/i,
  ],
  industry: [
    /\b(industry|market|sector)\b.*\b(trend|outlook|future|forecast)\b/i,
    /\btrends? in\b/i,
    /\bfuture of\b/i,
    /\bmarket (for|outlook|conditions?)\b/i,
    /\bjob market\b/i,
    /\bhiring (trend|outlook)\b/i,
  ],
  technical: [
    /\bhow (does|do|is)\b.*\b(work|implemented|function)\b/i,
    /\bwhat is\b.*\b(framework|library|tool|language|technology)\b/i,
    /\bexplain\b.*\b(concept|pattern|architecture)\b/i,
    /\b(compare|vs|versus|difference between)\b/i,
    /\blearn(ing)?\b.*\b(about|resources?)\b/i,
    /\bpros and cons\b/i,
    /\bwhen (to|should)\b.*\buse\b/i,
  ],
  interview: [
    /\binterview(s|ing)?\b.*\b(at|for|with|process|questions?)\b/i,
    /\bquestions? (at|for|asked|they ask)\b/i,
    /\bhow (to|do I) (prepare|prep)\b.*\binterview\b/i,
    /\bwhat (do they|does.*company) (look for|ask|expect)\b/i,
    /\bglassdoor|blind|levels\.fyi\b/i,
  ],
};

/**
 * Quick pre-filter to check if message likely needs research
 * This is a fast check before calling the AI model
 */
function quickResearchCheck(message: string): {
  likelyNeeds: boolean;
  suggestedType: TopicResearchType | null;
} {
  const lowerMessage = message.toLowerCase();

  // Check for research-indicating phrases
  const researchPhrases = [
    'research',
    'find out',
    'look up',
    'what is the',
    'how much',
    'trends in',
    'interview at',
    'salary for',
    'compare',
  ];

  const hasResearchPhrase = researchPhrases.some((phrase) =>
    lowerMessage.includes(phrase)
  );

  // Check patterns for each type
  for (const [type, patterns] of Object.entries(RESEARCH_PATTERNS)) {
    for (const pattern of patterns) {
      if (pattern.test(message)) {
        return { likelyNeeds: true, suggestedType: type as TopicResearchType };
      }
    }
  }

  return { likelyNeeds: hasResearchPhrase, suggestedType: null };
}

/**
 * Classify a user message to determine if it needs research
 */
export async function classifyResearchIntent(
  message: string,
  context?: AssistantContext | null
): Promise<ResearchClassification> {
  // Quick pre-filter
  const quickCheck = quickResearchCheck(message);

  // If quick check is confident, we still verify with AI for better accuracy
  // But if clearly not research-related, we can skip the AI call
  if (!quickCheck.likelyNeeds && message.length < 50) {
    // Very short messages without research indicators - skip AI
    return {
      needsResearch: false,
      researchType: null,
      confidence: 90,
      extractedQuery: message,
      reasoning: 'Short message without research indicators',
    };
  }

  const ai = requireGemini();

  // Build context information for the classifier
  const contextInfo = context
    ? `
Current context:
- Type: ${context.type}
- Company: ${context.application?.company || context.companyResearch?.companyName || 'N/A'}
- Role: ${context.application?.role || 'N/A'}
`
    : '';

  const classificationPrompt = `Analyze this user message to determine if it requires web research for current, factual information.

User message: "${message}"
${contextInfo}

Research types:
- "salary": Questions about compensation, pay ranges, market rates
- "industry": Questions about market trends, industry outlook, job market conditions
- "technical": Questions about technologies, frameworks, concepts that need current information
- "interview": Questions about interview processes, questions asked at specific companies

Guidelines:
1. needsResearch = true ONLY if the question requires current, factual data from the web
2. General advice, opinions, or help with the user's existing data does NOT need research
3. Questions about "how to do X" or "help me with Y" typically don't need research
4. Questions like "what is the salary for X" or "interview process at Y company" DO need research
5. Be conservative - only trigger research when clearly beneficial

Examples that NEED research:
- "What's the salary for a senior engineer in Seattle?" → salary
- "What are the trends in AI/ML hiring?" → industry
- "How does React Server Components work?" → technical
- "What is the interview process at Google?" → interview

Examples that DON'T need research:
- "Help me improve my resume"
- "What should I highlight in my application?"
- "How well do I fit this role?"
- "Help me practice for my interview"

Extract the most relevant search query from the message.`;

  try {
    const response = await ai.models.generateContent({
      model: DEFAULT_MODEL,
      contents: classificationPrompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: researchClassificationSchema,
      },
    });

    if (!response.text) {
      throw new Error('Empty response from classifier');
    }

    const result = parseGeminiJson<ResearchClassification>(response.text, { context: 'classifyResearchIntent' });

    return {
      needsResearch: result.needsResearch ?? false,
      researchType: result.researchType ?? null,
      confidence: Math.min(100, Math.max(0, result.confidence ?? 50)),
      extractedQuery: result.extractedQuery || message,
      reasoning: result.reasoning || 'Classification completed',
    };
  } catch (error) {
    console.error('Research classification failed:', error);

    // Fall back to quick check result
    return {
      needsResearch: quickCheck.likelyNeeds,
      researchType: quickCheck.suggestedType,
      confidence: 40,
      extractedQuery: message,
      reasoning: 'Fallback to pattern matching due to classification error',
    };
  }
}

/**
 * Check if classification result recommends research
 * Uses a confidence threshold to avoid low-confidence triggers
 */
export function shouldPerformResearch(
  classification: ResearchClassification,
  confidenceThreshold = 70
): boolean {
  return (
    classification.needsResearch &&
    classification.researchType !== null &&
    classification.confidence >= confidenceThreshold
  );
}
