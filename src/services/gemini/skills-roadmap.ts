import { requireGemini, DEFAULT_MODEL, DEFAULT_THINKING_BUDGET } from './client';
import { skillsRoadmapSchema } from './schemas';
import type { UserProfile, JDAnalysis, SkillsRoadmap } from '@/src/types';

interface SkillsRoadmapParams {
  jobDescription: string;
  analysis: JDAnalysis;
  profile: UserProfile;
  company?: string;
  role?: string;
}

/**
 * Generate a skills roadmap for aspirational jobs where the user has gaps
 * Provides learning resources, timeline, and stepping stone roles
 */
export async function generateSkillsRoadmap(params: SkillsRoadmapParams): Promise<SkillsRoadmap> {
  const { jobDescription, analysis, profile, company, role } = params;
  const ai = requireGemini();

  const prompt = `You are a career development strategist helping someone bridge skills gaps to reach their dream job.

## Current Profile
- Name: ${profile.name}
- Current Role: ${profile.headline}
- Years of Experience: ${profile.yearsExperience}
- Technical Skills: ${profile.technicalSkills.join(', ')}
- Recent Experience: ${profile.recentRoles.slice(0, 3).map(r => `${r.title} at ${r.company}`).join('; ')}

## Target Position
${role ? `Role: ${role}` : ''}
${company ? `Company: ${company}` : ''}

## Job Description
${jobDescription}

## Current Analysis Results
- Fit Score: ${analysis.fitScore}/10
- Matched Skills: ${analysis.matchedSkills?.join(', ') || 'N/A'}
- Missing Skills: ${analysis.missingSkills?.join(', ') || 'N/A'}
- Analysis: ${analysis.reasoning}

## Task
Create a comprehensive skills roadmap to help this candidate become qualified for this role. Include:

1. **Skill Gaps Analysis**: Prioritize missing skills by importance (critical, important, nice-to-have)
2. **Learning Resources**: For each skill, suggest specific courses, tutorials, books, or certifications
   - Include FREE resources when available (freeCodeCamp, YouTube, official docs)
   - Include reputable paid options (Coursera, Udemy, books)
   - Suggest hands-on practice projects
3. **Experience Gaps**: What types of experience are missing and how to gain them
4. **Stepping Stone Roles**: Intermediate positions that could help build toward this role
5. **Certifications**: Any certifications that would strengthen the candidacy
6. **Quick Wins**: Things the candidate can do immediately (this week)
7. **Milestones**: Key checkpoints with expected fit score improvement
8. **Timeline**: Realistic estimate for becoming a strong candidate

Be specific and actionable. Focus on practical, achievable steps. Prefer free resources when quality is comparable.`;

  try {
    const response = await ai.models.generateContent({
      model: DEFAULT_MODEL,
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: skillsRoadmapSchema,
        thinkingConfig: { thinkingBudget: DEFAULT_THINKING_BUDGET * 2 }, // More thinking for comprehensive roadmap
      },
    });

    if (!response.text) {
      throw new Error('Empty response from Gemini');
    }

    const result = JSON.parse(response.text);

    return {
      ...result,
      generatedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error('Skills roadmap generation failed:', error);
    throw new Error(
      `Failed to generate skills roadmap: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}
