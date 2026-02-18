import { requireGemini, DEFAULT_MODEL, DEFAULT_THINKING_BUDGET } from './client';
import { parseGeminiJson } from './parse-json';
import type {
  UserProfile,
  JDAnalysis,
  CompanyResearch,
  Experience,
  PhoneScreenPrep,
  QuickReference,
  InterviewPrepSession,
} from '@/src/types';

interface GenerateQuickRefParams {
  profile: UserProfile;
  analysis?: JDAnalysis;
  research?: CompanyResearch;
  stories: Experience[];
  phoneScreenPrep?: PhoneScreenPrep;
  company: string;
  role: string;
  topStoryIds?: string[]; // Pre-selected story IDs from question matching
}

/**
 * Generate a quick reference card for interview day
 */
export async function generateQuickReference(
  params: GenerateQuickRefParams
): Promise<QuickReference> {
  const ai = requireGemini();
  const {
    profile,
    analysis,
    research,
    stories,
    phoneScreenPrep,
    company,
    role,
    topStoryIds,
  } = params;

  // Get top stories (either pre-selected or most relevant)
  const selectedStories = topStoryIds
    ? stories.filter((s) => topStoryIds.includes(s.id))
    : stories.slice(0, 5);

  const storiesContext = selectedStories
    .map(
      (s) => `"${s.title}": ${s.star.result.slice(0, 150)}...`
    )
    .join('\n');

  const prompt = `You are an interview coach. Create a concise quick reference card for interview day.

## Candidate
Name: ${profile.name}
Headline: ${profile.headline}
Experience: ${profile.yearsExperience} years
Top Skills: ${profile.technicalSkills.slice(0, 8).join(', ')}

## Target Position
Company: ${company}
Role: ${role}

## Job Analysis
${analysis ? `
Fit Score: ${analysis.fitScore}/10
Key Requirements: ${analysis.requiredSkills?.slice(0, 5).join(', ') || 'N/A'}
Matched Skills: ${analysis.matchedSkills?.slice(0, 5).join(', ') || 'N/A'}
Talking Points: ${analysis.analysisType !== 'freelance' ? (analysis as any).talkingPoints?.slice(0, 3).join('; ') : 'N/A'}
` : 'No job analysis available'}

## Company Research
${research ? `
Industry: ${research.overview.industry}
Size: ${research.overview.size}
Recent News: ${research.recentNews.slice(0, 2).map(n => n.headline).join('; ') || 'None'}
Culture: ${research.engineeringCulture.notes || 'Unknown'}
Tech Stack: ${research.engineeringCulture.knownStack?.join(', ') || 'Unknown'}
` : 'No company research available'}

## Top Stories to Use
${storiesContext || 'No stories available'}

## Existing Elevator Pitch
${phoneScreenPrep?.elevatorPitch || 'None prepared'}

## Your Task
Create a quick reference card with these sections. Keep each section VERY concise - this needs to fit on one page and be scannable in seconds.

1. **elevatorPitch**: A punchy 3-4 sentence intro (refine the existing one or create new). Should sound natural when spoken.

2. **topStories**: List of 3-5 story titles to remember (just titles, not full stories). Pick the most versatile ones.

3. **talkingPoints**: 4-5 key points to weave into answers. Format as short bullet points (5-10 words each).

4. **questionsToAsk**: 4-5 smart questions to ask the interviewer. Should show genuine curiosity and research.

5. **companyFacts**: 4-5 quick facts to reference naturally. Include recent news, tech stack, culture points.

Guidelines:
- Make the elevator pitch sound human, not robotic
- Talking points should be specific achievements with numbers
- Questions should show you researched the company
- Company facts should be things you can drop naturally in conversation`;

  const schema = {
    type: 'object' as const,
    properties: {
      elevatorPitch: { type: 'string' as const },
      topStories: {
        type: 'array' as const,
        items: { type: 'string' as const },
      },
      talkingPoints: {
        type: 'array' as const,
        items: { type: 'string' as const },
      },
      questionsToAsk: {
        type: 'array' as const,
        items: { type: 'string' as const },
      },
      companyFacts: {
        type: 'array' as const,
        items: { type: 'string' as const },
      },
    },
    required: ['elevatorPitch', 'topStories', 'talkingPoints', 'questionsToAsk', 'companyFacts'],
  };

  try {
    const response = await ai.models.generateContent({
      model: DEFAULT_MODEL,
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: schema,
        thinkingConfig: { thinkingBudget: DEFAULT_THINKING_BUDGET * 1.5 },
      },
    });

    if (!response.text) {
      throw new Error('Empty response from Gemini');
    }

    const result = parseGeminiJson<any>(response.text, { context: 'generateQuickReference' });

    // Map story titles back to IDs
    const storyTitleToId: Record<string, string> = {};
    stories.forEach((s) => {
      storyTitleToId[s.title.toLowerCase()] = s.id;
    });

    const topStoryIdsResult = (result.topStories || [])
      .map((title: string) => {
        // Try exact match first
        const story = stories.find(
          (s) => s.title.toLowerCase() === title.toLowerCase()
        );
        if (story) return story.id;

        // Try partial match
        const partialMatch = stories.find(
          (s) =>
            s.title.toLowerCase().includes(title.toLowerCase()) ||
            title.toLowerCase().includes(s.title.toLowerCase())
        );
        return partialMatch?.id;
      })
      .filter(Boolean) as string[];

    // If we didn't get good matches, use the pre-selected or first few stories
    const finalTopStories =
      topStoryIdsResult.length > 0
        ? topStoryIdsResult
        : topStoryIds || stories.slice(0, 5).map((s) => s.id);

    return {
      elevatorPitch: result.elevatorPitch || '',
      topStories: finalTopStories.slice(0, 5),
      talkingPoints: (result.talkingPoints || []).slice(0, 5),
      questionsToAsk: (result.questionsToAsk || []).slice(0, 5),
      companyFacts: (result.companyFacts || []).slice(0, 5),
      generatedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error('Generate quick reference failed:', error);
    throw new Error(
      `Failed to generate quick reference: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Generate quick reference from an existing prep session
 */
export async function generateQuickRefFromSession(
  session: InterviewPrepSession,
  profile: UserProfile,
  stories: Experience[],
  analysis?: JDAnalysis,
  research?: CompanyResearch,
  company?: string,
  role?: string
): Promise<QuickReference> {
  // Get story IDs from matched questions
  const matchedStoryIds = session.predictedQuestions
    .filter((q) => q.matchedStoryId && q.isPrepared)
    .map((q) => q.matchedStoryId!)
    .filter((id, index, arr) => arr.indexOf(id) === index) // Unique
    .slice(0, 5);

  return generateQuickReference({
    profile,
    analysis,
    research,
    stories,
    phoneScreenPrep: session.phoneScreenPrep,
    company: company || 'Unknown Company',
    role: role || 'Unknown Role',
    topStoryIds: matchedStoryIds.length > 0 ? matchedStoryIds : undefined,
  });
}
