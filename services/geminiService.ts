import { GoogleGenAI, Type, Schema, LiveServerMessage, Modality } from "@google/genai";
import { UserProfile, JDAnalysis, FTEAnalysis, FreelanceAnalysis, CompanyResearch, Experience, QuestionMatch, InterviewConfig, JobApplication, InterviewFeedback, TranscriptItem, Project, ProjectDocumentation } from "../types";

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

  // Build comprehensive profile context
  const workHistory = profile.recentRoles.slice(0, 3).map(r =>
    `- ${r.title} at ${r.company} (${r.duration}): ${r.highlights.slice(0, 2).join('; ')}`
  ).join('\n');

  const achievements = profile.keyAchievements.slice(0, 3).map(a =>
    `- ${a.description}${a.metrics ? ` (${a.metrics})` : ''}`
  ).join('\n');

  const contextBlock = isFreelance
    ? `## Candidate Profile (Freelance)
Name: ${profile.name}
Headline: ${profile.headline}
Hourly Rate Range: $${profile.freelanceProfile.hourlyRate.min}-${profile.freelanceProfile.hourlyRate.max}/hr
Available Hours: ${profile.freelanceProfile.availableHours}
Preferred Project Types: ${profile.freelanceProfile.preferredProjectTypes.join(', ') || 'Not specified'}
Unique Selling Points: ${profile.freelanceProfile.uniqueSellingPoints.join(', ') || 'Not specified'}
Technical Skills: ${profile.technicalSkills.join(', ')}
Industries: ${profile.industries.join(', ') || 'Various'}

## Work History
${workHistory || 'Not provided'}

## Key Achievements
${achievements || 'Not provided'}

## Career Goals
${profile.goals.join(', ') || 'Not specified'}

## Deal Breakers (Things candidate wants to avoid)
${profile.preferences.dealBreakers.join(', ') || 'None specified'}

## Constraints
${profile.constraints.join(', ') || 'None specified'}`
    : `## Candidate Profile (Full-Time Employment)
Name: ${profile.name}
Headline: ${profile.headline}
Years of Experience: ${profile.yearsExperience}
Current Situation: ${profile.currentSituation || 'Open to opportunities'}

## Technical Skills
${profile.technicalSkills.join(', ')}

## Soft Skills
${profile.softSkills.join(', ') || 'Not specified'}

## Work History
${workHistory || 'Not provided'}

## Key Achievements
${achievements || 'Not provided'}

## Industries
${profile.industries.join(', ') || 'Various'}

## Career Goals
${profile.goals.join(', ') || 'Not specified'}

## Job Preferences
- Target Roles: ${profile.preferences.targetRoles.join(', ') || 'Not specified'}
- Work Style Preference: ${profile.preferences.workStyle}
- Salary Range: $${profile.preferences.salaryRange.min.toLocaleString()}-$${profile.preferences.salaryRange.max.toLocaleString()}
- Priority Factors: ${profile.preferences.priorityFactors.join(', ') || 'Not specified'}

## Deal Breakers (Things candidate wants to avoid)
${profile.preferences.dealBreakers.join(', ') || 'None specified'}

## Constraints
${profile.constraints.join(', ') || 'None specified'}`;

  const prompt = `
You are an expert ${isFreelance ? 'freelance proposal strategist and career advisor' : 'job search advisor and career counselor'}.

${contextBlock}

## ${isFreelance ? 'Project' : 'Job'} Description:
${jobDescription}

## Your Task
Provide a COMPREHENSIVE analysis including:

1. **Fit Assessment**: Evaluate skills match, experience alignment, and overall fit (0-10 scale)

2. **Application Recommendation**: Based on ALL factors (fit, career goals, deal breakers, compensation), provide a clear verdict:
   - "strong-apply": Excellent fit (8+), no deal breakers, aligns with goals
   - "apply": Good fit (6-7), minor gaps that won't disqualify, worth pursuing
   - "consider": Moderate fit (5-6), weigh pros/cons carefully
   - "upskill-first": Low fit but role aligns with career goals, candidate should develop skills first
   - "pass": Deal breakers present, severe skill gaps, or fundamentally misaligned with goals

3. **Career Alignment**: How does this role fit the candidate's stated career goals? Will it advance their trajectory or is it a lateral/backward move?

4. **Deal Breaker Check**: Compare job requirements against candidate's stated deal breakers. Flag any conflicts.

5. **Skill Gap Analysis**: For each missing skill, assess:
   - Severity (minor/moderate/critical)
   - Why it matters for this role
   - How long it would take to acquire
   - Suggestions for acquiring it

6. **Compensation Fit**: Does the role's compensation (if mentioned) align with candidate's expectations?

7. **Work Style Compatibility**: Does the job's work arrangement match candidate's preferences?

8. **Red Flags & Green Flags**: What should excite or concern the candidate?

9. **Actionable Next Steps**: Based on your verdict, what should the candidate do?

Be honest and direct. If this isn't a good fit, say so clearly and explain why. The candidate's time is valuable.
  `;
  
  // Common schema parts for recommendation fields
  const recommendationSchema: Schema = {
    type: Type.OBJECT,
    properties: {
      verdict: { type: Type.STRING, enum: ['strong-apply', 'apply', 'consider', 'upskill-first', 'pass'] },
      confidence: { type: Type.NUMBER, description: '0-100 confidence in this recommendation' },
      summary: { type: Type.STRING, description: '1-2 sentence recommendation summary' },
      primaryReasons: { type: Type.ARRAY, items: { type: Type.STRING }, description: 'Top 3 reasons for verdict' },
      actionItems: { type: Type.ARRAY, items: { type: Type.STRING }, description: 'What to do next' }
    },
    required: ['verdict', 'confidence', 'summary', 'primaryReasons', 'actionItems']
  };

  const careerAlignmentSchema: Schema = {
    type: Type.OBJECT,
    properties: {
      alignmentScore: { type: Type.NUMBER, description: '0-10 career alignment score' },
      alignsWithGoals: { type: Type.ARRAY, items: { type: Type.STRING }, description: 'Which goals this supports' },
      misalignedAreas: { type: Type.ARRAY, items: { type: Type.STRING }, description: 'Areas of misalignment' },
      growthPotential: { type: Type.STRING, enum: ['high', 'medium', 'low'] },
      trajectoryImpact: { type: Type.STRING, description: 'How this affects career trajectory' }
    },
    required: ['alignmentScore', 'alignsWithGoals', 'misalignedAreas', 'growthPotential', 'trajectoryImpact']
  };

  const skillGapDetailSchema: Schema = {
    type: Type.OBJECT,
    properties: {
      skill: { type: Type.STRING },
      severity: { type: Type.STRING, enum: ['minor', 'moderate', 'critical'] },
      importance: { type: Type.STRING, description: 'Why this skill matters' },
      timeToAcquire: { type: Type.STRING, description: 'Estimated learning time' },
      suggestion: { type: Type.STRING, description: 'How to acquire this skill' }
    },
    required: ['skill', 'severity', 'importance']
  };

  const dealBreakerMatchSchema: Schema = {
    type: Type.OBJECT,
    properties: {
      userDealBreaker: { type: Type.STRING, description: 'The deal breaker from profile' },
      jobRequirement: { type: Type.STRING, description: 'The conflicting job requirement' },
      severity: { type: Type.STRING, enum: ['hard', 'soft'] }
    },
    required: ['userDealBreaker', 'jobRequirement', 'severity']
  };

  const workStyleMatchSchema: Schema = {
    type: Type.OBJECT,
    properties: {
      compatible: { type: Type.BOOLEAN },
      jobWorkStyle: { type: Type.STRING, enum: ['remote', 'hybrid', 'onsite', 'unknown'] },
      notes: { type: Type.STRING }
    },
    required: ['compatible', 'jobWorkStyle']
  };

  const compensationFitSchema: Schema = {
    type: Type.OBJECT,
    properties: {
      salaryInRange: { type: Type.BOOLEAN },
      assessment: { type: Type.STRING, description: 'Brief assessment like "Within range" or "Below minimum"' },
      marketComparison: { type: Type.STRING },
      negotiationLeverage: { type: Type.STRING }
    },
    required: ['salaryInRange', 'assessment']
  };

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
      salaryAssessment: { type: Type.STRING },
      // NEW: Enhanced recommendation fields
      recommendation: recommendationSchema,
      careerAlignment: careerAlignmentSchema,
      compensationFit: compensationFitSchema,
      dealBreakerMatches: { type: Type.ARRAY, items: dealBreakerMatchSchema },
      skillGapsDetailed: { type: Type.ARRAY, items: skillGapDetailSchema },
      workStyleMatch: workStyleMatchSchema
    },
    required: ['fitScore', 'reasoning', 'roleType', 'requiredSkills', 'matchedSkills', 'recommendation', 'careerAlignment', 'dealBreakerMatches', 'skillGapsDetailed', 'workStyleMatch']
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
      suggestedBid: { type: Type.OBJECT, properties: { hourly: { type: Type.NUMBER }, fixed: { type: Type.NUMBER }, rationale: { type: Type.STRING } } },
      // NEW: Enhanced recommendation fields
      recommendation: recommendationSchema,
      careerAlignment: careerAlignmentSchema,
      compensationFit: compensationFitSchema,
      dealBreakerMatches: { type: Type.ARRAY, items: dealBreakerMatchSchema },
      skillGapsDetailed: { type: Type.ARRAY, items: skillGapDetailSchema },
      workStyleMatch: workStyleMatchSchema
    },
    required: ['fitScore', 'reasoning', 'proposalAngle', 'openingHook', 'suggestedBid', 'recommendation', 'careerAlignment', 'dealBreakerMatches', 'skillGapsDetailed', 'workStyleMatch']
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

