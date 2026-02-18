import { requireGemini, DEFAULT_MODEL } from './client';
import { companyResearchSchema } from './schemas';
import { aiCache, cacheKeys } from './cache';
import type { CompanyResearch } from '@/src/types';
import { CACHE_TTL } from '@/src/lib/constants';
import { generateId } from '@/src/lib/utils';
import { parseGeminiJson } from './parse-json';

/**
 * Research a company using Gemini with Google Search grounding
 *
 * Note: Google Search grounding cannot be used with JSON response mode,
 * so we use a two-step approach:
 * 1. First call with Google Search to gather information (text response)
 * 2. Second call to structure the data into JSON format
 */
export async function researchCompany(
  companyName: string,
  roleTitle?: string,
  options?: {
    skipCache?: boolean;
  }
): Promise<CompanyResearch> {
  const ai = requireGemini();

  // Check cache
  const cacheKey = cacheKeys.research(companyName);

  if (!options?.skipCache) {
    const cached = aiCache.get<CompanyResearch>(cacheKey);
    if (cached) {
      // Update roleContext if different
      if (roleTitle && cached.roleContext !== roleTitle) {
        return { ...cached, roleContext: roleTitle };
      }
      return cached;
    }
  }

  const searchPrompt = `Research "${companyName}" for a job seeker ${roleTitle ? `applying to ${roleTitle} roles` : 'exploring engineering opportunities'}.

Provide comprehensive intelligence including:
1. Company overview (industry, size, funding stage, headquarters, founding year)
2. Recent news and developments (last 30-90 days) - include dates and summaries
3. Engineering culture (tech stack, engineering blog, open source projects, remote policy)
4. Red flags (layoffs, controversies, Glassdoor concerns, any negative press)
5. Green flags (growth indicators, good reviews, interesting technology, awards)
6. Key people to know (CEO, CTO, VP Engineering, notable engineers)
7. Interview intelligence (difficulty level, common interview topics, salary ranges if available)
8. Overall verdict - is this a good place to work?

Be thorough and include specific details, names, dates, and facts. Focus on actionable intelligence for job seekers.`;

  try {
    // Step 1: Research with Google Search grounding (text response)
    const searchResponse = await ai.models.generateContent({
      model: DEFAULT_MODEL,
      contents: searchPrompt,
      config: {
        tools: [{ googleSearch: {} }],
      },
    });

    if (!searchResponse.text) {
      throw new Error('Empty response from search');
    }

    const researchText = searchResponse.text;

    // Extract sources from grounding metadata
    const sources: string[] = [];
    searchResponse.candidates?.[0]?.groundingMetadata?.groundingChunks?.forEach((chunk) => {
      if (chunk.web?.uri) {
        sources.push(chunk.web.uri);
      }
    });

    // Step 2: Structure the research data into JSON format
    const structurePrompt = `Based on the following company research, extract and structure the information into a detailed JSON format.

RESEARCH DATA:
${researchText}

SOURCES USED:
${sources.join('\n')}

Extract the information into a structured format with the following sections:
- overview: company description, industry, size, founded year, headquarters, funding status
- recentNews: array of news items with title, date, summary, sentiment (positive/negative/neutral), source
- engineeringCulture: tech stack, engineering blog URL, open source projects, remote policy, team structure notes
- redFlags: array of concerns (item, severity high/medium/low, source)
- greenFlags: array of positives (item, source)
- keyPeople: array of people (name, title, linkedin URL if known, notes)
- interviewIntel: difficulty 1-10, common topics, process overview, salary range, tips
- verdict: overall assessment (green/yellow/red), summary, top concern, top positive

Be accurate and only include information that was found in the research. Use null or empty arrays for missing data.`;

    const structureResponse = await ai.models.generateContent({
      model: DEFAULT_MODEL,
      contents: structurePrompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: companyResearchSchema,
      },
    });

    if (!structureResponse.text) {
      throw new Error('Empty response from structuring');
    }

    const result = parseGeminiJson(structureResponse.text, { context: 'researchCompany' });

    const research: CompanyResearch = {
      id: generateId(),
      companyName,
      roleContext: roleTitle,
      overview: result.overview || {
        description: 'No description available',
        industry: 'Unknown',
        size: 'Unknown',
        founded: 'Unknown',
        headquarters: 'Unknown',
        fundingStatus: 'Unknown',
      },
      recentNews: result.recentNews || [],
      engineeringCulture: result.engineeringCulture || {
        knownStack: [],
        remotePolicy: 'unknown',
      },
      redFlags: result.redFlags || [],
      greenFlags: result.greenFlags || [],
      keyPeople: result.keyPeople || [],
      interviewIntel: result.interviewIntel || {
        commonTopics: [],
      },
      verdict: result.verdict || {
        overall: 'yellow',
        summary: 'Unable to determine overall verdict',
      },
      searchedAt: new Date().toISOString(),
      sourcesUsed: sources.length > 0 ? sources : (result.sourcesUsed || []),
    };

    // Cache the result
    aiCache.set(cacheKey, research, CACHE_TTL.RESEARCH);

    return research;
  } catch (error) {
    console.error('Company research failed:', error);
    throw new Error(
      `Failed to research company: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Re-research with fresh data (skip cache)
 */
export async function refreshCompanyResearch(
  companyName: string,
  roleTitle?: string
): Promise<CompanyResearch> {
  return researchCompany(companyName, roleTitle, { skipCache: true });
}

/**
 * Clear cached research for a company
 */
export function clearCompanyResearchCache(companyName: string): void {
  const cacheKey = cacheKeys.research(companyName);
  aiCache.remove(cacheKey);
}
