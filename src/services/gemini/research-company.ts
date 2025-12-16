import { requireGemini, DEFAULT_MODEL } from './client';
import { companyResearchSchema } from './schemas';
import { aiCache, cacheKeys } from './cache';
import type { CompanyResearch } from '@/src/types';
import { CACHE_TTL } from '@/src/lib/constants';
import { generateId } from '@/src/lib/utils';

/**
 * Research a company using Gemini with Google Search grounding
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

  const prompt = `Research "${companyName}" for a job seeker ${roleTitle ? `applying to ${roleTitle} roles` : 'exploring engineering opportunities'}.

Provide comprehensive intelligence including:
1. Company overview (industry, size, funding, headquarters)
2. Recent news and developments (last 30-90 days)
3. Engineering culture (tech stack, blog, open source, remote policy)
4. Red flags (layoffs, controversies, Glassdoor concerns)
5. Green flags (growth, good reviews, interesting tech)
6. Key people to know (leadership, hiring managers)
7. Interview intelligence (difficulty, common topics, salary ranges)
8. Overall verdict with top concern and positive

Be thorough but concise. Focus on actionable intelligence for job seekers.`;

  try {
    const response = await ai.models.generateContent({
      model: DEFAULT_MODEL,
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: 'application/json',
        responseSchema: companyResearchSchema,
      },
    });

    if (!response.text) {
      throw new Error('Empty response from Gemini');
    }

    // Clean up response if it has markdown code blocks
    let jsonText = response.text;
    if (jsonText.includes('```')) {
      jsonText = jsonText.replace(/^```(json)?\s*/, '').replace(/\s*```$/, '');
    }

    const result = JSON.parse(jsonText);

    // Extract sources from grounding metadata
    const sources: string[] = [];
    response.candidates?.[0]?.groundingMetadata?.groundingChunks?.forEach((chunk) => {
      if (chunk.web?.uri) {
        sources.push(chunk.web.uri);
      }
    });

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
