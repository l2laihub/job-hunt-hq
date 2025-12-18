import { requireGemini, DEFAULT_MODEL, DEFAULT_THINKING_BUDGET } from './client';
import { coverLetterSchema } from './schemas';
import type { UserProfile, Experience, JDAnalysis, CoverLetterStyle } from '@/src/types';

interface GenerateCoverLetterParams {
  jobDescription: string;
  analysis: JDAnalysis;
  profile: UserProfile;
  stories: Experience[];
  style: CoverLetterStyle;
  company?: string;
  role?: string;
}

interface CoverLetterResult {
  content: string;
  keyPoints: string[];
  wordCount: number;
}

/**
 * Build context from user profile for cover letter
 */
function buildProfileContext(profile: UserProfile): string {
  const roles = profile.recentRoles
    .slice(0, 3)
    .map((r) => `- ${r.title} at ${r.company} (${r.duration}): ${r.highlights.slice(0, 2).join('; ')}`)
    .join('\n');

  const achievements = profile.keyAchievements
    .slice(0, 5)
    .map((a) => `- ${a.description} (${a.metrics || 'no metrics'})`)
    .join('\n');

  return `
Name: ${profile.name}
Headline: ${profile.headline}
Experience: ${profile.yearsExperience} years

Technical Skills: ${profile.technicalSkills.slice(0, 15).join(', ')}
Industries: ${profile.industries.join(', ')}

Recent Roles:
${roles || 'No roles listed'}

Key Achievements:
${achievements || 'No achievements listed'}

Goals: ${profile.goals.join(', ') || 'Not specified'}
`.trim();
}

/**
 * Build relevant stories context
 */
function buildStoriesContext(stories: Experience[], matchedSkills: string[]): string {
  // Filter stories that might be relevant based on tags/skills
  const relevantStories = stories
    .filter((s) =>
      s.tags.some((tag) =>
        matchedSkills.some((skill) => tag.toLowerCase().includes(skill.toLowerCase()))
      )
    )
    .slice(0, 3);

  if (relevantStories.length === 0) {
    return stories
      .slice(0, 2)
      .map((s) => `- ${s.title}: ${s.star.result.slice(0, 100)}...`)
      .join('\n');
  }

  return relevantStories
    .map((s) => `- ${s.title}: ${s.star.result.slice(0, 100)}...`)
    .join('\n');
}

/**
 * Get style-specific instructions
 */
function getStyleInstructions(style: CoverLetterStyle): string {
  const instructions: Record<CoverLetterStyle, string> = {
    professional: `
Write in a formal, polished tone suitable for established corporations.
- Use traditional business letter structure
- Focus on qualifications and track record
- Be respectful, confident, and direct
- Avoid casual language or humor
- Keep sentences structured and professional`,

    'story-driven': `
Write in an engaging narrative style that tells a compelling story.
- Open with a hook or anecdote that relates to the role
- Weave achievements into a cohesive narrative
- Show personality while remaining professional
- Connect past experiences to future contributions
- Make the reader want to know more`,

    'technical-focused': `
Write in a style that emphasizes technical expertise and problem-solving.
- Lead with relevant technical achievements
- Use specific technical terminology appropriately
- Quantify impact with metrics and data
- Show depth of technical understanding
- Reference relevant technologies and methodologies`,

    'startup-casual': `
Write in a friendly, authentic tone suitable for startups.
- Be conversational but professional
- Show genuine enthusiasm and passion
- Highlight adaptability and growth mindset
- Use active voice and dynamic language
- Let personality shine through while being appropriate`,
  };

  return instructions[style];
}

/**
 * Generate a cover letter based on job description and profile
 */
export async function generateCoverLetter(
  params: GenerateCoverLetterParams
): Promise<CoverLetterResult> {
  const ai = requireGemini();
  const { jobDescription, analysis, profile, stories, style, company, role } = params;

  const profileContext = buildProfileContext(profile);
  const matchedSkills =
    analysis.analysisType === 'freelance'
      ? analysis.matchedSkills
      : analysis.matchedSkills;

  const storiesContext = buildStoriesContext(stories, matchedSkills);
  const styleInstructions = getStyleInstructions(style);

  const prompt = `You are ghostwriting a cover letter AS the candidate (first person). Write in their authentic voice based on their profile.

## Candidate Profile
${profileContext}

## Relevant Experience Stories
${storiesContext}

## Target Position
Company: ${company || 'Not specified'}
Role: ${role || 'Not specified'}

## Job Description
${jobDescription.slice(0, 2000)}

## Analysis Summary
Fit Score: ${analysis.fitScore}/10
Matched Skills: ${matchedSkills.join(', ')}
${analysis.analysisType === 'fulltime' || analysis.analysisType === 'contract' ? `Talking Points: ${analysis.talkingPoints.slice(0, 3).join('; ')}` : ''}

## Style Instructions
${styleInstructions}

## CRITICAL: Sound Human, Not AI
You MUST avoid these AI-sounding patterns:
- NEVER use: "I am excited", "I am thrilled", "I am passionate about", "I believe", "I am confident"
- NEVER use: "leverage", "utilize", "synergy", "dynamic", "innovative", "cutting-edge", "spearhead"
- NEVER use: "Throughout my career", "In my current role", "As a [title]"
- NEVER start sentences with "I" more than 2 times in a row
- NEVER use corporate buzzwords or empty superlatives
- NEVER use the phrase "make me an ideal candidate" or "perfect fit"
- NEVER list skills in a comma-separated way ("I have experience with X, Y, and Z")

Instead:
- Use contractions naturally (I'm, I've, didn't, wasn't)
- Vary sentence length - mix short punchy sentences with longer ones
- Start some sentences with the action/result, not "I"
- Be specific and concrete - numbers, project names, real situations
- Show personality through word choice and rhythm
- Use active voice and strong verbs
- Write like you're talking to a real person, not a robot

## Your Task
Write a cover letter (250-400 words) that:
1. Opens with a specific hook - a project, a problem you solved, or why THIS company caught your attention
2. Connects 2-3 concrete achievements to what the role needs (with metrics)
3. Shows you understand their challenges and can help solve them
4. Ends with a clear, confident (not desperate) call to action

Do NOT use placeholder text like [Company Name].
Do NOT start with "Dear Hiring Manager" - use "Dear ${company || 'Hiring Team'}," or a specific name if available.

The letter should sound like it was written by a real person with opinions and personality, not generated by AI.`;

  try {
    const response = await ai.models.generateContent({
      model: DEFAULT_MODEL,
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: coverLetterSchema,
        thinkingConfig: { thinkingBudget: DEFAULT_THINKING_BUDGET },
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
      content: result.content || '',
      keyPoints: result.keyPoints || [],
      wordCount: result.wordCount || result.content?.split(/\s+/).length || 0,
    };
  } catch (error) {
    console.error('Generate cover letter failed:', error);
    throw new Error(
      `Failed to generate cover letter: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}
