import { GoogleGenAI, Type, Schema } from "@google/genai";
import { UserProfile, JDAnalysis, FTEAnalysis, FreelanceAnalysis, CompanyResearch, Experience, QuestionMatch } from "../types";

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

const experienceSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING },
    star: {
      type: Type.OBJECT,
      properties: {
        situation: { type: Type.STRING },
        task: { type: Type.STRING },
        action: { type: Type.STRING },
        result: { type: Type.STRING }
      },
      required: ['situation', 'task', 'action', 'result']
    },
    metrics: {
      type: Type.OBJECT,
      properties: {
        primary: { type: Type.STRING },
        secondary: { type: Type.ARRAY, items: { type: Type.STRING } },
        missing: { type: Type.ARRAY, items: { type: Type.STRING } }
      }
    },
    suggestedTags: { type: Type.ARRAY, items: { type: Type.STRING } },
    variations: {
      type: Type.OBJECT,
      properties: {
        leadership: { type: Type.STRING },
        technical: { type: Type.STRING },
        challenge: { type: Type.STRING }
      }
    },
    followUpQuestions: { type: Type.ARRAY, items: { type: Type.STRING } },
    coachingNotes: { type: Type.STRING }
  },
  required: ['title', 'star', 'suggestedTags']
};

const matchSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    matches: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          storyIndex: { type: Type.INTEGER },
          storyTitle: { type: Type.STRING },
          fitScore: { type: Type.NUMBER },
          reasoning: { type: Type.STRING },
          suggestedAngle: { type: Type.STRING },
          openingLine: { type: Type.STRING }
        },
        required: ['storyIndex', 'fitScore', 'reasoning']
      }
    },
    noGoodMatch: { type: Type.BOOLEAN },
    gapSuggestion: { type: Type.STRING }
  },
  required: ['matches', 'noGoodMatch']
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

export const researchCompany = async (companyName: string, roleTitle?: string): Promise<CompanyResearch> => {
  if (!ai) throw new Error("Gemini API Key is missing.");

  const prompt = `
Research "${companyName}" for a job seeker applying to ${roleTitle || 'engineering roles'}.

Use Google Search to find current, accurate information. Focus on:

1. **Company Basics**: What they do, size, funding status, headquarters
2. **Recent News** (last 30 days): Funding, layoffs, product launches, leadership changes
3. **Engineering Culture**: Tech blog, open source presence, tech stack, remote policy
4. **Red Flags**: Any concerning news - layoffs, bad press, executive exodus, financial trouble
5. **Green Flags**: Positive signals - growth, good reviews, innovation, stability
6. **Key People**: CEO, CTO, VP Engineering, notable engineers
7. **Interview Intel**: Glassdoor ratings, interview process, salary ranges

Be specific with dates and sources. If information is uncertain or not found, say so.

Respond in this JSON format:
{
  "overview": {
    "description": "<what the company does>",
    "industry": "<industry>",
    "size": "<employee count or range>",
    "founded": "<year>",
    "headquarters": "<city, state/country>",
    "fundingStatus": "<public | private, series X | bootstrapped>",
    "lastFunding": "<amount and date if recent>"
  },
  "recentNews": [
    {
      "headline": "<news item>",
      "date": "<date>",
      "source": "<source name>",
      "sentiment": "positive" | "neutral" | "negative",
      "summary": "<1-2 sentence summary>"
    }
  ],
  "engineeringCulture": {
    "techBlog": "<URL or null>",
    "openSource": "<GitHub org URL or description>",
    "knownStack": ["<tech1>", "<tech2>"],
    "teamSize": "<estimate>",
    "remotePolicy": "<remote | hybrid | onsite | unknown>",
    "notes": "<any other culture signals>"
  },
  "redFlags": [
    {
      "flag": "<concern>",
      "detail": "<context>",
      "source": "<where you found this>",
      "severity": "low" | "medium" | "high"
    }
  ],
  "greenFlags": [
    {
      "flag": "<positive signal>",
      "detail": "<context>",
      "source": "<where you found this>"
    }
  ],
  "keyPeople": [
    {
      "name": "<name>",
      "role": "<title>",
      "linkedin": "<URL if found>",
      "notes": "<relevant background>"
    }
  ],
  "interviewIntel": {
    "glassdoorRating": "<X.X/5 or unknown>",
    "interviewDifficulty": "<easy | medium | hard | unknown>",
    "commonTopics": ["<topic1>", "<topic2>"],
    "salaryRange": "<range if found>",
    "employeeSentiment": "<summary of reviews>"
  },
  "verdict": {
    "overall": "green" | "yellow" | "red",
    "summary": "<2-3 sentence recommendation for this job seeker>",
    "topConcern": "<biggest thing to watch out for>",
    "topPositive": "<biggest reason to apply>"
  },
  "searchedAt": "<ISO timestamp>",
  "sourcesUsed": ["<source1>", "<source2>"]
}
`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }]
      }
    });

    if (!response.text) throw new Error("No response from Gemini");
    
    // Extract sources if available in grounding metadata
    const sources: string[] = [];
    if (response.candidates?.[0]?.groundingMetadata?.groundingChunks) {
      response.candidates[0].groundingMetadata.groundingChunks.forEach(chunk => {
        if (chunk.web?.uri) sources.push(chunk.web.uri);
      });
    }

    let jsonText = response.text || "{}";
    // Strip markdown code blocks if present (common when not using responseSchema)
    if (jsonText.includes("```")) {
      jsonText = jsonText.replace(/^```(json)?\s*/, "").replace(/\s*```$/, "");
    }

    const result = JSON.parse(jsonText);
    return {
      id: crypto.randomUUID(),
      companyName,
      roleContext: roleTitle,
      ...result,
      searchedAt: new Date().toISOString(),
      sourcesUsed: sources.length > 0 ? sources : (result.sourcesUsed || [])
    };

  } catch (error) {
    console.error("Research Failed:", error);
    throw error;
  }
};

