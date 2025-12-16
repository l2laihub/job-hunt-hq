import { requireGemini, LIVE_MODEL } from './client';
import { feedbackSchema } from './schemas';
import { DEFAULT_MODEL, DEFAULT_THINKING_BUDGET } from './client';
import type {
  UserProfile,
  JobApplication,
  InterviewConfig,
  InterviewFeedback,
  TranscriptItem
} from '@/src/types';
import { Modality, LiveServerMessage } from '@google/genai';

interface LiveSessionCallbacks {
  onOpen?: () => void;
  onMessage?: (msg: LiveServerMessage) => void;
  onClose?: (e: CloseEvent) => void;
  onError?: (e: ErrorEvent) => void;
}

/**
 * Build the system prompt for the interview
 */
function buildInterviewPrompt(
  config: InterviewConfig,
  profile: UserProfile,
  application?: JobApplication
): string {
  // Build work history context
  const workHistory = profile.recentRoles
    .map((r) => `- ${r.title} at ${r.company} (${r.duration}):\n  ${r.highlights.join('\n  ')}`)
    .join('\n');

  const achievements = profile.keyAchievements
    .map((a) => `- ${a.description}${a.metrics ? ` (${a.metrics})` : ''}`)
    .join('\n');

  const difficultyStyle = {
    easy: 'Encouraging and helpful, provide guidance when the candidate struggles',
    medium: 'Professional and neutral, ask follow-up questions for depth',
    hard: 'Direct and probing, challenge answers, simulate high-pressure environment',
  };

  return `You are an experienced technical interviewer conducting a ${config.type} interview.

## Candidate Profile (Resume)
Name: ${profile.name}
Headline: ${profile.headline}
Experience: ${profile.yearsExperience} years
Technical Skills: ${profile.technicalSkills.slice(0, 15).join(', ')}

## Work History
${workHistory || 'No work history provided'}

## Key Achievements
${achievements || 'No achievements listed'}

## Interview Context
Target Role: ${application?.role || 'Senior Software Engineer'}
Target Company: ${application?.company || 'Tech Company'}
Interview Type: ${config.type}
Difficulty: ${config.difficulty}
Duration: ${config.duration} minutes
Focus Areas: ${config.focusAreas.join(', ')}

## Your Approach
Style: ${difficultyStyle[config.difficulty]}

## Instructions
1. Start with a brief, professional introduction (your name is Alex)
2. IMMEDIATELY ask a specific question based on their resume
   - Reference their actual experience: "I see you worked on X at Y..."
   - Start with their most recent or most relevant role
3. Ask ONE question at a time and wait for a complete response
4. Listen for vague answers and probe for specifics:
   - "Can you give me a concrete example?"
   - "What was your specific contribution?"
   - "How did you measure success?"
5. Cover the focus areas: ${config.focusAreas.join(', ')}
6. Keep your responses under 30 seconds unless explaining something complex
7. After 3-4 questions, start wrapping up with "One last question..."

## Rules
- DO NOT break character during the interview
- DO NOT provide feedback until asked to "stop interview"
- DO NOT ask multiple questions at once
- DO reference their actual experience and skills from the resume above
- If they say "stop interview" or "end session", say goodbye professionally`;
}

/**
 * Create a live interview session with Gemini
 */
export async function createLiveSession(
  config: InterviewConfig,
  profile: UserProfile,
  application?: JobApplication,
  callbacks?: LiveSessionCallbacks
) {
  const ai = requireGemini();

  const systemPrompt = buildInterviewPrompt(config, profile, application);

  return await ai.live.connect({
    model: LIVE_MODEL,
    callbacks: {
      onopen: callbacks?.onOpen,
      onmessage: callbacks?.onMessage,
      onclose: callbacks?.onClose,
      onerror: callbacks?.onError,
    },
    config: {
      systemInstruction: { parts: [{ text: systemPrompt }] },
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Charon' } },
      },
      inputAudioTranscription: {},
      outputAudioTranscription: {},
    },
  });
}

/**
 * Generate feedback for an interview based on transcript
 */
export async function generateInterviewFeedback(
  transcript: TranscriptItem[]
): Promise<InterviewFeedback> {
  const ai = requireGemini();

  // If transcript is too short, provide minimal feedback
  if (transcript.length < 2) {
    return {
      overallScore: 0,
      strengths: ['Unable to assess - interview too short'],
      weaknesses: ['Unable to assess - interview too short'],
      communication: {
        clarity: 'N/A',
        pacing: 'N/A',
        confidence: 'N/A',
      },
      summary: 'The interview was too short to provide meaningful feedback.',
    };
  }

  const transcriptText = transcript
    .map((t) => `${t.role.toUpperCase()}: ${t.text}`)
    .join('\n');

  const prompt = `You are an interview coach analyzing a mock interview transcript.

## Transcript
${transcriptText}

## Task
Provide constructive, actionable feedback for the candidate:

1. Overall score (0-10)
2. Top 3 strengths demonstrated
3. Top 3 areas for improvement
4. Communication assessment:
   - Clarity: Were answers clear and well-structured?
   - Pacing: Was the response speed appropriate?
   - Confidence: Did they sound confident?
5. If technical questions were asked: accuracy assessment
6. STAR method usage: Did they structure behavioral answers well?
7. Summary with specific recommendations

Be encouraging but honest. Focus on actionable improvements.`;

  try {
    const response = await ai.models.generateContent({
      model: DEFAULT_MODEL,
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: feedbackSchema,
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

    return JSON.parse(jsonText) as InterviewFeedback;
  } catch (error) {
    console.error('Feedback generation failed:', error);
    throw new Error(
      `Failed to generate feedback: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}
