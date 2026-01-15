/**
 * Topic Research Service
 *
 * Performs grounded web searches for various research topics.
 * Uses the same two-step pattern as company research:
 * 1. Google Search grounding for current information
 * 2. Structure into typed JSON response
 */
import { requireGemini, DEFAULT_MODEL } from './client';
import {
  salaryResearchSchema,
  industryResearchSchema,
  technicalResearchSchema,
  interviewResearchSchema,
} from './schemas';
import { aiCache, cacheKeys } from './cache';
import { generateId } from '@/src/lib/utils';
import { CACHE_TTL } from '@/src/lib/constants';
import type {
  TopicResearchType,
  TopicResearch,
  SalaryResearch,
  SalaryResearchData,
  IndustryResearch,
  IndustryResearchData,
  TechnicalResearch,
  TechnicalResearchData,
  InterviewResearch,
  InterviewResearchData,
  ResearchSource,
} from '@/src/types/topic-research';
import type { UserProfileWithMeta } from '@/src/types';

interface ResearchContext {
  company?: string;
  role?: string;
  profile?: UserProfileWithMeta;
  applicationId?: string;
  analyzedJobId?: string;
}

/**
 * Get cache key for topic research
 */
function getResearchCacheKey(type: TopicResearchType, query: string): string {
  const normalizedQuery = query.toLowerCase().trim().replace(/\s+/g, '-');
  return `topic-research:${type}:${normalizedQuery}`;
}

/**
 * Extract sources from grounding metadata
 */
function extractSources(response: { candidates?: Array<{ groundingMetadata?: { groundingChunks?: Array<{ web?: { uri?: string; title?: string } }> } }> }): ResearchSource[] {
  const sources: ResearchSource[] = [];
  response.candidates?.[0]?.groundingMetadata?.groundingChunks?.forEach((chunk) => {
    if (chunk.web?.uri) {
      sources.push({
        url: chunk.web.uri,
        title: chunk.web.title,
      });
    }
  });
  return sources;
}

/**
 * Clean JSON response from markdown code blocks
 */
function cleanJsonResponse(text: string): string {
  if (text.includes('```')) {
    return text.replace(/^```(json)?\s*/, '').replace(/\s*```$/, '');
  }
  return text;
}

// ============================================
// SALARY RESEARCH
// ============================================

async function researchSalary(
  query: string,
  context?: ResearchContext
): Promise<SalaryResearch> {
  const ai = requireGemini();

  // Check cache
  const cacheKey = getResearchCacheKey('salary', query);
  const cached = aiCache.get<SalaryResearch>(cacheKey);
  if (cached) return cached;

  const roleContext = context?.role ? `for ${context.role} roles` : '';
  const profileContext = context?.profile?.preferences?.salaryRange
    ? `User's target salary: $${context.profile.preferences.salaryRange.min}-${context.profile.preferences.salaryRange.max}`
    : '';

  const searchPrompt = `Research current salary and compensation information: "${query}" ${roleContext}

${profileContext}

Provide comprehensive salary intelligence including:
1. Salary ranges (low, median, high) with specific numbers
2. Factors affecting salary (location, experience, company size, skills)
3. Market trends (is compensation increasing, stable, or decreasing)
4. Negotiation tips specific to this role
5. How company size affects compensation (startup vs enterprise)

Focus on current, factual data from reliable sources like Levels.fyi, Glassdoor, LinkedIn Salary, and industry reports.`;

  // Step 1: Search with grounding
  const searchResponse = await ai.models.generateContent({
    model: DEFAULT_MODEL,
    contents: searchPrompt,
    config: {
      tools: [{ googleSearch: {} }],
    },
  });

  if (!searchResponse.text) {
    throw new Error('Empty response from salary search');
  }

  const sources = extractSources(searchResponse);

  // Step 2: Structure the data
  const structurePrompt = `Based on this salary research, extract and structure the data:

RESEARCH DATA:
${searchResponse.text}

SOURCES: ${sources.map((s) => s.url).join(', ')}

${profileContext ? `Note: ${profileContext}` : ''}

Structure the salary information accurately. Use real numbers found in the research.`;

  const structureResponse = await ai.models.generateContent({
    model: DEFAULT_MODEL,
    contents: structurePrompt,
    config: {
      responseMimeType: 'application/json',
      responseSchema: salaryResearchSchema,
    },
  });

  if (!structureResponse.text) {
    throw new Error('Empty response from salary structuring');
  }

  const data = JSON.parse(cleanJsonResponse(structureResponse.text)) as SalaryResearchData;

  const research: SalaryResearch = {
    id: generateId(),
    type: 'salary',
    query,
    status: 'completed',
    data,
    sources,
    tags: ['salary', data.role],
    isFavorite: false,
    searchedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    applicationId: context?.applicationId,
    analyzedJobId: context?.analyzedJobId,
    companyContext: context?.company,
    roleContext: context?.role,
  };

  // Cache with shorter TTL (salary data changes)
  aiCache.set(cacheKey, research, CACHE_TTL.ANALYSIS);

  return research;
}

