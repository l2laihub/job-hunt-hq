import { GoogleGenAI, Type, Schema, LiveServerMessage, Modality } from "@google/genai";
import { UserProfile, JDAnalysis, FTEAnalysis, FreelanceAnalysis, CompanyResearch, Experience, QuestionMatch, InterviewConfig, JobApplication, InterviewFeedback, TranscriptItem } from "../types";

const apiKey = process.env.API_KEY;
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

// Schemas (Existing schemas preserved...)
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

const feedbackSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    overallScore: { type: Type.NUMBER },
    strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
    weaknesses: { type: Type.ARRAY, items: { type: Type.STRING } },
    communication: {
      type: Type.OBJECT,
      properties: {
        clarity: { type: Type.STRING },
        pacing: { type: Type.STRING },
        confidence: { type: Type.STRING }
      }
    },
    technicalAccuracy: { type: Type.STRING },
    starStructureUse: { type: Type.STRING },
    summary: { type: Type.STRING }
  },
  required: ['overallScore', 'strengths', 'weaknesses', 'communication', 'summary']
};

const fileToText = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsText(file);
  });
};

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1] || result;
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

export const processDocuments = async (files: File[]): Promise<UserProfile> => {
  if (!ai) throw new Error("Gemini API Key is missing.");

  const fileParts = await Promise.all(
    files.map(async (file) => {
      let mimeType = file.type;
      if (!mimeType) {
        const ext = file.name.split('.').pop()?.toLowerCase();
        if (ext === 'md') mimeType = 'text/plain';
        else if (ext === 'txt') mimeType = 'text/plain';
        else if (ext === 'pdf') mimeType = 'application/pdf';
      }

      if (mimeType === 'text/plain' || mimeType === 'text/markdown' || file.name.endsWith('.md') || file.name.endsWith('.txt')) {
        try {
            const text = await fileToText(file);
            return { text: `[File Content: ${file.name}]\n${text}\n` };
        } catch (e) {
            console.warn(`Failed to read ${file.name} as text, falling back to base64`);
        }
      }

      const base64 = await fileToBase64(file);
      return {
        inlineData: {
          mimeType: mimeType || 'application/pdf',
          data: base64
        }
      };
    })
  );

  const prompt = `
    You are analyzing documents to build a comprehensive professional profile.
    IMPORTANT: Treat "About Me" and other uploaded texts as equal sources to the Resume.
    Analyze all documents holistically. Look for technical skills, experience, achievements, goals, and freelance potential.
    If information is not available, make reasonable inferences or leave as empty array/null.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash", 
      contents: { parts: [{ text: prompt }, ...fileParts] },
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
  const isFreelance = /upwork|freelance|contract|hourly|fixed.price|proposal|gig|project based/i.test(jobDescription);

  const contextBlock = isFreelance 
    ? `Candidate Profile (Freelance): ${profile.headline}, Rate: $${profile.freelanceProfile.hourlyRate.min}-${profile.freelanceProfile.hourlyRate.max}/hr`
    : `Candidate Profile (FTE): ${profile.headline}, ${profile.yearsExperience}y exp, Skills: ${profile.technicalSkills.slice(0, 10).join(', ')}`;

  const prompt = `
    You are a ${isFreelance ? 'freelance proposal strategist' : 'job search advisor'}.
    ${contextBlock}
    ## ${isFreelance ? 'Project' : 'Job'} Description:
    ${jobDescription}
    ## Task
    Evaluate fit, skills match, red flags, and strategy.
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
      suggestedBid: { type: Type.OBJECT, properties: { hourly: { type: Type.NUMBER }, fixed: { type: Type.NUMBER }, rationale: { type: Type.STRING } } }
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
    return { ...result, analysisType: isFreelance ? 'freelance' : 'fulltime', analyzedAt: new Date().toISOString() };
  } catch (error) {
    console.error("Analysis Failed:", error);
    throw error;
  }
};

export const researchCompany = async (companyName: string, roleTitle?: string): Promise<CompanyResearch> => {
  if (!ai) throw new Error("Gemini API Key is missing.");
  const prompt = `Research "${companyName}" for a job seeker applying to ${roleTitle || 'engineering roles'}. Focus on culture, news, and interview intel.`;
  
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: { tools: [{ googleSearch: {} }] }
    });
    if (!response.text) throw new Error("No response from Gemini");

    let jsonText = response.text || "{}";
    if (jsonText.includes("```")) jsonText = jsonText.replace(/^```(json)?\s*/, "").replace(/\s*```$/, "");
    
    const result = JSON.parse(jsonText);
    const sources: string[] = [];
    response.candidates?.[0]?.groundingMetadata?.groundingChunks?.forEach(chunk => {
      if (chunk.web?.uri) sources.push(chunk.web.uri);
    });

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
  const prompt = `Format this experience into STAR (Situation, Task, Action, Result) structure. Raw Input: ${rawText}`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: { responseMimeType: "application/json", responseSchema: experienceSchema, thinkingConfig: { thinkingBudget: 1024 } }
    });
    if (!response.text) throw new Error("No response");
    let jsonText = response.text || "{}";
    if (jsonText.includes("```")) jsonText = jsonText.replace(/^```(json)?\s*/, "").replace(/\s*```$/, "");
    return JSON.parse(jsonText);
  } catch (error) {
    console.error("Format Experience Failed:", error);
    throw error;
  }
};

