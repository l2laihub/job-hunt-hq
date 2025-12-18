import { requireGemini, DEFAULT_MODEL, DEFAULT_THINKING_BUDGET } from './client';
import { resumeEnhancementSchema } from './schemas';
import type {
  UserProfile,
  JDAnalysis,
  EnhancementMode,
  ResumeAnalysis,
  EnhancementSuggestion,
  EnhancedProfile,
  EnhancedRole,
} from '@/src/types';
import { generateId } from '@/src/lib/utils';

interface EnhanceResumeParams {
  profile: UserProfile;
  mode: EnhancementMode;
  jobDescription?: string;
  analysis?: JDAnalysis;
  company?: string;
  role?: string;
}

interface EnhancementResult {
  analysis: ResumeAnalysis;
  suggestions: EnhancementSuggestion[];
  enhancedProfile: EnhancedProfile;
}

/**
 * Build profile context for AI analysis
 */
function buildProfileContext(profile: UserProfile): string {
  const roles = profile.recentRoles
    .map((r, i) => `[${i}] ${r.title} at ${r.company} (${r.duration})\n    Highlights:\n${r.highlights.map((h) => `      - ${h}`).join('\n')}`)
    .join('\n\n');

  const achievements = profile.keyAchievements
    .map((a, i) => `[${i}] ${a.description} (${a.metrics || 'no metrics'}) [${a.storyType}]`)
    .join('\n');

  return `
## Candidate Profile

Name: ${profile.name}
Headline: ${profile.headline}
Years of Experience: ${profile.yearsExperience}
Current Situation: ${profile.currentSituation}

## Technical Skills
${profile.technicalSkills.join(', ') || 'None listed'}

## Soft Skills
${profile.softSkills.join(', ') || 'None listed'}

## Industries
${profile.industries.join(', ') || 'None listed'}

## Work Experience
${roles || 'No roles listed'}

## Key Achievements
${achievements || 'No achievements listed'}

## Active Projects
${profile.activeProjects.map((p) => `- ${p.name}: ${p.description} [${p.techStack.join(', ')}] (${p.status})`).join('\n') || 'None listed'}

## Career Goals
${profile.goals.join(', ') || 'Not specified'}

## Target Roles
${profile.preferences.targetRoles.join(', ') || 'Not specified'}
`.trim();
}

/**
 * Professional Enhancement Prompt - General improvements without a specific JD
 */
function buildProfessionalPrompt(profileContext: string, targetRole?: string): string {
  return `You are an expert resume consultant and ATS optimization specialist. Your task is to analyze a resume and provide actionable improvements.

${profileContext}

## Your Task

Analyze this resume/profile and provide:

1. **Analysis**: Score the resume (0-100) on:
   - Overall quality and presentation
   - ATS compatibility (keyword density, formatting)
   - Experience relevance for ${targetRole || 'general senior technical roles'}
   - Identify strengths and areas for improvement

2. **Suggestions**: Provide specific, actionable suggestions to improve:
   - Headline optimization for ${targetRole || 'target roles'}
   - Experience bullet points (use strong action verbs, add metrics)
   - Skills organization and prioritization
   - Achievement formatting and impact demonstration

   For each suggestion, rate the impact (high/medium/low) and explain why.

3. **Enhanced Profile**: Generate an optimized version with:
   - Improved headline
   - Reordered skills by relevance to ${targetRole || 'senior technical positions'}
   - Enhanced experience bullets with stronger action verbs and quantified results
   - Optimized achievements

## Guidelines

- Use strong action verbs: Led, Architected, Delivered, Scaled, Reduced, Increased, etc.
- Add metrics where possible: percentages, dollar amounts, team sizes, time saved
- Prioritize relevant experience and skills
- Remove weak or vague language
- Optimize for ATS keyword matching
- Keep bullets concise (1-2 lines max)
- Focus on impact and results, not just responsibilities`;
}

/**
 * Job-Tailored Enhancement Prompt - Optimize for a specific JD
 */
