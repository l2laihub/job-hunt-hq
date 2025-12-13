import { GoogleGenAI, Type, Schema } from "@google/genai";
import { UserProfile, JDAnalysis, FTEAnalysis, FreelanceAnalysis } from "../types";

const apiKey = process.env.API_KEY;
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

// Schemas
const profileSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    name: { type: Type.STRING },
    headline: { type: Type.STRING },
    yearsExperience: { type: Type.NUMBER },
    technicalSkills: { type: Type.ARRAY, items: { type: Type.STRING } },
    softSkills: { type: Type.ARRAY, items: { type: Type.STRING } },
    industries: { type: Type.ARRAY, items: { type: Type.STRING } },
    keyAchievements: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          description: { type: Type.STRING },
          metrics: { type: Type.STRING },
          skills: { type: Type.ARRAY, items: { type: Type.STRING } },
          storyType: { type: Type.STRING, enum: ['technical', 'leadership', 'impact', 'collaboration'] }
        }
      }
    },
    recentRoles: {
      type: Type.ARRAY,
      description: "Professional experience from Resume OR About Me docs. Include freelance work, consulting engagements, and significant contract roles here.",
      items: {
        type: Type.OBJECT,
        properties: {
          company: { type: Type.STRING },
          title: { type: Type.STRING },
          duration: { type: Type.STRING },
          highlights: { type: Type.ARRAY, items: { type: Type.STRING } }
        }
      }
    },
    currentSituation: { type: Type.STRING },
    goals: { type: Type.ARRAY, items: { type: Type.STRING } },
    constraints: { type: Type.ARRAY, items: { type: Type.STRING } },
    activeProjects: {
      type: Type.ARRAY,
      description: "Side projects, businesses, or products. Can include freelance business entities if they are product/service based.",
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          description: { type: Type.STRING },
          techStack: { type: Type.ARRAY, items: { type: Type.STRING } },
          status: { type: Type.STRING, enum: ['active', 'launched', 'paused'] },
          traction: { type: Type.STRING }
        }
      }
    },
    preferences: {
      type: Type.OBJECT,
      properties: {
        targetRoles: { type: Type.ARRAY, items: { type: Type.STRING } },
        workStyle: { type: Type.STRING, enum: ['remote', 'hybrid', 'onsite', 'flexible'] },
        salaryRange: { type: Type.OBJECT, properties: { min: { type: Type.NUMBER }, max: { type: Type.NUMBER } } },
        dealBreakers: { type: Type.ARRAY, items: { type: Type.STRING } },
        priorityFactors: { type: Type.ARRAY, items: { type: Type.STRING } }
      }
    },
    freelanceProfile: {
      type: Type.OBJECT,
      properties: {
        hourlyRate: { type: Type.OBJECT, properties: { min: { type: Type.NUMBER }, max: { type: Type.NUMBER } } },
        availableHours: { type: Type.STRING },
        preferredProjectTypes: { type: Type.ARRAY, items: { type: Type.STRING } },
        uniqueSellingPoints: { type: Type.ARRAY, items: { type: Type.STRING } }
      }
    }
  },
  required: ['name', 'headline', 'yearsExperience', 'technicalSkills', 'recentRoles']
};

// Helper for file conversion
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
  });
};

const fileToText = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsText(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
  });
};