export const formatExperience = async (rawText: string): Promise<Omit<Experience, 'id' | 'rawInput' | 'inputMethod' | 'timesUsed' | 'createdAt' | 'updatedAt'>> => {
  if (!ai) throw new Error("Gemini API Key is missing.");

  const prompt = `
You are an interview coach helping format a career experience into a polished STAR story.

## Raw Experience Input
${rawText}

## Your Task
1. Extract the core story and format into STAR structure
2. Identify quantifiable metrics (or suggest what to add)
3. Suggest relevant tags for categorization
4. Create 2-3 variations for different question types
5. Note any gaps that would strengthen the story

Respond in JSON according to schema.
`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: experienceSchema,
        thinkingConfig: { thinkingBudget: 1024 }
      }
    });

    if (!response.text) throw new Error("No response from Gemini");
    return JSON.parse(response.text);
  } catch (error) {
    console.error("Format Experience Failed:", error);
    throw error;
  }
};

export const matchStoriesToQuestion = async (
  question: string,
  stories: Experience[],
  profile: UserProfile
): Promise<{ matches: QuestionMatch[], noGoodMatch: boolean, gapSuggestion?: string }> => {
  if (!ai) throw new Error("Gemini API Key is missing.");

  const prompt = `
You are an interview coach matching stored experiences to an interview question.

## Interview Question
"${question}"

## Available Stories
${stories.map((s, i) => `
Story ${i}: ${s.title}
Tags: ${s.tags.join(', ')}
Summary: ${s.star.situation} ${s.star.result}
`).join('\n')}

## Candidate Profile
${profile.headline}
Targeting: ${profile.preferences.targetRoles.join(', ')}

## Your Task
1. Rank the top 3 stories that best answer this question
2. Explain why each is a good fit
3. Suggest how to angle each story for this specific question
4. If no stories fit well, say so and suggest what kind of story to add
`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: matchSchema,
        thinkingConfig: { thinkingBudget: 1024 }
      }
    });

    if (!response.text) throw new Error("No response from Gemini");
    const result = JSON.parse(response.text);
    
    // Map indices back to IDs
    const matches = result.matches.map((m: any) => ({
      ...m,
      storyId: stories[m.storyIndex]?.id || 'unknown'
    })).filter((m: any) => m.storyId !== 'unknown');

    return {
      matches,
      noGoodMatch: result.noGoodMatch,
      gapSuggestion: result.gapSuggestion
    };
  } catch (error) {
    console.error("Story Matching Failed:", error);
    throw error;
  }
};