import { requireGemini, DEFAULT_MODEL, DEFAULT_THINKING_BUDGET } from './client';
import { fteAnalysisSchema, freelanceAnalysisSchema, contractAnalysisSchema } from './schemas';
import { aiCache, cacheKeys } from './cache';
import type { UserProfile, JDAnalysis, AnalyzedJobType } from '@/src/types';
import { CACHE_TTL } from '@/src/lib/constants';

/**
 * Auto-detect job type from description (only used when no explicit type provided)
 */
function detectJobType(jobDescription: string): AnalyzedJobType {
  const jdLower = jobDescription.toLowerCase();

  // Freelance patterns - platform-specific gigs
  const freelancePatterns = /upwork|fiverr|toptal|freelancer\.com|fixed.price|proposal|gig|project.based/i;
  if (freelancePatterns.test(jdLower)) {
    return 'freelance';
  }

  // Contract patterns - W-2/1099 contracts
  const contractPatterns = /\b(contract|contractor|c2c|corp.to.corp|w-2|1099|6.month|12.month|contract.to.hire)\b/i;
  if (contractPatterns.test(jdLower)) {
    return 'contract';
  }

  // Default to fulltime
  return 'fulltime';
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
  jobTypeOrOptions?: 'fulltime' | 'contract' | 'freelance' | {
    skipCache?: boolean;
    forceType?: 'fulltime' | 'contract' | 'freelance';
  }
): Promise<JDAnalysis> {
  // Normalize options - support both direct jobType string and options object
  const options = typeof jobTypeOrOptions === 'string'
    ? { forceType: jobTypeOrOptions }
    : jobTypeOrOptions;
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

  // Determine job type: use explicit forceType, or auto-detect as fallback
  const jobType: AnalyzedJobType = options?.forceType || detectJobType(jobDescription);

  // Build context block based on job type
  const buildContextBlock = () => {
    if (jobType === 'freelance') {
      return `Candidate Profile (Freelance):
       - Name: ${profile.name}
       - Headline: ${profile.headline}
       - Hourly Rate: $${profile.freelanceProfile.hourlyRate.min}-${profile.freelanceProfile.hourlyRate.max}/hr
       - Availability: ${profile.freelanceProfile.availableHours}
       - Key Skills: ${profile.technicalSkills.slice(0, 10).join(', ')}
       - USPs: ${profile.freelanceProfile.uniqueSellingPoints.join(', ') || 'Not specified'}`;
    }

    // Full-time and Contract use similar profile data
    return `Candidate Profile (${jobType === 'contract' ? 'Contract' : 'Full-Time'}):
       - Name: ${profile.name}
       - Headline: ${profile.headline}
       - Years of Experience: ${profile.yearsExperience}
       - Technical Skills: ${profile.technicalSkills.slice(0, 15).join(', ')}
       - Target ${jobType === 'contract' ? 'Rate/Salary' : 'Salary'}: $${profile.preferences.salaryRange.min.toLocaleString()}-${profile.preferences.salaryRange.max.toLocaleString()}
       - Work Style: ${profile.preferences.workStyle}
       - Recent Roles: ${profile.recentRoles.slice(0, 3).map(r => `${r.title} at ${r.company}`).join('; ')}`;
  };

  const contextBlock = buildContextBlock();

  const getPromptDetails = () => {
    if (jobType === 'freelance') {
      return {
        role: 'freelance proposal strategist',
        descriptor: 'Project/Gig',
        tasks: '5. Proposal strategy and suggested bid',
      };
    }
    if (jobType === 'contract') {
      return {
        role: 'senior contract staffing advisor',
        descriptor: 'Contract Position',
        tasks: '5. Talking points, rate negotiation tips, and questions to ask about contract terms',
      };
    }
    return {
      role: 'senior career advisor',
      descriptor: 'Job',
      tasks: '5. Talking points and questions to ask',
    };
  };

  const promptDetails = getPromptDetails();

  const prompt = `You are a ${promptDetails.role}.

${contextBlock}

## ${promptDetails.descriptor} Description:
${jobDescription}

## Task
Analyze this ${promptDetails.descriptor.toLowerCase()} against the candidate's profile. Evaluate:
1. Overall fit score (0-10, be honest and critical)
2. Skills match and gaps
3. Red flags (concerning aspects)
4. Green flags (positive aspects)
${promptDetails.tasks}

Be specific and actionable in your analysis.`;

  // Select appropriate schema based on job type
  const getSchema = () => {
    if (jobType === 'freelance') return freelanceAnalysisSchema;
    if (jobType === 'contract') return contractAnalysisSchema;
    return fteAnalysisSchema;
  };

  try {
    const response = await ai.models.generateContent({
      model: DEFAULT_MODEL,
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: getSchema(),
        thinkingConfig: { thinkingBudget: DEFAULT_THINKING_BUDGET },
      },
    });

    if (!response.text) {
      throw new Error('Empty response from Gemini');
    }

    const result = JSON.parse(response.text);
    const analysis: JDAnalysis = {
      ...result,
      analysisType: jobType,
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
