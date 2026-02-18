import { requireGemini, DEFAULT_MODEL, DEFAULT_THINKING_BUDGET } from './client';
import { parseGeminiJson } from './parse-json';
import { fteAnalysisSchema, freelanceAnalysisSchema, contractAnalysisSchema } from './schemas';
import { aiCache, cacheKeys, hashProfileForAnalysis } from './cache';
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

  // Check cache - include profile hash to invalidate when preferences change
  const jdHash = hashJD(jobDescription);
  const profileHash = hashProfileForAnalysis(profile);
  const cacheKey = cacheKeys.analysis(jdHash, profileHash);

  if (!options?.skipCache) {
    const cached = aiCache.get<JDAnalysis>(cacheKey);
    if (cached) {
      return cached;
    }
  }

  // Determine job type: use explicit forceType, or auto-detect as fallback
  const jobType: AnalyzedJobType = options?.forceType || detectJobType(jobDescription);

  // Build comprehensive profile context
  const workHistory = profile.recentRoles.slice(0, 3).map(r =>
    `- ${r.title} at ${r.company} (${r.duration}): ${r.highlights.slice(0, 2).join('; ')}`
  ).join('\n');

  const achievements = profile.keyAchievements.slice(0, 3).map(a =>
    `- ${a.description}${a.metrics ? ` (${a.metrics})` : ''}`
  ).join('\n');

  // Build context block based on job type
  const buildContextBlock = () => {
    if (jobType === 'freelance') {
      return `## Candidate Profile (Freelance)
Name: ${profile.name}
Headline: ${profile.headline}
Hourly Rate Range: $${profile.freelanceProfile.hourlyRate.min}-${profile.freelanceProfile.hourlyRate.max}/hr
Available Hours: ${profile.freelanceProfile.availableHours}
Preferred Project Types: ${profile.freelanceProfile.preferredProjectTypes.join(', ') || 'Not specified'}
Unique Selling Points: ${profile.freelanceProfile.uniqueSellingPoints.join(', ') || 'Not specified'}
Technical Skills: ${profile.technicalSkills.join(', ')}
Industries: ${profile.industries.join(', ') || 'Various'}

## Work History
${workHistory || 'Not provided'}

## Key Achievements
${achievements || 'Not provided'}

## Career Goals
${profile.goals.join(', ') || 'Not specified'}

## Deal Breakers (Things candidate wants to avoid)
${profile.preferences.dealBreakers.join(', ') || 'None specified'}

## Constraints
${profile.constraints.join(', ') || 'None specified'}`;
    }

    // Full-time and Contract use similar profile data
    return `## Candidate Profile (${jobType === 'contract' ? 'Contract' : 'Full-Time Employment'})
Name: ${profile.name}
Headline: ${profile.headline}
Years of Experience: ${profile.yearsExperience}
Current Situation: ${profile.currentSituation || 'Open to opportunities'}

## Technical Skills
${profile.technicalSkills.join(', ')}

## Soft Skills
${profile.softSkills.join(', ') || 'Not specified'}

## Work History
${workHistory || 'Not provided'}

## Key Achievements
${achievements || 'Not provided'}

## Industries
${profile.industries.join(', ') || 'Various'}

## Career Goals
${profile.goals.join(', ') || 'Not specified'}

## Job Preferences
- Target Roles: ${profile.preferences.targetRoles.join(', ') || 'Not specified'}
- Work Style Preference: ${profile.preferences.workStyle}
- Salary Range: $${profile.preferences.salaryRange.min.toLocaleString()}-$${profile.preferences.salaryRange.max.toLocaleString()}
- Priority Factors: ${profile.preferences.priorityFactors.join(', ') || 'Not specified'}

## Deal Breakers (Things candidate wants to avoid)
${profile.preferences.dealBreakers.join(', ') || 'None specified'}

## Constraints
${profile.constraints.join(', ') || 'None specified'}`;
  };

  const contextBlock = buildContextBlock();

  const getPromptDetails = () => {
    if (jobType === 'freelance') {
      return {
        role: 'freelance proposal strategist and career advisor',
        descriptor: 'Project/Gig',
      };
    }
    if (jobType === 'contract') {
      return {
        role: 'senior contract staffing advisor and career counselor',
        descriptor: 'Contract Position',
      };
    }
    return {
      role: 'senior job search advisor and career counselor',
      descriptor: 'Job',
    };
  };

  const promptDetails = getPromptDetails();

  const prompt = `You are a ${promptDetails.role}.

${contextBlock}

## ${promptDetails.descriptor} Description:
${jobDescription}

## Your Task
Provide a COMPREHENSIVE analysis including:

1. **Fit Assessment**: Evaluate skills match, experience alignment, and overall fit (0-10 scale)

2. **Application Recommendation**: Based on ALL factors (fit, career goals, deal breakers, compensation), provide a clear verdict:
   - "strong-apply": Excellent fit (8+), no deal breakers, aligns with goals
   - "apply": Good fit (6-7), minor gaps that won't disqualify, worth pursuing
   - "consider": Moderate fit (5-6), weigh pros/cons carefully
   - "upskill-first": Low fit but role aligns with career goals, candidate should develop skills first
   - "pass": Deal breakers present, severe skill gaps, or fundamentally misaligned with goals

3. **Career Alignment**: How does this role fit the candidate's stated career goals? Will it advance their trajectory or is it a lateral/backward move?

4. **Deal Breaker Check**: CRITICAL - READ THIS CAREFULLY!

   Deal breakers are things the candidate wants to AVOID. The dealBreakerMatches array should ONLY contain items where the job ACTUALLY VIOLATES the candidate's preference.

   ✅ CORRECT - Add to dealBreakerMatches when there IS a violation:
   - Deal breaker "Pure management roles" + Job IS a pure management role → ADD (violation exists)
   - Deal breaker "Salary below $150K" + Job pays $120K → ADD (salary IS below $150K)
   - Deal breaker "On-site only" + Job requires on-site work → ADD (job IS on-site only)
   - Deal breaker "No equity" + Job has NO equity → ADD (equity IS missing)

   ❌ WRONG - Do NOT add to dealBreakerMatches when the job is GOOD:
   - Deal breaker "Pure management roles" + Job is IC-heavy coding role → NO VIOLATION (IC is good!)
   - Deal breaker "Salary below $150K" + Job pays $180K+ → NO VIOLATION ($180K > $150K is good!)
   - Deal breaker "On-site only" + Job is fully remote → NO VIOLATION (remote is good!)
   - Deal breaker "No equity" + Job offers equity → NO VIOLATION (having equity is good!)
   - Deal breaker "Architect roles with no coding" + Job has 70% coding → NO VIOLATION (coding is good!)

   If the job DOES NOT have what the candidate wants to avoid, that's a POSITIVE - put it in greenFlags instead, not dealBreakerMatches.

   The dealBreakerMatches array should be EMPTY for jobs that don't violate any deal breakers.

5. **Skill Gap Analysis**: For each missing skill, assess:
   - Severity (minor/moderate/critical)
   - Why it matters for this role
   - How long it would take to acquire
   - Suggestions for acquiring it

6. **Compensation Fit**: Does the role's compensation (if mentioned) align with candidate's expectations?

7. **Work Style Compatibility**: Does the job's work arrangement match candidate's preferences?

8. **Red Flags & Green Flags**: What should excite or concern the candidate?

9. **Actionable Next Steps**: Based on your verdict, what should the candidate do?

10. **Categorized Skills Assessment**: Organize all required skills into two categories:
    - **Must-Have Skills**: Required/essential skills that are deal-breakers if missing. For each skill, indicate if the candidate has it (isMatched) and its importance (critical/important/bonus).
    - **Nice-to-Have Skills**: Preferred/bonus skills that are beneficial but not required. Same format as must-have.
    Order skills by importance within each category.

11. **Quick Take Summary**: Generate an immediate decision helper with:
    - **headline**: A single sentence (10-15 words max) capturing the core verdict
    - **whyApply**: 2-3 concise reasons TO apply (even if verdict is "consider" or "pass" - there are always some positives)
    - **whyPass**: 2-3 concerns or reasons to hesitate
    - **nextAction**: ONE specific, actionable step the candidate should take TODAY
    - **timeToDecide**: If the role seems competitive or time-sensitive, mention urgency (e.g., "Apply within 2 days")

Be honest and direct. If this isn't a good fit, say so clearly and explain why. The candidate's time is valuable.`;

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

    const result = parseGeminiJson<any>(response.text, { context: 'analyzeJD' });
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
