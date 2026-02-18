import { requireGemini, DEFAULT_MODEL, DEFAULT_THINKING_BUDGET } from './client';
import { parseGeminiJson } from './parse-json';
import type { SkillGroup } from '@/src/types';

// Schema for skill categorization response
const skillCategoriesSchema = {
  type: 'object',
  properties: {
    categories: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            description: 'Category name (e.g., "Property Management", "Cloud & Infrastructure")',
          },
          skills: {
            type: 'array',
            items: { type: 'string' },
            description: 'Skills belonging to this category',
          },
        },
        required: ['name', 'skills'],
      },
    },
  },
  required: ['categories'],
};

/**
 * Use AI to intelligently categorize a list of skills into logical groups
 * Returns SkillGroup[] that can be stored in the user's profile
 */
export async function categorizeSkills(skills: string[]): Promise<SkillGroup[]> {
  if (skills.length === 0) {
    return [];
  }

  const ai = requireGemini();

  const prompt = `You are an expert resume writer and career coach. Your task is to organize a list of professional skills into logical, industry-appropriate categories.

## Skills to Categorize
${skills.join('\n- ')}

## Instructions
1. Analyze the skills and identify the professional domain(s) they belong to
2. Create 3-7 meaningful categories based on the actual skills provided
3. Each category should have a clear, professional name
4. Group related skills together logically
5. Every skill must be placed in exactly one category
6. Order categories by importance/prominence (most important first)

## Category Naming Guidelines
- Use professional, resume-appropriate names
- Examples for different domains:
  - Tech: "Languages & Frameworks", "Cloud & Infrastructure", "Databases", "AI & Machine Learning"
  - Property: "Property Management", "Compliance & Regulations", "Tenant Relations"
  - Finance: "Financial Analysis", "Accounting Software", "Reporting & Compliance"
  - General: "Project Management", "Communication", "Leadership"

## Output
Return categories with their associated skills. Each skill should appear in exactly one category.`;

  try {
    const response = await ai.models.generateContent({
      model: DEFAULT_MODEL,
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: skillCategoriesSchema,
        thinkingConfig: { thinkingBudget: DEFAULT_THINKING_BUDGET },
      },
    });

    if (!response.text) {
      throw new Error('Empty response from Gemini');
    }

    const result = parseGeminiJson<any>(response.text, { context: 'categorizeSkills' });

    // Convert to SkillGroup format with IDs and order
    const skillGroups: SkillGroup[] = result.categories.map(
      (cat: { name: string; skills: string[] }, index: number) => ({
        id: crypto.randomUUID(),
        name: cat.name,
        skills: cat.skills,
        order: index,
        isCustom: false,
      })
    );

    return skillGroups;
  } catch (error) {
    console.error('Skill categorization failed:', error);
    throw new Error('Failed to categorize skills. Please try again.');
  }
}

/**
 * Suggest additional skills for a given category based on existing skills
 */
export async function suggestSkillsForCategory(
  categoryName: string,
  existingSkills: string[],
  allProfileSkills: string[]
): Promise<string[]> {
  const ai = requireGemini();

  const prompt = `You are a career expert. Given a skill category and existing skills in that category, suggest 3-5 additional skills that would be relevant and complementary.

## Category: ${categoryName}
## Current Skills in Category: ${existingSkills.join(', ')}
## All Profile Skills (for context): ${allProfileSkills.join(', ')}

Suggest skills that:
1. Are commonly paired with the existing skills
2. Would strengthen the candidate's profile in this area
3. Are not already in the profile
4. Are specific and concrete (not generic)

Return only the skill names, one per line.`;

  try {
    const response = await ai.models.generateContent({
      model: DEFAULT_MODEL,
      contents: prompt,
    });

    if (!response.text) {
      return [];
    }

    // Parse the response - expecting newline-separated skills
    const suggestions = response.text
      .split('\n')
      .map(line => line.replace(/^[-•*]\s*/, '').trim())
      .filter(line => line.length > 0 && line.length < 50)
      .filter(skill => !allProfileSkills.includes(skill))
      .slice(0, 5);

    return suggestions;
  } catch (error) {
    console.error('Skill suggestion failed:', error);
    return [];
  }
}