export const processDocuments = async (files: File[]): Promise<UserProfile> => {
  if (!ai) throw new Error("Gemini API Key is missing.");

  const fileParts = await Promise.all(
    files.map(async (file) => {
      let mimeType = file.type;

      // Fix empty MIME types (common with .md, .ts, etc on some systems)
      if (!mimeType) {
        const ext = file.name.split('.').pop()?.toLowerCase();
        if (ext === 'md') mimeType = 'text/plain';
        else if (ext === 'txt') mimeType = 'text/plain';
        else if (ext === 'pdf') mimeType = 'application/pdf';
      }

      // Handle text files as text parts
      if (mimeType === 'text/plain' || mimeType === 'text/markdown' || file.name.endsWith('.md') || file.name.endsWith('.txt')) {
        try {
            const text = await fileToText(file);
            return {
                text: `[File Content: ${file.name}]\n${text}\n`
            };
        } catch (e) {
            console.warn(`Failed to read ${file.name} as text, falling back to base64`);
        }
      }

      // Handle binary files (PDF)
      const base64 = await fileToBase64(file);
      return {
        inlineData: {
          mimeType: mimeType || 'application/pdf', // Fallback to PDF if unknown, to avoid empty string error
          data: base64
        }
      };
    })
  );

  const prompt = `
    You are analyzing documents to build a comprehensive professional profile.
    
    IMPORTANT: Treat "About Me" and other uploaded texts as equal sources to the Resume.
    - If the user mentions "Freelance Work", "Consulting", or "Side Business" in the About Me doc, you MUST extract it.
    - Map freelance/contract work to 'recentRoles' if it involves specific clients or significant duration.
    - Map product/business building to 'activeProjects'.
    - Infer 'freelanceProfile' settings (rates, hours) from these texts if mentioned.

    Analyze all documents holistically. Look for:
    1. Technical skills (be specific)
    2. Years of experience and progression
    3. Quantified achievements
    4. Current situation and constraints
    5. Active side projects or businesses with traction (include freelance/consulting here if it fits better than roles)
    6. Career goals and preferences
    7. What makes this person unique for both FTE and freelance
    
    If information isn't available, make reasonable inferences or leave as empty array/null.
    For salary and rates, infer from experience level if not stated.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash", 
      contents: {
        parts: [
          { text: prompt },
          ...fileParts
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: profileSchema,
        thinkingConfig: { thinkingBudget: 2048 }
      }
    });

    if (!response.text) throw new Error("No response from Gemini");
    return JSON.parse(response.text) as UserProfile;
  } catch (error) {
    console.error("Document Processing Failed:", error);
    throw error;
  }
};

export const analyzeJD = async (jobDescription: string, profile: UserProfile): Promise<JDAnalysis> => {
  if (!ai) throw new Error("Gemini API Key is missing.");

  // Auto-detect context
  const isFreelance = /upwork|freelance|contract|hourly|fixed.price|proposal|gig|project based/i.test(jobDescription);

  const contextBlock = isFreelance 
    ? `
    ## Candidate Profile (Freelance Context)
    - ${profile.headline}
    - Hourly Rate: $${profile.freelanceProfile.hourlyRate.min}-${profile.freelanceProfile.hourlyRate.max}
    - Availability: ${profile.freelanceProfile.availableHours}
    - Preferred Projects: ${profile.freelanceProfile.preferredProjectTypes.join(', ')}
    - USPs: ${profile.freelanceProfile.uniqueSellingPoints.join('; ')}
    - Relevant Tech: ${profile.technicalSkills.join(', ')}
    - Active Projects: ${profile.activeProjects.map(p => `${p.name} (${p.traction || p.status})`).join(', ')}
    `
    : `
    ## Candidate Profile (Full-Time Context)  
    - ${profile.headline}
    - ${profile.yearsExperience} years experience
    - Target: ${profile.preferences.targetRoles.join(', ')}
    - Salary Range: $${profile.preferences.salaryRange.min.toLocaleString()}-${profile.preferences.salaryRange.max.toLocaleString()}
    - Work Style: ${profile.preferences.workStyle}
    - Must Have: ${profile.preferences.priorityFactors.join(', ')}
    - Deal Breakers: ${profile.preferences.dealBreakers.join(', ')}
    - Key Skills: ${profile.technicalSkills.slice(0, 15).join(', ')}
    - Current Situation: ${profile.currentSituation}
    `;

  const prompt = `
    You are a ${isFreelance ? 'freelance proposal strategist' : 'job search advisor'}.
    ${contextBlock}

    ## ${isFreelance ? 'Project Posting' : 'Job Description'} to Analyze
    ${jobDescription}

    ## Your Task
    ${isFreelance 
      ? 'Evaluate this freelance opportunity. Consider: Is the scope clear? Is the budget reasonable? Does it match the candidate\'s expertise? What\'s the winning angle for the proposal?'
      : 'Evaluate this job opportunity. Consider: Skills match, role type (IC vs management), culture signals, and how to position the candidate\'s unique background.'}
  `;

  // We define partial schemas for flexibility or rely on JSON structure prompt for specific varying fields.
  // Given the complexity of union types in responseSchema, we'll use a loose object schema 
  // but prompt for specific fields in the text or let the model infer based on instructions.
  // Ideally, we'd swap schemas.
  
  const fteSchema: Schema = {
    type: Type.OBJECT,
    properties: {
      fitScore: { type: Type.NUMBER },
      reasoning: { type: Type.STRING },
      requiredSkills: { type: Type.ARRAY, items: { type: Type.STRING } },
      matchedSkills: { type: Type.ARRAY, items: { type: Type.STRING } },
      missingSkills: { type: Type.ARRAY, items: { type: Type.STRING } },
      roleType: { type: Type.STRING, enum: ['IC-heavy', 'balanced', 'management-heavy'] },
      redFlags: { type: Type.ARRAY, items: { type: Type.STRING } },
      greenFlags: { type: Type.ARRAY, items: { type: Type.STRING } },
      talkingPoints: { type: Type.ARRAY, items: { type: Type.STRING } },
      questionsToAsk: { type: Type.ARRAY, items: { type: Type.STRING } },
      salaryAssessment: { type: Type.STRING }
    },
    required: ['fitScore', 'reasoning', 'roleType', 'requiredSkills', 'matchedSkills']
  };

  const freelanceSchema: Schema = {
    type: Type.OBJECT,
    properties: {
      fitScore: { type: Type.NUMBER },
      reasoning: { type: Type.STRING },
      projectType: { type: Type.STRING, enum: ['fixed-price', 'hourly', 'retainer'] },
      estimatedEffort: { type: Type.STRING },
      requiredSkills: { type: Type.ARRAY, items: { type: Type.STRING } },
      matchedSkills: { type: Type.ARRAY, items: { type: Type.STRING } },
      missingSkills: { type: Type.ARRAY, items: { type: Type.STRING } },
      redFlags: { type: Type.ARRAY, items: { type: Type.STRING } },
      greenFlags: { type: Type.ARRAY, items: { type: Type.STRING } },
      proposalAngle: { type: Type.STRING },
      openingHook: { type: Type.STRING },
      relevantExperience: { type: Type.ARRAY, items: { type: Type.STRING } },
      questionsForClient: { type: Type.ARRAY, items: { type: Type.STRING } },
      suggestedBid: {
        type: Type.OBJECT,
        properties: {
          hourly: { type: Type.NUMBER },
          fixed: { type: Type.NUMBER },
          rationale: { type: Type.STRING }
        }
      }
    },
    required: ['fitScore', 'reasoning', 'proposalAngle', 'openingHook', 'suggestedBid']
  };

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: isFreelance ? freelanceSchema : fteSchema,
        thinkingConfig: { thinkingBudget: 1024 }
      }
    });

    if (!response.text) throw new Error("No response from Gemini");

    const result = JSON.parse(response.text);
    return {
      ...result,
      analysisType: isFreelance ? 'freelance' : 'fulltime',
      analyzedAt: new Date().toISOString()
    };
  } catch (error) {
    console.error("Analysis Failed:", error);
    throw error;
  }
};