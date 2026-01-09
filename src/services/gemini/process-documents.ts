import { requireGemini, DEFAULT_MODEL, MAX_THINKING_BUDGET } from './client';
import { profileSchema } from './schemas';
import type { UserProfile } from '@/src/types';
import { readFileAsText, readFileAsBase64 } from '@/src/lib/utils';
import mammoth from 'mammoth';

/**
 * Determine the MIME type of a file
 */
function getMimeType(file: File): string {
  if (file.type) return file.type;

  const ext = file.name.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'md':
    case 'txt':
      return 'text/plain';
    case 'pdf':
      return 'application/pdf';
    case 'docx':
      return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    default:
      return 'application/octet-stream';
  }
}

/**
 * Check if file should be read as text
 */
function isTextFile(mimeType: string, fileName: string): boolean {
  return (
    mimeType === 'text/plain' ||
    mimeType === 'text/markdown' ||
    fileName.endsWith('.md') ||
    fileName.endsWith('.txt')
  );
}

/**
 * Check if file is a DOCX file
 */
function isDocxFile(mimeType: string, fileName: string): boolean {
  return (
    mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    fileName.toLowerCase().endsWith('.docx')
  );
}

/**
 * Extract text from a DOCX file using mammoth
 */
async function extractTextFromDocx(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer });
  return result.value;
}

/**
 * Process uploaded documents to extract profile information
 */
export async function processDocuments(files: File[]): Promise<UserProfile> {
  const ai = requireGemini();

  if (files.length === 0) {
    throw new Error('No files provided');
  }

  // Process files into parts for the API
  const fileParts = await Promise.all(
    files.map(async (file) => {
      const mimeType = getMimeType(file);

      // For text files, read as text directly
      if (isTextFile(mimeType, file.name)) {
        try {
          const text = await readFileAsText(file);
          return { text: `[File: ${file.name}]\n${text}\n` };
        } catch (error) {
          console.warn(`Failed to read ${file.name} as text, falling back to base64`);
        }
      }

      // For DOCX files, extract text using mammoth (Gemini doesn't support DOCX directly)
      if (isDocxFile(mimeType, file.name)) {
        try {
          const text = await extractTextFromDocx(file);
          return { text: `[File: ${file.name}]\n${text}\n` };
        } catch (error) {
          console.error(`Failed to extract text from DOCX ${file.name}:`, error);
          throw new Error(`Failed to read DOCX file: ${file.name}. Please try saving as PDF or TXT.`);
        }
      }

      // For binary files (PDF only - DOCX handled above), use base64
      const base64 = await readFileAsBase64(file);
      return {
        inlineData: {
          mimeType: mimeType || 'application/pdf',
          data: base64,
        },
      };
    })
  );

  const prompt = `You are analyzing documents to build a comprehensive professional profile for job searching.

## Instructions:
1. Extract all relevant professional information from the uploaded documents
2. Treat ALL documents equally - a personal "About Me" or portfolio description is as valuable as a formal resume
3. Look for:
   - Personal information (name, headline/title)
   - Technical and soft skills
   - Work experience and roles
   - Key achievements with metrics
   - Side projects and their status
   - Career goals and preferences
   - Any freelance/consulting experience

## CRITICAL - Skill Extraction Rules:
- technicalSkills must be an array of INDIVIDUAL skills, NOT grouped or categorized strings
- Each skill should be a single technology, tool, framework, or concept
- CORRECT: ["Python", "TypeScript", "React", "AWS", "Docker", "GraphRAG", "LLM Integration"]
- WRONG: ["Programming: Python, TypeScript, React", "Cloud: AWS, Docker"]
- WRONG: ["AI/ML & Generative AI: LLM Integration, GraphRAG, RAG Systems"]
- Extract each skill separately even if they appear grouped in the source document
- Do not include category labels or prefixes in skill names

## Important:
- Be thorough - capture ALL skills mentioned, even if they seem minor
- Infer reasonable values where explicit information is missing
- For years of experience, estimate based on work history
- For salary expectations, leave at defaults if not mentioned
- Include both full-time AND freelance/contract work in recent roles

Analyze the documents and extract a complete profile.`;

  try {
    const response = await ai.models.generateContent({
      model: DEFAULT_MODEL,
      contents: { parts: [{ text: prompt }, ...fileParts] },
      config: {
        responseMimeType: 'application/json',
        responseSchema: profileSchema,
        thinkingConfig: { thinkingBudget: MAX_THINKING_BUDGET },
      },
    });

    if (!response.text) {
      throw new Error('Empty response from Gemini');
    }

    let jsonText = response.text;
    if (jsonText.includes('```')) {
      jsonText = jsonText.replace(/^```(json)?\s*/, '').replace(/\s*```$/, '');
    }

    const profile = JSON.parse(jsonText) as UserProfile;

    // Ensure required fields have defaults
    return {
      ...profile,
      name: profile.name || 'Unknown',
      headline: profile.headline || 'Professional',
      yearsExperience: profile.yearsExperience || 0,
      technicalSkills: profile.technicalSkills || [],
      softSkills: profile.softSkills || [],
      industries: profile.industries || [],
      keyAchievements: profile.keyAchievements || [],
      recentRoles: profile.recentRoles || [],
      currentSituation: profile.currentSituation || '',
      goals: profile.goals || [],
      constraints: profile.constraints || [],
      activeProjects: profile.activeProjects || [],
      preferences: {
        targetRoles: profile.preferences?.targetRoles || [],
        workStyle: profile.preferences?.workStyle || 'flexible',
        salaryRange: profile.preferences?.salaryRange || { min: 100000, max: 200000 },
        dealBreakers: profile.preferences?.dealBreakers || [],
        priorityFactors: profile.preferences?.priorityFactors || [],
      },
      freelanceProfile: {
        hourlyRate: profile.freelanceProfile?.hourlyRate || { min: 50, max: 150 },
        availableHours: profile.freelanceProfile?.availableHours || 'Flexible',
        preferredProjectTypes: profile.freelanceProfile?.preferredProjectTypes || [],
        uniqueSellingPoints: profile.freelanceProfile?.uniqueSellingPoints || [],
      },
    };
  } catch (error) {
    console.error('Document processing failed:', error);
    throw new Error(
      `Failed to process documents: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}