function buildTailoredPrompt(
  profileContext: string,
  jobDescription: string,
  analysis: JDAnalysis | undefined,
  company?: string,
  role?: string
): string {
  const analysisContext = analysis
    ? `
## Job Analysis Summary
Fit Score: ${analysis.fitScore}/10
Reasoning: ${analysis.reasoning}
Required Skills: ${analysis.analysisType !== 'freelance' ? (analysis as any).requiredSkills?.join(', ') : 'N/A'}
Matched Skills: ${analysis.matchedSkills?.join(', ') || 'N/A'}
Missing Skills: ${analysis.missingSkills?.join(', ') || 'N/A'}
${analysis.analysisType === 'fulltime' || analysis.analysisType === 'contract' ? `Talking Points: ${(analysis as any).talkingPoints?.slice(0, 3).join('; ') || 'N/A'}` : ''}
`
    : '';

  return `You are an expert resume consultant specializing in job-specific optimization. Your task is to tailor a resume to a specific job description.

${profileContext}

## Target Position
Company: ${company || 'Not specified'}
Role: ${role || 'Not specified'}

## Job Description
${jobDescription.slice(0, 3000)}
${analysisContext}

## Your Task

Analyze and optimize this resume specifically for this job:

1. **Analysis**:
   - Score resume-job fit (0-100)
   - Score ATS compatibility for this specific job (0-100)
   - Identify keywords from JD that are present vs missing
   - Rank each experience by relevance to this specific role
   - Recommend optimal order for experiences (most relevant first)

2. **Suggestions**: Provide job-specific suggestions:
   - Headline rewrite to match job title/keywords
   - Experience bullets to inject relevant keywords naturally
   - Skills to highlight vs deprioritize for this role
   - Keywords to add for ATS matching
   - Content to emphasize based on job requirements

   For each suggestion, show:
   - Original text
   - Suggested improvement
   - Why this change helps for THIS job specifically
   - Keywords being added (if any)

3. **Enhanced Profile**: Generate a job-optimized version with:
   - Tailored headline matching the job title
   - Experiences reordered by relevance to this job
   - Bullets enhanced with job-specific keywords
   - Skills reordered to match job requirements
   - Achievements that best demonstrate fit

## Guidelines

- Mirror language from the job description where natural
- Prioritize required skills mentioned in the JD
- Quantify achievements that align with job requirements
- Reorder experiences to put most relevant first
- Add missing keywords naturally (don't keyword stuff)
- Highlight transferable skills for any gaps
- Focus on what makes this candidate ideal for THIS specific role`;
}

/**
 * Enhance a resume with AI-powered suggestions
 */
