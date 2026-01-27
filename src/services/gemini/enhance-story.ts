import { requireGemini, DEFAULT_MODEL, DEFAULT_THINKING_BUDGET } from './client';
import { storyEnhancementSchema } from './schemas';
import type { Experience, STAR, UserProfile, FollowUpQA } from '@/src/types';

export interface EnhanceStoryOptions {
  /**
   * Focus areas for enhancement
   * - 'full' - Complete enhancement of all aspects
   * - 'metrics' - Focus on strengthening quantifiable results
   * - 'narrative' - Focus on improving the story flow and clarity
   * - 'impact' - Focus on highlighting business/team impact
   * - 'interview-ready' - Prepare for interview delivery with talking points
   */
  focus?: 'full' | 'metrics' | 'narrative' | 'impact' | 'interview-ready';

  /**
   * Optional user profile to personalize the enhancement
   */
  profile?: UserProfile;

  /**
   * Optional target role to tailor the story for
   */
  targetRole?: string;
}

export interface EnhancedStoryResult {
  title: string;
  narrative: string;
  star: STAR;
  metrics: {
    primary?: string;
    secondary: string[];
    missing?: string[];
  };
  tags: string[];
  variations: {
    leadership?: string;
    technical?: string;
    challenge?: string;
  };
  followUpQuestions: string[];
  followUpQA: FollowUpQA[];
  coachingNotes: string;
  keyTalkingPoints: string[];
  deliveryTips: string[];
  improvementSummary: string;
}

/**
 * Enhance an existing story with AI to make it more compelling and interview-ready.
 * Works great for stories that only have basic outlines or incomplete content.
 */
