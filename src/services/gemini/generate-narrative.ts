/**
 * AI Service: Generate Conversational Narrative from STAR
 *
 * Converts a structured STAR response into a natural, conversational narrative
 * that flows like a real interview answer.
 */

import { geminiClient, requireGemini } from './client';
import type { Experience } from '@/src/types';

export interface GenerateNarrativeParams {
  story: Experience;
  question?: string;
  targetDuration?: '1min' | '2min' | '3min';
}

/**
 * Generate a conversational narrative from a STAR-formatted story.
 * This creates a flowing answer that sounds natural when spoken.
 */
export async function generateNarrative(params: GenerateNarrativeParams): Promise<string> {
  requireGemini();

  const { story, question, targetDuration = '2min' } = params;

  const durationGuide = {
    '1min': '150-200 words, hitting only the key highlights',
    '2min': '300-400 words, with good detail and flow',
    '3min': '450-550 words, with full context and impact',
  };

  const prompt = `You are an interview coaching expert. Convert this STAR-formatted interview answer into a natural, conversational narrative that sounds authentic when spoken aloud.

${question ? `## The Interview Question\n"${question}"\n\n` : ''}## STAR Components

**Situation:**
${story.star.situation}

**Task:**
${story.star.task}

**Action:**
${story.star.action}

**Result:**
${story.star.result}

${story.metrics.primary ? `**Key Metric:** ${story.metrics.primary}` : ''}

## Instructions

Create a conversational narrative that:
1. **Flows naturally** - Use transitions like "So what I did was...", "The challenge was...", "In the end..."
2. **Sounds spoken** - Use contractions, natural pauses (indicated by "..."), and conversational phrases
3. **Keeps the key details** - Don't lose important specifics, metrics, or outcomes
4. **Target length**: ${durationGuide[targetDuration]}
5. **First person** - Use "I" statements throughout
6. **No headers or labels** - Just flowing paragraphs
7. **End strong** - Conclude with the impactful result and what you learned

Return ONLY the narrative text, no explanations or formatting.`;

  const result = await geminiClient!.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
    config: {
      temperature: 0.7,
    },
  });

  return result.text?.trim() || '';
}

/**
 * Quick narrative generation without AI - creates a basic flowing version
 * by combining STAR sections with simple transitions.
 */
export function generateQuickNarrative(star: Experience['star']): string {
  const parts: string[] = [];

  if (star.situation) {
    parts.push(star.situation);
  }

  if (star.task) {
    // Add a transition if we have a situation
    if (parts.length > 0) {
      parts.push(`My responsibility in this situation was clear: ${star.task.charAt(0).toLowerCase()}${star.task.slice(1)}`);
    } else {
      parts.push(star.task);
    }
  }

  if (star.action) {
    // Add action transition
    if (parts.length > 0) {
      parts.push(`Here's what I did: ${star.action}`);
    } else {
      parts.push(star.action);
    }
  }

  if (star.result) {
    // Add result transition
    if (parts.length > 0) {
      parts.push(`The outcome was significant: ${star.result}`);
    } else {
      parts.push(star.result);
    }
  }

  return parts.join('\n\n');
}