// ============================================
// PROJECT DOCUMENTATION AI FUNCTIONS
// ============================================

const projectInsightsSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    summary: {
      type: Type.STRING,
      description: "A 2-3 sentence compelling summary of the project that highlights impact and technical complexity"
    },
    talkingPoints: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "5-7 key talking points for discussing this project in interviews"
    },
    interviewQuestions: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "5-7 likely interview questions an interviewer might ask about this project"
    }
  },
  required: ['summary', 'talkingPoints', 'interviewQuestions']
};

/**
 * Generate AI insights for project documentation
 * Creates talking points, summary, and likely interview questions
 */
export const generateProjectInsights = async (
  project: Project,
  documentation: ProjectDocumentation
): Promise<{
  summary: string;
  talkingPoints: string[];
  interviewQuestions: string[];
}> => {
  if (!ai) throw new Error("Gemini API Key is missing.");

  const techStackStr = project.techStack.join(', ');
  const decisionsStr = documentation.technicalDecisions
    .map(d => `- ${d.decision}: ${d.rationale} (Result: ${d.outcome})`)
    .join('\n');
  const challengesStr = documentation.challenges
    .map(c => `- ${c.challenge}: ${c.approach}`)
    .join('\n');
  const metricsStr = documentation.metrics
    .map(m => `- ${m.metric}: ${m.before ? `${m.before} → ` : ''}${m.after}${m.improvement ? ` (${m.improvement})` : ''}`)
    .join('\n');

  const prompt = `
    Analyze this project and generate interview preparation insights.

    ## Project Overview
    Name: ${project.name}
    Description: ${project.description}
    Status: ${project.status}
    Tech Stack: ${techStackStr}
    ${project.traction ? `Traction: ${project.traction}` : ''}

    ## My Role
    ${documentation.myRole || 'Not specified'}
    ${documentation.teamSize ? `Team Size: ${documentation.teamSize}` : ''}
    ${documentation.duration ? `Duration: ${documentation.duration}` : ''}

    ## System Context
    ${documentation.systemContext || 'Not provided'}

    ## Integrations
    ${documentation.integrations.length > 0 ? documentation.integrations.join(', ') : 'None specified'}

    ## Technical Decisions Made
    ${decisionsStr || 'None documented'}

    ## Challenges Overcome
    ${challengesStr || 'None documented'}

    ## Metrics & Outcomes
    ${metricsStr || 'None documented'}

    ## Task
    Based on this project documentation, generate:
    1. A compelling 2-3 sentence summary that highlights the technical complexity and business impact
    2. 5-7 key talking points for discussing this project in interviews (focus on technical depth and quantifiable outcomes)
    3. 5-7 likely interview questions that an interviewer might ask about this project

    Make the talking points specific and actionable - they should help the candidate articulate their contribution clearly.
    The interview questions should range from overview questions to deep technical follow-ups.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: projectInsightsSchema,
        thinkingConfig: { thinkingBudget: 2048 }
      }
    });

    if (!response.text) throw new Error("No response from Gemini");

    let jsonText = response.text || "{}";
    if (jsonText.includes("```")) jsonText = jsonText.replace(/^```(json)?\s*/, "").replace(/\s*```$/, "");

    return JSON.parse(jsonText);
  } catch (error) {
    console.error("Project Insights Generation Failed:", error);
    throw error;
  }
};

const projectMatchSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    bestProjectId: { type: Type.STRING },
    relevanceScore: { type: Type.NUMBER },
    relevantDetails: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "Specific details from the project that are relevant to the question"
    },
    suggestedResponse: {
      type: Type.STRING,
      description: "A suggested response structure using details from the best matching project"
    },
    otherRelevantProjects: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          projectId: { type: Type.STRING },
          reason: { type: Type.STRING }
        }
      }
    }
  },
  required: ['bestProjectId', 'relevanceScore', 'relevantDetails', 'suggestedResponse']
};

/**
 * Match interview question to best project from documentation
 */
export const matchProjectToQuestion = async (
  question: string,
  projects: { project: Project; documentation: ProjectDocumentation }[]
): Promise<{
  bestProjectId: string;
  relevanceScore: number;
  relevantDetails: string[];
  suggestedResponse: string;
  otherRelevantProjects: { projectId: string; reason: string }[];
}> => {
  if (!ai) throw new Error("Gemini API Key is missing.");

  const projectsContext = projects.map(({ project, documentation }) => {
    const id = project.id || project.name;
    return `
## Project: ${project.name} (ID: ${id})
Description: ${project.description}
Tech Stack: ${project.techStack.join(', ')}
My Role: ${documentation.myRole || 'Not specified'}

Technical Decisions:
${documentation.technicalDecisions.map(d => `- ${d.decision}: ${d.rationale}`).join('\n') || 'None'}

Challenges:
${documentation.challenges.map(c => `- ${c.challenge}: ${c.approach}`).join('\n') || 'None'}

Metrics:
${documentation.metrics.map(m => `- ${m.metric}: ${m.after}`).join('\n') || 'None'}
`;
  }).join('\n---\n');

  const prompt = `
    Find the best matching project to answer this interview question.

    ## Interview Question
    "${question}"

    ## Available Projects
    ${projectsContext}

    ## Task
    1. Identify which project is most relevant to answer this question
    2. Extract specific details from that project that can be used in the answer
    3. Suggest a response structure using STAR format if applicable
    4. Note any other projects that might also be relevant
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: projectMatchSchema,
        thinkingConfig: { thinkingBudget: 2048 }
      }
    });

    if (!response.text) throw new Error("No response from Gemini");

    let jsonText = response.text || "{}";
    if (jsonText.includes("```")) jsonText = jsonText.replace(/^```(json)?\s*/, "").replace(/\s*```$/, "");

    return JSON.parse(jsonText);
  } catch (error) {
    console.error("Project Matching Failed:", error);
    throw error;
  }
};