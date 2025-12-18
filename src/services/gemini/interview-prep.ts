import { requireGemini, DEFAULT_MODEL, DEFAULT_THINKING_BUDGET } from './client';
import { phoneScreenPrepSchema, technicalInterviewPrepSchema, applicationStrategySchema } from './schemas';
import type {
  UserProfile,
  Experience,
  JDAnalysis,
  PhoneScreenPrep,
  TechnicalInterviewPrep,
  ApplicationStrategy,
} from '@/src/types';

interface PrepGenerationParams {
  jobDescription: string;
  analysis: JDAnalysis;
  profile: UserProfile;
  stories: Experience[];
  company?: string;
  role?: string;
}

/**
 * Build profile context for interview prep
 */
function buildProfileContext(profile: UserProfile): string {
  const roles = profile.recentRoles
    .slice(0, 3)
    .map((r) => `- ${r.title} at ${r.company} (${r.duration})`)
    .join('\n');

  return `
Name: ${profile.name}
Headline: ${profile.headline}
Experience: ${profile.yearsExperience} years
Technical Skills: ${profile.technicalSkills.slice(0, 15).join(', ')}
Soft Skills: ${profile.softSkills.join(', ')}

Recent Roles:
${roles || 'No roles listed'}

Current Situation: ${profile.currentSituation}
`.trim();
}

/**
 * Build stories context with indices for matching
 */
function buildStoriesWithIndices(stories: Experience[]): string {
  return stories
    .slice(0, 10)
    .map(
      (s, i) =>
        `[${i}] ${s.title} - Tags: ${s.tags.join(', ')} - Result: ${s.star.result.slice(0, 80)}...`
    )
    .join('\n');
}

/**
 * Generate phone screen preparation materials
 */
