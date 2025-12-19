import { requireGemini, DEFAULT_MODEL, DEFAULT_THINKING_BUDGET } from './client';
import { topicDetailsSchema } from './schemas';
import type { TopicDetails, UserProfile, JDAnalysis } from '@/src/types';

interface TopicDetailsParams {
  topic: string;
  depth: 'basic' | 'intermediate' | 'deep';
  notes: string;
  jobDescription: string;
  analysis: JDAnalysis;
  profile: UserProfile;
  company?: string;
  role?: string;
}

/**
 * Generate detailed study materials for a technical interview topic
 * Includes key concepts, interview questions with answers, and curated resources
 */
export async function generateTopicDetails(params: TopicDetailsParams): Promise<TopicDetails> {
  const ai = requireGemini();
  const { topic, depth, notes, jobDescription, analysis, profile, company, role } = params;

  const prompt = `You are helping a candidate prepare for a technical interview. Generate comprehensive study materials for a specific topic.

## Target Position
Company: ${company || 'Not specified'}
Role: ${role || 'Not specified'}

## Job Description Context
${jobDescription.slice(0, 1500)}

## Candidate Profile
Name: ${profile.name}
Experience: ${profile.yearsExperience} years
Technical Skills: ${profile.technicalSkills.slice(0, 15).join(', ')}

## Topic to Study
Topic: ${topic}
Expected Depth: ${depth}
Context Notes: ${notes}

## Your Task
Generate comprehensive study materials for this topic tailored to the job and candidate:

1. **Key Concepts** (5-8): Essential principles and concepts they MUST understand about ${topic}. Be specific to how this applies to the target role.

2. **Interview Questions** (4-6): Real interview questions they might face, from basic to advanced:
   - Include questions that specifically relate to ${company ? company + "'s" : 'the company\'s'} tech stack or domain
   - Provide detailed answers using markdown formatting:
     - Use **bold** for key terms
     - Use bullet points for lists
     - Use \`code blocks\` for code examples
     - Use proper paragraphs for readability
   - Answers should sound like how an experienced engineer would explain things
   - Include likely follow-up questions

3. **Learning Resources** (3-5): Curated resources with REAL URLs:
   - Official documentation (MDN, React docs, etc.)
   - Quality tutorials (freeCodeCamp, official blogs)
   - Video courses (YouTube channels, Udemy)
   - Practice platforms (LeetCode, HackerRank)
   - Only include resources that actually exist

4. **Practice Notes**: Practical tips for how to practice and demonstrate this skill in an interview

## CRITICAL: Quality Standards
- Answers must be detailed enough to actually help someone learn
- Use markdown formatting to make answers scannable
- Resources must be real, working URLs (not made up)
- Questions should reflect what ${company || 'companies'} actually asks
- Tailor the difficulty to ${depth} level expectations`;

  try {
    const response = await ai.models.generateContent({
      model: DEFAULT_MODEL,
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: topicDetailsSchema,
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

    return {
      topic,
      keyConcepts: result.keyConcepts || [],
      questions: (result.questions || []).map((q: any) => ({
        question: q.question,
        difficulty: q.difficulty || 'intermediate',
        answer: q.answer,
        keyPoints: q.keyPoints || [],
        followUp: q.followUp,
      })),
      resources: (result.resources || []).map((r: any) => ({
        title: r.title,
        url: r.url,
        type: r.type || 'article',
        source: r.source,
        description: r.description,
        priority: r.priority || 'medium',
      })),
      practiceNotes: result.practiceNotes,
      practiceCount: 0,
      generatedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error('Generate topic details failed:', error);
    throw new Error(
      `Failed to generate topic details: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}
