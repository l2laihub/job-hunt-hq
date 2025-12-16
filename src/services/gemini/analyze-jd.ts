import { requireGemini, DEFAULT_MODEL, DEFAULT_THINKING_BUDGET } from './client';
import { fteAnalysisSchema, freelanceAnalysisSchema } from './schemas';
import { aiCache, cacheKeys } from './cache';
import type { UserProfile, JDAnalysis, FTEAnalysis, FreelanceAnalysis } from '@/src/types';
import { CACHE_TTL } from '@/src/lib/constants';

/**
 * Detect if a job description is for freelance/contract work
 */
function isFreelanceJob(jobDescription: string): boolean {
  const freelancePatterns = /upwork|freelance|contract|hourly|fixed.price|proposal|gig|project based|fiverr|toptal/i;
  return freelancePatterns.test(jobDescription);
}

/**
 * Generate a simple hash for caching
 */
function hashJD(jd: string): string {
  let hash = 0;
  for (let i = 0; i < jd.length; i++) {
    const char = jd.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}

/**
 * Analyze a job description against user profile
 */
export async function analyzeJD(
  jobDescription: string,
  profile: UserProfile,
  options?: {
    skipCache?: boolean;
    forceType?: 'fulltime' | 'freelance';
  }
): Promise<JDAnalysis> {
  const ai = requireGemini();

  // Check cache
  const jdHash = hashJD(jobDescription);
  const cacheKey = cacheKeys.analysis(jdHash);

  if (!options?.skipCache) {
    const cached = aiCache.get<JDAnalysis>(cacheKey);
    if (cached) {
      return cached;
    }
  }

  const isFreelance = options?.forceType
    ? options.forceType === 'freelance'
    : isFreelanceJob(jobDescription);

  // Build context block based on job type
  const contextBlock = isFreelance
    ? `Candidate Profile (Freelance):
       - Name: ${profile.name}
       - Headline: ${profile.headline}
       - Hourly Rate: $${profile.freelanceProfile.hourlyRate.min}-${profile.freelanceProfile.hourlyRate.max}/hr
       - Availability: ${profile.freelanceProfile.availableHours}
       - Key Skills: ${profile.technicalSkills.slice(0, 10).join(', ')}
       - USPs: ${profile.freelanceProfile.uniqueSellingPoints.join(', ') || 'Not specified'}`
    : `Candidate Profile (Full-Time):
       - Name: ${profile.name}
       - Headline: ${profile.headline}
       - Years of Experience: ${profile.yearsExperience}
       - Technical Skills: ${profile.technicalSkills.slice(0, 15).join(', ')}
       - Target Salary: $${profile.preferences.salaryRange.min.toLocaleString()}-${profile.preferences.salaryRange.max.toLocaleString()}
       - Work Style: ${profile.preferences.workStyle}
       - Recent Roles: ${profile.recentRoles.slice(0, 3).map(r => `${r.title} at ${r.company}`).join('; ')}`;

  const prompt = `You are a ${isFreelance ? 'freelance proposal strategist' : 'senior career advisor'}.

${contextBlock}

## ${isFreelance ? 'Project/Gig' : 'Job'} Description:
${jobDescription}

## Task
Analyze this ${isFreelance ? 'project' : 'job'} against the candidate's profile. Evaluate:
1. Overall fit score (0-10, be honest and critical)
2. Skills match and gaps
3. Red flags (concerning aspects)
4. Green flags (positive aspects)
${isFreelance ? '5. Proposal strategy and suggested bid' : '5. Talking points and questions to ask'}

Be specific and actionable in your analysis.`;

  try {
    const response = await ai.models.generateContent({
      model: DEFAULT_MODEL,
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: isFreelance ? freelanceAnalysisSchema : fteAnalysisSchema,
        thinkingConfig: { thinkingBudget: DEFAULT_THINKING_BUDGET },
      },
    });

    if (!response.text) {
      throw new Error('Empty response from Gemini');
    }

    const result = JSON.parse(response.text);
    const analysis: JDAnalysis = {
      ...result,
      analysisType: isFreelance ? 'freelance' : 'fulltime',
      analyzedAt: new Date().toISOString(),
    };

    // Cache the result
    aiCache.set(cacheKey, analysis, CACHE_TTL.ANALYSIS);

    return analysis;
  } catch (error) {
    console.error('JD Analysis failed:', error);
    throw new Error(
      `Failed to analyze job description: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Re-analyze with fresh data (skip cache)
 */
export async function reanalyzeJD(
  jobDescription: string,
  profile: UserProfile
): Promise<JDAnalysis> {
  return analyzeJD(jobDescription, profile, { skipCache: true });
}