// ============================================
// INDUSTRY RESEARCH
// ============================================

async function researchIndustry(
  query: string,
  context?: ResearchContext
): Promise<IndustryResearch> {
  const ai = requireGemini();

  const cacheKey = getResearchCacheKey('industry', query);
  const cached = aiCache.get<IndustryResearch>(cacheKey);
  if (cached) return cached;

  const searchPrompt = `Research current industry trends and market conditions: "${query}"

Provide comprehensive industry intelligence including:
1. Current trends with their impact level (high/medium/low)
2. Emerging technologies in this space
3. Market outlook (growing, stable, or contracting)
4. Key players and companies
5. Skills that are most in-demand
6. Current challenges and opportunities
7. Job market conditions

Focus on recent developments (last 6-12 months) from industry reports, news, and analyst research.`;

  const searchResponse = await ai.models.generateContent({
    model: DEFAULT_MODEL,
    contents: searchPrompt,
    config: {
      tools: [{ googleSearch: {} }],
    },
  });

  if (!searchResponse.text) {
    throw new Error('Empty response from industry search');
  }

  const sources = extractSources(searchResponse);

  const structurePrompt = `Based on this industry research, extract and structure the data:

RESEARCH DATA:
${searchResponse.text}

SOURCES: ${sources.map((s) => s.url).join(', ')}

Structure the industry information accurately with specific trends and insights.`;

  const structureResponse = await ai.models.generateContent({
    model: DEFAULT_MODEL,
    contents: structurePrompt,
    config: {
      responseMimeType: 'application/json',
      responseSchema: industryResearchSchema,
    },
  });

  if (!structureResponse.text) {
    throw new Error('Empty response from industry structuring');
  }

  const data = JSON.parse(cleanJsonResponse(structureResponse.text)) as IndustryResearchData;

  const research: IndustryResearch = {
    id: generateId(),
    type: 'industry',
    query,
    status: 'completed',
    data,
    sources,
    tags: ['industry', data.industry],
    isFavorite: false,
    searchedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    applicationId: context?.applicationId,
    analyzedJobId: context?.analyzedJobId,
    companyContext: context?.company,
    roleContext: context?.role,
  };

  aiCache.set(cacheKey, research, CACHE_TTL.RESEARCH);

  return research;
}

// ============================================
// TECHNICAL RESEARCH
// ============================================

async function researchTechnical(
  query: string,
  context?: ResearchContext
): Promise<TechnicalResearch> {
  const ai = requireGemini();

  const cacheKey = getResearchCacheKey('technical', query);
  const cached = aiCache.get<TechnicalResearch>(cacheKey);
  if (cached) return cached;

  const searchPrompt = `Research this technical topic: "${query}"

Provide comprehensive technical intelligence including:
1. Overview and explanation of the topic
2. Key features and characteristics
3. Common use cases
4. Pros and cons
5. Alternatives and how they compare
6. Learning resources (courses, tutorials, documentation)
7. Interview relevance - common questions and key points to know
8. Current market adoption level

Focus on accurate, practical information that would help someone understand and use this technology.`;

  const searchResponse = await ai.models.generateContent({
    model: DEFAULT_MODEL,
    contents: searchPrompt,
    config: {
      tools: [{ googleSearch: {} }],
    },
  });

  if (!searchResponse.text) {
    throw new Error('Empty response from technical search');
  }

  const sources = extractSources(searchResponse);

  const structurePrompt = `Based on this technical research, extract and structure the data:

RESEARCH DATA:
${searchResponse.text}

SOURCES: ${sources.map((s) => s.url).join(', ')}

Structure the technical information accurately. Include real learning resources with URLs when available.`;

  const structureResponse = await ai.models.generateContent({
    model: DEFAULT_MODEL,
    contents: structurePrompt,
    config: {
      responseMimeType: 'application/json',
      responseSchema: technicalResearchSchema,
    },
  });

  if (!structureResponse.text) {
    throw new Error('Empty response from technical structuring');
  }

  const data = JSON.parse(cleanJsonResponse(structureResponse.text)) as TechnicalResearchData;

  const research: TechnicalResearch = {
    id: generateId(),
    type: 'technical',
    query,
    status: 'completed',
    data,
    sources,
    tags: ['technical', data.topic, data.category],
    isFavorite: false,
    searchedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    applicationId: context?.applicationId,
    analyzedJobId: context?.analyzedJobId,
    companyContext: context?.company,
    roleContext: context?.role,
  };

  // Technical topics change less often, cache longer
  aiCache.set(cacheKey, research, CACHE_TTL.RESEARCH);

  return research;
}