export const matchStoriesToQuestion = async (question: string, stories: Experience[], profile: UserProfile): Promise<{ matches: QuestionMatch[], noGoodMatch: boolean, gapSuggestion?: string }> => {
  if (!ai) throw new Error("Gemini API Key is missing.");
  const prompt = `Match stories to: "${question}". Profile: ${profile.headline}. Stories: ${JSON.stringify(stories.map(s => ({id: s.id, title: s.title, tags: s.tags, summary: s.star.situation + " " + s.star.result})))}`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: { responseMimeType: "application/json", responseSchema: matchSchema, thinkingConfig: { thinkingBudget: 1024 } }
    });
    if (!response.text) throw new Error("No response");
    let jsonText = response.text || "{}";
    if (jsonText.includes("```")) jsonText = jsonText.replace(/^```(json)?\s*/, "").replace(/\s*```$/, "");
    const result = JSON.parse(jsonText);
    const matches = (result.matches || []).map((m: any) => ({ ...m, storyId: stories[m.storyIndex]?.id || 'unknown' })).filter((m: any) => m.storyId !== 'unknown');
    return { matches, noGoodMatch: result.noGoodMatch, gapSuggestion: result.gapSuggestion };
  } catch (error) {
    console.error("Story Matching Failed:", error);
    throw error;
  }
};

// --- NEW FEATURES FOR LIVE INTERVIEW ---

export const createLiveSession = async (
  config: InterviewConfig, 
  profile: UserProfile, 
  appContext?: JobApplication,
  callbacks?: {
    onOpen?: () => void,
    onMessage?: (msg: LiveServerMessage) => void,
    onClose?: (e: CloseEvent) => void,
    onError?: (e: ErrorEvent) => void
  }
) => {
  if (!ai) throw new Error("Gemini API Key is missing.");

  // Build a richer resume context
  const workHistory = profile.recentRoles.map(r => 
    `- ${r.title} at ${r.company} (${r.duration}):\n  ${r.highlights.join('\n  ')}`
  ).join('\n');

  const achievements = profile.keyAchievements.map(a => 
    `- ${a.description} (Metrics: ${a.metrics})`
  ).join('\n');

  const systemPrompt = `
    You are an experienced technical interviewer conducting a ${config.type} interview.
    
    ## Candidate Profile (Resume)
    Name: ${profile.name}
    Headline: ${profile.headline}
    Experience: ${profile.yearsExperience} years
    Skills: ${profile.technicalSkills.join(', ')}

    ## Work History
    ${workHistory}

    ## Key Achievements
    ${achievements}

    ## Interview Context
    Target Role: ${appContext?.role || 'Senior Software Engineer'}
    Target Company: ${appContext?.company || 'Tech Company'}
    Difficulty: ${config.difficulty}
    Style: ${config.difficulty === 'easy' ? 'Encouraging and helpful' : config.difficulty === 'hard' ? 'Direct, probing, slightly pressured' : 'Professional and neutral'}

    ## Instructions
    1. Start with a brief, professional introduction.
    2. IMMEDIATELY start the interview by asking a specific technical question based on their RESUME above. 
       - For example: "I see you used ${profile.technicalSkills[0] || 'specific technologies'} at ${profile.recentRoles[0]?.company || 'your last job'}. Can you tell me about a challenge you faced with that?"
    3. Ask ONE question at a time. Wait for the candidate's full response.
    4. If the answer is vague, probe for specifics ("Can you give a concrete example?", "How did you measure that?").
    5. Cover these areas: ${config.focusAreas.join(', ')}.
    6. Keep your responses concise (under 30 seconds) unless explaining a complex technical concept.
    
    Do NOT break character. Do NOT provide feedback during the interview unless explicitly asked to "stop interview".
  `;

  return await ai.live.connect({
    model: 'gemini-2.5-flash-native-audio-preview-09-2025',
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
        voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Charon' } }
      },
      inputAudioTranscription: {},
      outputAudioTranscription: {},
    }
  });
};

export const generateInterviewFeedback = async (transcript: TranscriptItem[]): Promise<InterviewFeedback> => {
  if (!ai) throw new Error("Gemini API Key is missing.");

  const prompt = `
    Analyze this interview transcript and provide constructive feedback for the candidate.
    
    ## Transcript
    ${transcript.map(t => `${t.role.toUpperCase()}: ${t.text}`).join('\n')}

    ## Task
    Evaluate the candidate's performance based on:
    1. Clarity and communication style
    2. Technical depth/accuracy (if applicable)
    3. Use of STAR method (for behavioral questions)
    4. Strengths and Weaknesses

    Provide a JSON response.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: feedbackSchema,
        thinkingConfig: { thinkingBudget: 1024 }
      }
    });

    if (!response.text) throw new Error("No response from Gemini");
    
    let jsonText = response.text || "{}";
    if (jsonText.includes("```")) jsonText = jsonText.replace(/^```(json)?\s*/, "").replace(/\s*```$/, "");
    
    return JSON.parse(jsonText);
  } catch (error) {
    console.error("Feedback Generation Failed:", error);
    throw error;
  }
};