export async function enhanceResume(params: EnhanceResumeParams): Promise<EnhancementResult> {
  const ai = requireGemini();
  const { profile, mode, jobDescription, analysis, company, role } = params;

  const profileContext = buildProfileContext(profile);

  const prompt =
    mode === 'professional'
      ? buildProfessionalPrompt(profileContext, profile.preferences.targetRoles[0])
      : buildTailoredPrompt(profileContext, jobDescription || '', analysis, company, role);

  try {
    const response = await ai.models.generateContent({
      model: DEFAULT_MODEL,
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: resumeEnhancementSchema,
        thinkingConfig: { thinkingBudget: DEFAULT_THINKING_BUDGET * 2 }, // Use more thinking for complex analysis
      },
    });

    if (!response.text) {
      throw new Error('Empty response from Gemini');
    }

    let jsonText = response.text;
    if (jsonText.includes('```')) {
      jsonText = jsonText.replace(/^```(json)?\s*/, '').replace(/\s*```$/, '');
    }

    const result = JSON.parse(jsonText);

    // Transform and validate the response
    const analysisResult: ResumeAnalysis = {
      overallScore: result.analysis?.overallScore || 0,
      atsScore: result.analysis?.atsScore || 0,
      strengthAreas: result.analysis?.strengthAreas || [],
      improvementAreas: result.analysis?.improvementAreas || [],
      missingKeywords: result.analysis?.missingKeywords || [],
      matchedKeywords: result.analysis?.matchedKeywords || [],
      experienceRelevance: (result.analysis?.experienceRelevance || []).map((er: any) => ({
        roleIndex: er.roleIndex,
        company: er.company || profile.recentRoles[er.roleIndex]?.company || '',
        title: er.title || profile.recentRoles[er.roleIndex]?.title || '',
        relevanceScore: er.relevanceScore,
        matchedKeywords: er.matchedKeywords || [],
        reason: er.reason || '',
      })),
      recommendedOrder: result.analysis?.recommendedOrder || profile.recentRoles.map((_, i) => i),
      skillsAnalysis: {
        strongMatch: result.analysis?.skillsAnalysis?.strongMatch || [],
        partialMatch: result.analysis?.skillsAnalysis?.partialMatch || [],
        missing: result.analysis?.skillsAnalysis?.missing || [],
        irrelevant: result.analysis?.skillsAnalysis?.irrelevant || [],
      },
      summary: result.analysis?.summary || '',
    };

    // Add IDs to suggestions
    const suggestions: EnhancementSuggestion[] = (result.suggestions || []).map((s: any) => ({
      id: generateId(),
      section: s.section,
      type: s.type,
      targetIndex: s.targetIndex,
      field: s.field,
      original: s.original || '',
      suggested: s.suggested || '',
      reason: s.reason || '',
      impact: s.impact || 'medium',
      keywords: s.keywords,
      applied: false,
    }));

    // Transform enhanced profile
    const enhancedProfile: EnhancedProfile = {
      headline: result.enhancedProfile?.headline || profile.headline,
      summary: result.enhancedProfile?.summary,
      technicalSkills: result.enhancedProfile?.technicalSkills || profile.technicalSkills,
      softSkills: result.enhancedProfile?.softSkills || profile.softSkills,
      recentRoles: (result.enhancedProfile?.recentRoles || []).map((r: any): EnhancedRole => ({
        company: r.company,
        title: r.title,
        duration: r.duration,
        highlights: r.highlights || [],
        originalIndex: r.originalIndex,
        relevanceScore: r.relevanceScore,
        enhancedHighlights: r.enhancedHighlights || r.highlights || [],
      })),
      keyAchievements: result.enhancedProfile?.keyAchievements || profile.keyAchievements,
    };

    return {
      analysis: analysisResult,
      suggestions,
      enhancedProfile,
    };
  } catch (error) {
    console.error('Resume enhancement failed:', error);
    throw new Error(
      `Failed to enhance resume: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Quick analysis without full enhancement - for faster feedback
 */
export async function analyzeResumeQuick(
  profile: UserProfile,
  jobDescription?: string
): Promise<Pick<ResumeAnalysis, 'overallScore' | 'atsScore' | 'summary' | 'improvementAreas'>> {
  const ai = requireGemini();

  const profileContext = buildProfileContext(profile);

  const prompt = `You are a resume expert. Quickly analyze this profile and provide scores and key insights.

${profileContext}

${jobDescription ? `## Target Job\n${jobDescription.slice(0, 1500)}` : ''}

Provide a quick assessment with:
1. Overall Score (0-100): Quality, clarity, impact
2. ATS Score (0-100): Keyword density, formatting
3. Summary: 2-3 sentence assessment
4. Top 3-5 improvement areas

Be concise and direct.`;

  try {
    const response = await ai.models.generateContent({
      model: DEFAULT_MODEL,
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'object' as const,
          properties: {
            overallScore: { type: 'number' as const },
            atsScore: { type: 'number' as const },
            summary: { type: 'string' as const },
            improvementAreas: { type: 'array' as const, items: { type: 'string' as const } },
          },
          required: ['overallScore', 'atsScore', 'summary', 'improvementAreas'],
        },
      },
    });

    if (!response.text) {
      throw new Error('Empty response from Gemini');
    }

    let jsonText = response.text;
    if (jsonText.includes('```')) {
      jsonText = jsonText.replace(/^```(json)?\s*/, '').replace(/\s*```$/, '');
    }

    return JSON.parse(jsonText);
  } catch (error) {
    console.error('Quick resume analysis failed:', error);
    throw new Error(
      `Failed to analyze resume: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}
