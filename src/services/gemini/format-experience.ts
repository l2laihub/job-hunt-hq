import { requireGemini, DEFAULT_MODEL, DEFAULT_THINKING_BUDGET } from './client';
import { experienceSchema, matchSchema } from './schemas';
import type { Experience, UserProfile, QuestionMatch } from '@/src/types';

/**
 * Format raw experience text into STAR structure
 */
export async function formatExperience(
  rawText: string
): Promise<Omit<Experience, 'id' | 'rawInput' | 'inputMethod' | 'timesUsed' | 'createdAt' | 'updatedAt' | 'usedInInterviews'>> {
  const ai = requireGemini();

  const prompt = `You are an expert interview coach. Format this raw experience into the STAR (Situation, Task, Action, Result) structure.

## Raw Input:
${rawText}

## Instructions:
1. Create a concise, memorable title for this experience
2. Structure it into STAR format with clear, specific details
3. Identify quantifiable metrics (numbers, percentages, timeframes)
4. Suggest relevant tags for categorization
5. Provide variations for different question types
6. Note any follow-up questions an interviewer might ask
7. Add coaching notes on how to improve or strengthen this story

Be specific and help the user tell a compelling story.`;

  try {
    const response = await ai.models.generateContent({
      model: DEFAULT_MODEL,
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: experienceSchema,
        thinkingConfig: { thinkingBudget: DEFAULT_THINKING_BUDGET },
      },
    });

    if (!response.text) {
      throw new Error('Empty response from Gemini');
    }

    // Clean up response
    let jsonText = response.text;
    if (jsonText.includes('```')) {
      jsonText = jsonText.replace(/^```(json)?\s*/, '').replace(/\s*```$/, '');
    }

    const result = JSON.parse(jsonText);

    return {
      title: result.title || 'Untitled Experience',
      star: result.star || {
        situation: '',
        task: '',
        action: '',
        result: '',
      },
      metrics: result.metrics || {
        secondary: [],
      },
      tags: result.suggestedTags || result.tags || [],
      suggestedTags: result.suggestedTags || result.tags || [],
      variations: result.variations || {},
      followUpQuestions: result.followUpQuestions || [],
      coachingNotes: result.coachingNotes,
    };
  } catch (error) {
    console.error('Format experience failed:', error);
    throw new Error(
      `Failed to format experience: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Match stories to an interview question
 */
export async function matchStoriesToQuestion(
  question: string,
  stories: Experience[],
  profile: UserProfile
): Promise<{
  matches: QuestionMatch[];
  noGoodMatch: boolean;
  gapSuggestion?: string;
}> {
  const ai = requireGemini();

  if (stories.length === 0) {
    return {
      matches: [],
      noGoodMatch: true,
      gapSuggestion: 'You need to add some stories to your experience bank first.',
    };
  }

  // Prepare stories summary for the prompt
  const storiesSummary = stories.map((s, index) => ({
    index,
    id: s.id,
    title: s.title,
    tags: s.tags,
    summary: `${s.star.situation.slice(0, 100)}... → ${s.star.result.slice(0, 100)}...`,
  }));

  const prompt = `You are an interview preparation coach. Match the candidate's stories to this interview question.

## Interview Question:
"${question}"

## Candidate Profile:
- ${profile.headline}
- ${profile.yearsExperience} years of experience
- Industries: ${profile.industries.join(', ') || 'Various'}

## Available Stories:
${JSON.stringify(storiesSummary, null, 2)}

## Task:
1. Rank the top 3 most relevant stories for this question
2. For each match, provide:
   - Fit score (0-10)
   - Why this story works
   - Suggested angle to take
   - Opening line to use
3. If no story is a good match (score < 5), suggest what kind of story they should add

Be specific and practical with your suggestions.`;

  try {
    const response = await ai.models.generateContent({
      model: DEFAULT_MODEL,
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: matchSchema,
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

    // Map story indices back to IDs
    const matches: QuestionMatch[] = (result.matches || [])
      .map((m: { storyIndex: number; storyTitle: string; fitScore: number; reasoning: string; suggestedAngle?: string; openingLine?: string }) => {
        const story = stories[m.storyIndex];
        if (!story) return null;
        return {
          storyId: story.id,
          storyTitle: m.storyTitle || story.title,
          fitScore: m.fitScore,
          reasoning: m.reasoning,
          suggestedAngle: m.suggestedAngle || '',
          openingLine: m.openingLine || '',
        };
      })
      .filter((m: QuestionMatch | null): m is QuestionMatch => m !== null);

    return {
      matches,
      noGoodMatch: result.noGoodMatch || matches.every(m => m.fitScore < 5),
      gapSuggestion: result.gapSuggestion,
    };
  } catch (error) {
    console.error('Story matching failed:', error);
    throw new Error(
      `Failed to match stories: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}