export async function generatePhoneScreenPrep(
  params: PrepGenerationParams
): Promise<PhoneScreenPrep> {
  const ai = requireGemini();
  const { jobDescription, analysis, profile, company, role } = params;

  const profileContext = buildProfileContext(profile);

  const prompt = `You are a career coach preparing a candidate for a phone screen interview.

## Candidate Profile
${profileContext}

## Target Position
Company: ${company || 'Not specified'}
Role: ${role || 'Not specified'}

## Job Description
${jobDescription.slice(0, 2000)}

## Analysis Summary
Fit Score: ${analysis.fitScore}/10
Matched Skills: ${analysis.analysisType !== 'freelance' ? analysis.matchedSkills.join(', ') : analysis.matchedSkills.join(', ')}
Missing Skills: ${analysis.missingSkills?.join(', ') || 'None identified'}
${analysis.analysisType === 'fulltime' || analysis.analysisType === 'contract' ? `Red Flags: ${analysis.redFlags?.join('; ') || 'None'}` : ''}

## Your Task
Create comprehensive phone screen preparation including:

1. **Company Research Points**: Key facts about the company to mention naturally (research common industry knowledge)
2. **Likely Questions**: Questions they'll probably ask with suggested answers tailored to this role
3. **Questions to Ask**: Smart questions that show you've done research and are genuinely interested
4. **Talking Points**: Key achievements to weave into your answers
5. **Red Flag Responses**: How to address gaps or concerns they might have (${analysis.missingSkills?.slice(0, 3).join(', ') || 'none'})
6. **Elevator Pitch**: A compelling 30-second introduction
7. **Closing Statement**: A strong way to end the call expressing interest

Be specific to this role and company, not generic advice.`;

  try {
    const response = await ai.models.generateContent({
      model: DEFAULT_MODEL,
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: phoneScreenPrepSchema,
        thinkingConfig: { thinkingBudget: DEFAULT_THINKING_BUDGET * 1.5 },
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

    return {
      companyResearchPoints: result.companyResearchPoints || [],
      likelyQuestions: result.likelyQuestions || [],
      questionsToAsk: result.questionsToAsk || [],
      talkingPoints: result.talkingPoints || [],
      redFlagResponses: result.redFlagResponses || [],
      elevatorPitch: result.elevatorPitch || '',
      closingStatement: result.closingStatement || '',
      generatedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error('Generate phone screen prep failed:', error);
    throw new Error(
      `Failed to generate phone screen prep: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Generate technical interview preparation materials
 */
export async function generateTechnicalInterviewPrep(
  params: PrepGenerationParams
): Promise<TechnicalInterviewPrep> {
  const ai = requireGemini();
  const { jobDescription, analysis, profile, stories, company, role } = params;

  const profileContext = buildProfileContext(profile);
  const storiesContext = buildStoriesWithIndices(stories);

  const prompt = `You are a technical interview coach preparing a candidate for technical interviews.

## Candidate Profile
${profileContext}

## Available Stories (with indices)
${storiesContext || 'No stories available'}

## Target Position
Company: ${company || 'Not specified'}
Role: ${role || 'Not specified'}

## Job Description
${jobDescription.slice(0, 2000)}

## Analysis Summary
Fit Score: ${analysis.fitScore}/10
Required Skills: ${analysis.analysisType !== 'freelance' ? analysis.requiredSkills?.join(', ') : analysis.requiredSkills?.join(', ')}
Matched Skills: ${analysis.matchedSkills?.join(', ')}
Missing Skills: ${analysis.missingSkills?.join(', ') || 'None'}

## Your Task
Create comprehensive technical interview preparation:

1. **Focus Areas**: Main technical areas to study based on job requirements
2. **Likely Topics**: Specific topics they'll test, with depth level (basic/intermediate/deep) and key notes
3. **Relevant Stories**: Story indices that best demonstrate technical competence (use actual indices from list above)
4. **System Design Topics**: If senior role, what system design topics might come up
5. **Coding Patterns**: Common algorithms/patterns to review
6. **Behavioral Questions**: Technical behavioral questions with recommended story index and approach
7. **Study Resources**: Specific resources with priority (high/medium/low)
8. **Practice Problems**: Specific problems or exercises to practice

Be specific to the tech stack and role level. Reference actual story indices where relevant.`;

  try {
    const response = await ai.models.generateContent({
      model: DEFAULT_MODEL,
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: technicalInterviewPrepSchema,
        thinkingConfig: { thinkingBudget: DEFAULT_THINKING_BUDGET * 2 },
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

    // Map story indices to IDs
    const relevantStoryIds = (result.relevantStoryIndices || [])
      .map((idx: number) => stories[idx]?.id)
      .filter(Boolean);

    return {
      focusAreas: result.focusAreas || [],
      likelyTopics: result.likelyTopics || [],
      relevantStoryIds,
      systemDesignTopics: result.systemDesignTopics || [],
      codingPatterns: result.codingPatterns || [],
      behavioralQuestions: (result.behavioralQuestions || []).map((q: any) => ({
        question: q.question,
        recommendedStoryId: q.recommendedStoryIndex !== undefined ? stories[q.recommendedStoryIndex]?.id : undefined,
        suggestedApproach: q.suggestedApproach,
      })),
      studyResources: result.studyResources || [],
      practiceProblems: result.practiceProblems || [],
      generatedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error('Generate technical interview prep failed:', error);
    throw new Error(
      `Failed to generate technical interview prep: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Generate application strategy and fit assessment
 */
export async function generateApplicationStrategy(
  params: PrepGenerationParams
): Promise<ApplicationStrategy> {
  const ai = requireGemini();
  const { jobDescription, analysis, profile, company, role } = params;

  const profileContext = buildProfileContext(profile);

  const prompt = `You are a career strategist helping a candidate decide whether to apply and how to maximize their chances.

## Candidate Profile
${profileContext}

Salary Expectations: $${profile.preferences.salaryRange.min.toLocaleString()} - $${profile.preferences.salaryRange.max.toLocaleString()}
Work Style Preference: ${profile.preferences.workStyle}
Deal Breakers: ${profile.preferences.dealBreakers.join(', ') || 'None specified'}

## Target Position
Company: ${company || 'Not specified'}
Role: ${role || 'Not specified'}

## Job Description
${jobDescription.slice(0, 2000)}

## Analysis Summary
Fit Score: ${analysis.fitScore}/10
Reasoning: ${analysis.reasoning}
Matched Skills: ${analysis.matchedSkills?.join(', ')}
Missing Skills: ${analysis.missingSkills?.join(', ') || 'None'}
Red Flags: ${analysis.redFlags?.join('; ') || 'None'}
Green Flags: ${analysis.greenFlags?.join('; ') || 'None'}

## Your Task
Provide a comprehensive application strategy:

1. **Fit Assessment**:
   - Overall score and honest summary
   - Specific strengths for this role
   - Gaps to address
   - Any deal breakers (be honest if this isn't a good fit)
   - Competitiveness rating (strong/moderate/weak)

2. **Application Timing**: When to apply and why (consider company hiring cycles, urgency signals)

3. **Customization Tips**: Specific ways to tailor resume and cover letter

4. **Networking Opportunities**: Ways to get a referral or connect with people at the company

5. **Salary Negotiation Notes**: Based on the role and candidate's profile

6. **Application Checklist**: Required, recommended, and optional items to complete

7. **Follow-up Strategy**: How and when to follow up after applying

Be honest and specific. If this isn't a good fit, say so.`;

  try {
    const response = await ai.models.generateContent({
      model: DEFAULT_MODEL,
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: applicationStrategySchema,
        thinkingConfig: { thinkingBudget: DEFAULT_THINKING_BUDGET * 1.5 },
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

    return {
      fitAssessment: {
        score: result.fitAssessment?.score ?? analysis.fitScore,
        summary: result.fitAssessment?.summary || '',
        strengths: result.fitAssessment?.strengths || [],
        gaps: result.fitAssessment?.gaps || [],
        dealBreakers: result.fitAssessment?.dealBreakers || [],
        competitiveness: result.fitAssessment?.competitiveness || 'moderate',
      },
      applicationTiming: result.applicationTiming || '',
      customizationTips: result.customizationTips || [],
      networkingOpportunities: result.networkingOpportunities || [],
      salaryNegotiationNotes: result.salaryNegotiationNotes || [],
      applicationChecklist: result.applicationChecklist || [],
      followUpStrategy: result.followUpStrategy || '',
      generatedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error('Generate application strategy failed:', error);
    throw new Error(
      `Failed to generate application strategy: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}
