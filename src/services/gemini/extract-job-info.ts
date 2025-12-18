import { requireGemini, DEFAULT_MODEL } from './client';
import { jobInfoExtractionSchema } from './schemas';
import type { AnalyzedJobType } from '@/src/types';

export interface ExtractedJobInfo {
  company: string;
  role: string;
  location?: string;
  salaryRange?: string;
  jobType: AnalyzedJobType;
  remote: 'remote' | 'hybrid' | 'onsite' | 'unknown';
  experienceLevel?: string;
}

/**
 * Extract structured job information from a job description using AI
 */
export async function extractJobInfo(jobDescription: string): Promise<ExtractedJobInfo> {
  const ai = requireGemini();

  const prompt = `Extract key information from this job description. Be precise and extract EXACTLY what is stated.

## Job Description:
${jobDescription.slice(0, 4000)}

## Instructions:
1. **Company Name**: Extract the EXACT company name. Look for:
   - "at [Company]" or "@ [Company]"
   - "About [Company]" sections
   - Company name in the header/title
   - "Join [Company]" or "work at [Company]"
   - Do NOT include job titles, locations, or other text - just the company name
   - If multiple companies are mentioned (e.g., recruiting agency + hiring company), prefer the actual hiring company

2. **Role/Title**: Extract the exact job title. Look for:
   - The main title at the top
   - "Position: [Title]" or "Role: [Title]"
   - The most prominent job title mentioned
   - Include level if mentioned (e.g., "Senior", "Staff", "Lead")

3. **Location**: Extract work location if mentioned (city, state, country)

4. **Salary Range**: Extract salary/compensation if mentioned (e.g., "$150,000 - $200,000")

5. **Job Type**: Determine if this is:
   - "fulltime" - permanent full-time employment
   - "contract" - W-2 contract, 1099, corp-to-corp, fixed-term
   - "freelance" - project-based, gig platforms (Upwork, Fiverr, etc.)

6. **Remote Policy**: Determine work arrangement:
   - "remote" - fully remote, work from anywhere
   - "hybrid" - mix of remote and office
   - "onsite" - office-based, in-person required
   - "unknown" - not specified

7. **Experience Level**: Extract if mentioned (e.g., "5+ years", "Senior level", "Entry level")

Return accurate information. If something is not clearly stated, use reasonable inference but prefer "unknown" over guessing.`;

  try {
    const response = await ai.models.generateContent({
      model: DEFAULT_MODEL,
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: jobInfoExtractionSchema,
      },
    });

    if (!response.text) {
      throw new Error('Empty response from Gemini');
    }

    const result = JSON.parse(response.text);

    return {
      company: result.company || 'Unknown Company',
      role: result.role || 'Unknown Role',
      location: result.location,
      salaryRange: result.salaryRange,
      jobType: result.jobType || 'fulltime',
      remote: result.remote || 'unknown',
      experienceLevel: result.experienceLevel,
    };
  } catch (error) {
    console.error('Job info extraction failed:', error);
    // Return fallback values
    return {
      company: 'Unknown Company',
      role: 'Unknown Role',
      jobType: 'fulltime',
      remote: 'unknown',
    };
  }
}