export async function enhanceStory(
  story: Experience,
  options: EnhanceStoryOptions = {}
): Promise<EnhancedStoryResult> {
  const ai = requireGemini();
  const { focus = 'full', profile, targetRole } = options;

  // Build context from the current story
  const storyContext = buildStoryContext(story);
  const profileContext = profile ? buildProfileContext(profile) : '';
  const focusInstructions = getFocusInstructions(focus);

  const prompt = `You are an expert interview coach and storytelling specialist. Your task is to enhance and strengthen an existing STAR-formatted interview story.

## Current Story
${storyContext}

${profileContext ? `## Candidate Profile\n${profileContext}\n` : ''}
${targetRole ? `## Target Role: ${targetRole}\n` : ''}

## Enhancement Focus: ${focus.toUpperCase()}
${focusInstructions}

## Instructions

Enhance this story to make it more compelling, specific, and interview-ready. Follow these guidelines:

1. **Narrative**:
   - Create an enhanced conversational narrative that flows naturally when spoken aloud
   - This should be the primary interview answer - engaging, clear, and memorable
   - Use markdown formatting (**bold** for emphasis on key points)
   - Include specific details, metrics, and outcomes woven naturally into the story

2. **STAR Enhancement**:
   - Make the Situation more vivid and contextual (include team size, company context, stakes)
   - Clarify the Task with specific goals and constraints
   - Expand the Action with concrete steps, tools used, and decision-making process
   - Strengthen the Result with quantifiable metrics and business impact

3. **Metrics**:
   - Extract or infer quantifiable metrics (percentages, dollar amounts, time saved, etc.)
   - Suggest metrics that could be added if the candidate can verify them
   - Ensure primary metric is the most impressive, impactful number

4. **Interview Readiness**:
   - Provide key talking points (3-5 bullet points to remember)
   - Add delivery tips for how to tell this story effectively
   - Predict follow-up questions with suggested answers (followUpQA)
   - Create variations for different question angles (leadership, technical, challenge)

5. **Polish**:
   - Improve clarity and flow while keeping the candidate's authentic voice
   - Remove filler words and vague language
   - Add specific technical details where appropriate
   - Ensure the story has a clear beginning, middle, and end

IMPORTANT: Preserve the core truth of the story. Enhance clarity and presentation, but never fabricate achievements or inflate numbers. If metrics seem estimated, suggest the candidate verify them.

Return the enhanced story with all improvements including a polished narrative.`;

  try {
    const response = await ai.models.generateContent({
      model: DEFAULT_MODEL,
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: storyEnhancementSchema,
        thinkingConfig: { thinkingBudget: DEFAULT_THINKING_BUDGET * 2 },
        temperature: 0.7,
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
      title: result.title || story.title,
      narrative: result.narrative || '',
      star: {
        situation: result.star?.situation || story.star.situation,
        task: result.star?.task || story.star.task,
        action: result.star?.action || story.star.action,
        result: result.star?.result || story.star.result,
      },
      metrics: {
        primary: result.metrics?.primary || story.metrics.primary,
        secondary: result.metrics?.secondary || story.metrics.secondary || [],
        missing: result.metrics?.missing || [],
      },
      tags: result.suggestedTags || result.tags || story.tags || [],
      variations: result.variations || story.variations || {},
      followUpQuestions: result.followUpQuestions || story.followUpQuestions || [],
      followUpQA: result.followUpQA || [],
      coachingNotes: result.coachingNotes || '',
      keyTalkingPoints: result.keyTalkingPoints || [],
      deliveryTips: result.deliveryTips || [],
      improvementSummary: result.improvementSummary || 'Story enhanced with improved clarity and impact.',
    };
  } catch (error) {
    console.error('Story enhancement failed:', error);
    throw new Error(
      `Failed to enhance story: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Build context string from the current story
 */
function buildStoryContext(story: Experience): string {
  const parts: string[] = [];

  parts.push(`**Title:** ${story.title}`);
  parts.push('');
  parts.push('**STAR Format:**');
  parts.push(`- Situation: ${story.star.situation || '(not provided)'}`);
  parts.push(`- Task: ${story.star.task || '(not provided)'}`);
  parts.push(`- Action: ${story.star.action || '(not provided)'}`);
  parts.push(`- Result: ${story.star.result || '(not provided)'}`);

  if (story.rawInput) {
    parts.push('');
    parts.push(`**Original Notes:** ${story.rawInput}`);
  }

  if (story.metrics.primary || story.metrics.secondary.length > 0) {
    parts.push('');
    parts.push('**Current Metrics:**');
    if (story.metrics.primary) {
      parts.push(`- Primary: ${story.metrics.primary}`);
    }
    if (story.metrics.secondary.length > 0) {
      parts.push(`- Secondary: ${story.metrics.secondary.join(', ')}`);
    }
  }

  if (story.tags.length > 0) {
    parts.push('');
    parts.push(`**Tags:** ${story.tags.join(', ')}`);
  }

  if (story.coachingNotes) {
    parts.push('');
    parts.push(`**Existing Coaching Notes:** ${story.coachingNotes}`);
  }

  return parts.join('\n');
}

/**
 * Build context string from user profile
 */
function buildProfileContext(profile: UserProfile): string {
  const parts: string[] = [];

  if (profile.name) {
    parts.push(`**Name:** ${profile.name}`);
  }
  if (profile.headline) {
    parts.push(`**Current Role:** ${profile.headline}`);
  }
  if (profile.yearsExperience) {
    parts.push(`**Experience:** ${profile.yearsExperience} years`);
  }
  if (profile.technicalSkills && profile.technicalSkills.length > 0) {
    parts.push(`**Technical Skills:** ${profile.technicalSkills.slice(0, 15).join(', ')}`);
  }
  if (profile.softSkills && profile.softSkills.length > 0) {
    parts.push(`**Soft Skills:** ${profile.softSkills.slice(0, 10).join(', ')}`);
  }
  if (profile.industries && profile.industries.length > 0) {
    parts.push(`**Industries:** ${profile.industries.join(', ')}`);
  }

  // Add recent roles/experience for context
  if (profile.recentRoles && profile.recentRoles.length > 0) {
    parts.push('');
    parts.push('**Work Experience:**');
    profile.recentRoles.slice(0, 3).forEach((role) => {
      parts.push(`- ${role.title} at ${role.company} (${role.duration})`);
      if (role.highlights && role.highlights.length > 0) {
        role.highlights.slice(0, 2).forEach((h) => parts.push(`  • ${h}`));
      }
    });
  }

  // Add key achievements for context
  if (profile.keyAchievements && profile.keyAchievements.length > 0) {
    parts.push('');
    parts.push('**Key Achievements:**');
    profile.keyAchievements.slice(0, 3).forEach((achievement) => {
      const metrics = achievement.metrics ? ` (${achievement.metrics})` : '';
      parts.push(`- ${achievement.description}${metrics}`);
    });
  }

  // Add active projects for technical depth
  if (profile.activeProjects && profile.activeProjects.length > 0) {
    parts.push('');
    parts.push('**Projects:**');
    profile.activeProjects.slice(0, 3).forEach((project) => {
      const techStack = project.techStack?.length > 0 ? ` [${project.techStack.slice(0, 5).join(', ')}]` : '';
      parts.push(`- ${project.name}: ${project.description}${techStack}`);
    });
  }

  return parts.join('\n');
}

/**
 * Get focus-specific instructions
 */
function getFocusInstructions(focus: EnhanceStoryOptions['focus']): string {
  switch (focus) {
    case 'metrics':
      return `Focus heavily on extracting, strengthening, and quantifying results. Look for:
- Percentages (improved by X%, reduced by Y%)
- Dollar amounts (saved $X, generated $Y revenue)
- Time savings (reduced from X hours to Y hours)
- Scale (served X users, processed Y transactions)
- Comparisons (X times faster, Y% more efficient than previous solution)`;

    case 'narrative':
      return `Focus on story flow and clarity:
- Create a compelling hook at the beginning
- Ensure logical progression through STAR sections
- Use vivid, specific language
- Remove jargon and make it accessible
- Build tension and resolution`;

    case 'impact':
      return `Focus on business and team impact:
- Highlight how this affected the bottom line
- Show team or company-wide benefits
- Connect technical work to business outcomes
- Demonstrate leadership influence
- Show lasting changes or improvements`;

    case 'interview-ready':
      return `Prepare this story for live interview delivery:
- Create a 2-minute version and a 5-minute version
- Identify the 3-5 key points to always hit
- Add natural transition phrases
- Prepare for common follow-up questions
- Include specific names/technologies to drop`;

    case 'full':
    default:
      return `Perform a comprehensive enhancement across all dimensions:
- Strengthen all STAR sections with specificity
- Extract and highlight quantifiable metrics
- Improve narrative flow and clarity
- Add interview preparation materials
- Suggest tags and variations`;
  }
}