// ============================================
// INTERVIEW RESEARCH
// ============================================

async function researchInterview(
  query: string,
  context?: ResearchContext
): Promise<InterviewResearch> {
  const ai = requireGemini();

  const cacheKey = getResearchCacheKey('interview', query);
  const cached = aiCache.get<InterviewResearch>(cacheKey);
  if (cached) return cached;

  const companyContext = context?.company ? `at ${context.company}` : '';
  const roleContext = context?.role ? `for ${context.role}` : '';

  const searchPrompt = `Research interview process and questions ${companyContext} ${roleContext}: "${query}"

Provide comprehensive interview intelligence including:
1. Interview process (stages, typical duration, format)
2. Common interview questions by category (behavioral, technical, situational, culture)
3. Technical topics commonly covered
4. Company values and what they look for
5. Red flags to avoid
6. Practical tips
7. Recent insights from Glassdoor, Blind, or other sources
8. Difficulty level

Focus on actionable, recent information that would help someone prepare effectively.`;

  const searchResponse = await ai.models.generateContent({
    model: DEFAULT_MODEL,
    contents: searchPrompt,
    config: {
      tools: [{ googleSearch: {} }],
    },
  });

  if (!searchResponse.text) {
    throw new Error('Empty response from interview search');
  }

  const sources = extractSources(searchResponse);

  const structurePrompt = `Based on this interview research, extract and structure the data:

RESEARCH DATA:
${searchResponse.text}

SOURCES: ${sources.map((s) => s.url).join(', ')}

${context?.company ? `Company: ${context.company}` : ''}
${context?.role ? `Role: ${context.role}` : ''}

Structure the interview information accurately with specific questions and insights.`;

  const structureResponse = await ai.models.generateContent({
    model: DEFAULT_MODEL,
    contents: structurePrompt,
    config: {
      responseMimeType: 'application/json',
      responseSchema: interviewResearchSchema,
    },
  });

  if (!structureResponse.text) {
    throw new Error('Empty response from interview structuring');
  }

  const data = JSON.parse(cleanJsonResponse(structureResponse.text)) as InterviewResearchData;

  const research: InterviewResearch = {
    id: generateId(),
    type: 'interview',
    query,
    status: 'completed',
    data,
    sources,
    tags: ['interview', ...(data.company ? [data.company] : []), ...(data.role ? [data.role] : [])],
    isFavorite: false,
    searchedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    applicationId: context?.applicationId,
    analyzedJobId: context?.analyzedJobId,
    companyContext: context?.company || data.company,
    roleContext: context?.role || data.role,
  };

  aiCache.set(cacheKey, research, CACHE_TTL.RESEARCH);

  return research;
}

// ============================================
// MAIN RESEARCH FUNCTION
// ============================================

/**
 * Perform topic research based on type
 */
export async function researchTopic(
  type: TopicResearchType,
  query: string,
  context?: ResearchContext
): Promise<TopicResearch> {
  switch (type) {
    case 'salary':
      return researchSalary(query, context);
    case 'industry':
      return researchIndustry(query, context);
    case 'technical':
      return researchTechnical(query, context);
    case 'interview':
      return researchInterview(query, context);
    default:
      throw new Error(`Unknown research type: ${type}`);
  }
}

/**
 * Generate a conversational summary of research results
 */
export function generateResearchSummary(research: TopicResearch): string {
  switch (research.type) {
    case 'salary': {
      const data = research.data;
      const range = data.rangeEstimate;
      return `Based on my research, ${data.role} salaries typically range from ${range.currency}${range.low.toLocaleString()} to ${range.currency}${range.high.toLocaleString()}, with a median of ${range.currency}${range.median.toLocaleString()}. The market trend is ${data.marketTrend}. ${data.summary}`;
    }
    case 'industry': {
      const data = research.data;
      return `The ${data.industry} market is currently ${data.marketOutlook}. Key trends include: ${data.currentTrends.slice(0, 3).map((t) => t.trend).join(', ')}. ${data.summary}`;
    }
    case 'technical': {
      const data = research.data;
      return `${data.topic} is a ${data.category} with ${data.marketAdoption} adoption. ${data.overview} Key points: ${data.keyFeatures.slice(0, 3).join(', ')}. ${data.summary}`;
    }
    case 'interview': {
      const data = research.data;
      const companyInfo = data.company ? `at ${data.company}` : '';
      return `Interview preparation ${companyInfo}: The process typically involves ${data.interviewProcess.stages.length} stages. Difficulty: ${data.difficulty}. ${data.summary}`;
    }
    default:
      return 'Research completed.';
  }
}

/**
 * Clear cached research
 */
export function clearResearchCache(type: TopicResearchType, query: string): void {
  const cacheKey = getResearchCacheKey(type, query);
  aiCache.remove(cacheKey);
}
