import { GoogleGenAI, Type, Schema, LiveServerMessage, Modality } from "@google/genai";
import { UserProfile, JDAnalysis, FTEAnalysis, FreelanceAnalysis, CompanyResearch, Experience, QuestionMatch, InterviewConfig, JobApplication, InterviewFeedback, TranscriptItem, Project, ProjectDocumentation, InterviewNote, NextStepPrep, InterviewQuestionAsked, TechnicalAnswer } from "../types";
import type { PredictedQuestion, QuickReference } from "@/src/types/interview-prep";
import { parseGeminiJson, wasResponseTruncated } from "@/src/services/gemini/parse-json";

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
    return parseGeminiJson<UserProfile>(response.text, { context: 'processDocuments' });
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
    const result = parseGeminiJson(response.text, { context: 'analyzeJD' });
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

    const result = parseGeminiJson(response.text, { context: 'researchCompany' });
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
    return parseGeminiJson(response.text, { context: 'formatExperience' });
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
    const result = parseGeminiJson<any>(response.text, { context: 'matchStoriesToQuestion' });
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

    return parseGeminiJson(response.text, { context: 'generateInterviewFeedback' });
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

    return parseGeminiJson(response.text, { context: 'generateProjectInsights' });
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

    return parseGeminiJson(response.text, { context: 'matchProjectToQuestion' });
  } catch (error) {
    console.error("Project Matching Failed:", error);
    throw error;
  }
};

// ============================================
// INTERVIEW NOTES & RECORDING ANALYSIS
// ============================================

const interviewTranscriptSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    transcript: {
      type: Type.STRING,
      description: "Full text transcript of the audio recording"
    },
    speakers: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          label: { type: Type.STRING, description: "Speaker label (e.g., 'Interviewer', 'Candidate')" },
          estimatedRole: { type: Type.STRING, description: "Estimated role based on context" }
        }
      }
    },
    durationEstimate: {
      type: Type.STRING,
      description: "Estimated duration of the recording"
    }
  },
  required: ['transcript']
};

const interviewAnalysisSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    summary: {
      type: Type.STRING,
      description: "2-3 paragraph summary of the interview covering main topics discussed"
    },
    keyTakeaways: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "5-7 key takeaways from the interview"
    },
    questionsAsked: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          question: { type: Type.STRING },
          topic: { type: Type.STRING, enum: ['technical', 'behavioral', 'experience', 'culture', 'logistics', 'other'] },
          yourResponse: { type: Type.STRING, description: "Brief summary of how you answered" },
          wasStrong: { type: Type.BOOLEAN, description: "Was this a strong answer?" }
        },
        required: ['question', 'topic', 'wasStrong']
      },
      description: "Questions asked during the interview with assessment"
    },
    nextStepPrep: {
      type: Type.OBJECT,
      properties: {
        areasToReview: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: "Topics or skills to review before next round"
        },
        suggestedStoryTopics: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: "Story topics from Experience Bank that would be helpful to review"
        },
        anticipatedQuestions: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: "Questions likely to come up in next round based on this interview"
        },
        strengthsShown: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: "Strengths demonstrated in this interview"
        },
        areasToImprove: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: "Areas where answers could be improved"
        },
        followUpActions: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: "Specific actions to take before next round"
        },
        redFlags: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: "Any concerns or red flags identified"
        },
        greenFlags: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: "Positive signals from the interview"
        }
      },
      required: ['areasToReview', 'anticipatedQuestions', 'strengthsShown', 'areasToImprove', 'followUpActions']
    }
  },
  required: ['summary', 'keyTakeaways', 'questionsAsked', 'nextStepPrep']
};

/**
 * Transcribe audio from an interview recording
 * Uses Gemini's multimodal capabilities to process audio
 */
export const transcribeInterviewAudio = async (
  audioBase64: string,
  mimeType: string
): Promise<string> => {
  if (!ai) throw new Error("Gemini API Key is missing.");

  const prompt = `
    Transcribe this interview audio recording accurately.
    Include speaker labels where possible (e.g., "Interviewer:" and "Candidate:").
    Preserve the conversation flow and any important non-verbal cues (pauses, emphasis).

    Output the full transcript as plain text.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: {
        parts: [
          { text: prompt },
          {
            inlineData: {
              mimeType: mimeType,
              data: audioBase64
            }
          }
        ]
      },
      config: {
        thinkingConfig: { thinkingBudget: 2048 }
      }
    });

    if (!response.text) throw new Error("No response from Gemini");
    return response.text;
  } catch (error) {
    console.error("Audio Transcription Failed:", error);
    throw error;
  }
};

/**
 * Analyze an interview transcript or notes to generate insights and prep
 */
export const analyzeInterviewContent = async (
  content: string,
  context: {
    stage: string;
    company: string;
    role: string;
    jdAnalysis?: JDAnalysis;
    companyResearch?: CompanyResearch;
    profile: UserProfile;
    stories?: Experience[];
  }
): Promise<{
  summary: string;
  keyTakeaways: string[];
  questionsAsked: InterviewQuestionAsked[];
  nextStepPrep: NextStepPrep;
}> => {
  if (!ai) throw new Error("Gemini API Key is missing.");

  // Build context about available stories for matching
  const storiesContext = context.stories?.slice(0, 10).map(s =>
    `- "${s.title}" (Tags: ${s.tags.join(', ')}): ${s.star.situation.slice(0, 100)}...`
  ).join('\n') || 'No stories available';

  const jdContext = context.jdAnalysis
    ? `Key skills: ${context.jdAnalysis.requiredSkills?.join(', ') || 'Unknown'}
       Role type: ${(context.jdAnalysis as FTEAnalysis).roleType || 'Unknown'}`
    : 'No JD analysis available';

  const companyContext = context.companyResearch
    ? `Industry: ${context.companyResearch.overview?.industry || 'Unknown'}
       Culture notes: ${context.companyResearch.engineeringCulture?.notes || 'Unknown'}
       Interview difficulty: ${context.companyResearch.interviewIntel?.interviewDifficulty || 'Unknown'}`
    : 'No company research available';

  const prompt = `
    Analyze this interview content and generate preparation insights for the next round.

    ## Interview Context
    Stage: ${context.stage}
    Company: ${context.company}
    Role: ${context.role}

    ## Job Analysis
    ${jdContext}

    ## Company Intel
    ${companyContext}

    ## Candidate Profile
    Name: ${context.profile.name}
    Headline: ${context.profile.headline}
    Years Experience: ${context.profile.yearsExperience}
    Technical Skills: ${context.profile.technicalSkills.slice(0, 15).join(', ')}

    ## Available STAR Stories (for suggesting relevant ones)
    ${storiesContext}

    ## Interview Content (Transcript or Notes)
    ${content}

    ## Task
    Analyze this interview and provide:
    1. A comprehensive summary of what was discussed
    2. Key takeaways from the interview
    3. List of questions asked with assessment of answer quality
    4. Detailed preparation guide for the next round including:
       - Technical areas to review
       - Suggested STAR stories to prepare (match to the story titles above)
       - Anticipated follow-up questions
       - Strengths demonstrated
       - Areas where answers could be improved
       - Specific action items
       - Any red flags or concerns
       - Positive signals / green flags

    Be specific and actionable. The candidate needs concrete guidance for their next interview.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: interviewAnalysisSchema,
        thinkingConfig: { thinkingBudget: 4096 },
        maxOutputTokens: 32768
      }
    });

    if (!response.text) throw new Error("No response from Gemini");
    if (wasResponseTruncated(response)) {
      console.warn('[analyzeInterviewContent] Response was truncated (MAX_TOKENS) — attempting repair');
    }

    const result = parseGeminiJson<any>(response.text, { context: 'analyzeInterviewContent' });

    // Map the response to our types
    return {
      summary: result.summary,
      keyTakeaways: result.keyTakeaways || [],
      questionsAsked: (result.questionsAsked || []).map((q: any) => ({
        question: q.question,
        topic: q.topic,
        yourResponse: q.yourResponse,
        wasStrong: q.wasStrong
      })),
      nextStepPrep: {
        areasToReview: result.nextStepPrep?.areasToReview || [],
        suggestedStories: result.nextStepPrep?.suggestedStoryTopics || [],
        anticipatedQuestions: result.nextStepPrep?.anticipatedQuestions || [],
        strengthsShown: result.nextStepPrep?.strengthsShown || [],
        areasToImprove: result.nextStepPrep?.areasToImprove || [],
        followUpActions: result.nextStepPrep?.followUpActions || [],
        redFlags: result.nextStepPrep?.redFlags || [],
        greenFlags: result.nextStepPrep?.greenFlags || []
      }
    };
  } catch (error) {
    console.error("Interview Analysis Failed:", error);
    throw error;
  }
};

/**
 * Combined function to transcribe and analyze audio in one call
 * More efficient for processing interview recordings
 */
export const processInterviewRecording = async (
  audioBase64: string,
  mimeType: string,
  context: {
    stage: string;
    company: string;
    role: string;
    jdAnalysis?: JDAnalysis;
    companyResearch?: CompanyResearch;
    profile: UserProfile;
    stories?: Experience[];
  }
): Promise<{
  transcript: string;
  summary: string;
  keyTakeaways: string[];
  questionsAsked: InterviewQuestionAsked[];
  nextStepPrep: NextStepPrep;
}> => {
  if (!ai) throw new Error("Gemini API Key is missing.");

  // Build context
  const storiesContext = context.stories?.slice(0, 10).map(s =>
    `- "${s.title}" (Tags: ${s.tags.join(', ')})`
  ).join('\n') || 'No stories available';

  const prompt = `
    First, transcribe this interview audio recording accurately.
    Then, analyze the content to help the candidate prepare for their next round.

    ## Interview Context
    Stage: ${context.stage}
    Company: ${context.company}
    Role: ${context.role}

    ## Candidate Profile
    ${context.profile.name} - ${context.profile.headline}
    Skills: ${context.profile.technicalSkills.slice(0, 10).join(', ')}

    ## Available STAR Stories
    ${storiesContext}

    ## Output Required
    1. Full transcript with speaker labels
    2. Summary of key discussion points
    3. Key takeaways
    4. Questions asked with quality assessment
    5. Next step preparation guide

    Be thorough but actionable.
  `;

  const combinedSchema: Schema = {
    type: Type.OBJECT,
    properties: {
      transcript: { type: Type.STRING },
      summary: { type: Type.STRING },
      keyTakeaways: { type: Type.ARRAY, items: { type: Type.STRING } },
      questionsAsked: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            question: { type: Type.STRING },
            topic: { type: Type.STRING },
            yourResponse: { type: Type.STRING },
            wasStrong: { type: Type.BOOLEAN }
          }
        }
      },
      nextStepPrep: {
        type: Type.OBJECT,
        properties: {
          areasToReview: { type: Type.ARRAY, items: { type: Type.STRING } },
          suggestedStoryTopics: { type: Type.ARRAY, items: { type: Type.STRING } },
          anticipatedQuestions: { type: Type.ARRAY, items: { type: Type.STRING } },
          strengthsShown: { type: Type.ARRAY, items: { type: Type.STRING } },
          areasToImprove: { type: Type.ARRAY, items: { type: Type.STRING } },
          followUpActions: { type: Type.ARRAY, items: { type: Type.STRING } },
          redFlags: { type: Type.ARRAY, items: { type: Type.STRING } },
          greenFlags: { type: Type.ARRAY, items: { type: Type.STRING } }
        }
      }
    },
    required: ['transcript', 'summary', 'keyTakeaways', 'questionsAsked', 'nextStepPrep']
  };

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: {
        parts: [
          { text: prompt },
          {
            inlineData: {
              mimeType: mimeType,
              data: audioBase64
            }
          }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: combinedSchema,
        thinkingConfig: { thinkingBudget: 8192 },
        maxOutputTokens: 65536
      }
    });

    if (!response.text) throw new Error("No response from Gemini");
    if (wasResponseTruncated(response)) {
      console.warn('[processInterviewRecording] Response was truncated (MAX_TOKENS) — attempting repair');
    }

    const result = parseGeminiJson<any>(response.text, { context: 'processInterviewRecording' });

    return {
      transcript: result.transcript,
      summary: result.summary,
      keyTakeaways: result.keyTakeaways || [],
      questionsAsked: (result.questionsAsked || []).map((q: any) => ({
        question: q.question,
        topic: q.topic,
        yourResponse: q.yourResponse,
        wasStrong: q.wasStrong
      })),
      nextStepPrep: {
        areasToReview: result.nextStepPrep?.areasToReview || [],
        suggestedStories: result.nextStepPrep?.suggestedStoryTopics || [],
        anticipatedQuestions: result.nextStepPrep?.anticipatedQuestions || [],
        strengthsShown: result.nextStepPrep?.strengthsShown || [],
        areasToImprove: result.nextStepPrep?.areasToImprove || [],
        followUpActions: result.nextStepPrep?.followUpActions || [],
        redFlags: result.nextStepPrep?.redFlags || [],
        greenFlags: result.nextStepPrep?.greenFlags || []
      }
    };
  } catch (error) {
    console.error("Interview Recording Processing Failed:", error);
    throw error;
  }
};

// ============================================
// INTERVIEW COPILOT AI FUNCTIONS
// ============================================

import { CopilotQuestionType, CopilotSuggestion, CopilotStoryMatch } from "../types";

// Schema for question detection
const questionDetectionSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    isQuestion: { type: Type.BOOLEAN },
    question: { type: Type.STRING, description: "The cleaned up question text" },
    questionType: {
      type: Type.STRING,
      enum: ['behavioral', 'technical', 'situational', 'experience', 'motivation', 'culture-fit', 'clarifying', 'follow-up', 'general']
    },
    confidence: { type: Type.NUMBER, description: "Confidence 0-100 that this is an interview question" },
    context: { type: Type.STRING, description: "Brief context about what the question is asking" }
  },
  required: ['isQuestion', 'confidence']
};

// Schema for copilot suggestion
const copilotSuggestionSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    matchedStories: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          storyIndex: { type: Type.INTEGER, description: "Index in the stories array" },
          storyTitle: { type: Type.STRING },
          relevance: { type: Type.NUMBER, description: "Relevance score 0-100" },
          keyPoints: { type: Type.ARRAY, items: { type: Type.STRING }, description: "3-5 bullet points to mention from this story" },
          openingLine: { type: Type.STRING, description: "Suggested opening sentence" }
        },
        required: ['storyIndex', 'storyTitle', 'relevance', 'keyPoints']
      }
    },
    keyPoints: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "5-7 concise talking points to include in answer"
    },
    starResponse: {
      type: Type.OBJECT,
      properties: {
        situation: { type: Type.STRING, description: "1-2 sentence situation setup" },
        task: { type: Type.STRING, description: "1 sentence describing your responsibility" },
        action: { type: Type.STRING, description: "2-3 sentences on what you did" },
        result: { type: Type.STRING, description: "1-2 sentences on outcome with metrics if possible" }
      },
      required: ['situation', 'task', 'action', 'result']
    },
    anticipatedFollowUps: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "2-3 likely follow-up questions"
    },
    warnings: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "Things to avoid saying or doing"
    }
  },
  required: ['keyPoints', 'matchedStories']
};

/**
 * Detect if a transcript chunk contains an interview question
 * Uses AI for more nuanced detection beyond regex patterns
 */
export const detectInterviewQuestion = async (
  transcript: string,
  recentContext?: string
): Promise<{
  isQuestion: boolean;
  question?: string;
  questionType?: CopilotQuestionType;
  confidence: number;
  context?: string;
}> => {
  if (!ai) throw new Error("Gemini API Key is missing.");

  const prompt = `
    Analyze this transcript from a live interview. Determine if the interviewer is asking a question.

    ${recentContext ? `## Recent Context\n${recentContext}\n\n` : ''}
    ## Current Transcript
    "${transcript}"

    ## Instructions
    1. Determine if this is an interview question (not small talk, not the candidate speaking)
    2. If it's a question, identify the type and clean up the question text
    3. Consider that interviews often have:
       - Behavioral questions ("Tell me about a time...")
       - Technical questions ("How would you...")
       - Situational questions ("What would you do if...")
       - Experience questions ("Have you worked with...")
       - Follow-up questions on previous answers

    Be accurate - false positives are worse than missed questions.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: questionDetectionSchema,
        thinkingConfig: { thinkingBudget: 512 }
      }
    });

    if (!response.text) throw new Error("No response from Gemini");

    const result = parseGeminiJson<any>(response.text, { context: 'detectQuestion' });
    return {
      isQuestion: result.isQuestion,
      question: result.question,
      questionType: result.questionType as CopilotQuestionType,
      confidence: result.confidence,
      context: result.context
    };
  } catch (error) {
    console.error("Question Detection Failed:", error);
    // Return safe default on error
    return { isQuestion: false, confidence: 0 };
  }
};

/**
 * Generate a suggestion for answering an interview question
 * Uses profile, stories, and job context to provide personalized guidance
 */
export const generateCopilotSuggestion = async (
  question: string,
  questionType: CopilotQuestionType,
  profile: UserProfile,
  stories: Experience[],
  jobContext?: {
    company?: string;
    role?: string;
    jdHighlights?: string[];
    companyResearch?: CompanyResearch;
    // Enhanced context from Interview Prep and Answer Prep
    preparedQuestions?: PredictedQuestion[];
    quickReference?: QuickReference;
    technicalAnswers?: TechnicalAnswer[];
  }
): Promise<Omit<CopilotSuggestion, 'id' | 'questionId' | 'generatedAt' | 'generationTimeMs'>> => {
  if (!ai) throw new Error("Gemini API Key is missing.");

  // Build profile context
  const profileContext = `
## Candidate Profile
Name: ${profile.name}
Headline: ${profile.headline}
Years Experience: ${profile.yearsExperience}
Technical Skills: ${profile.technicalSkills.slice(0, 15).join(', ')}
Soft Skills: ${profile.softSkills.slice(0, 10).join(', ') || 'Not specified'}

## Recent Roles
${profile.recentRoles.slice(0, 3).map(r =>
  `- ${r.title} at ${r.company} (${r.duration}): ${r.highlights.slice(0, 2).join('; ')}`
).join('\n')}

## Key Achievements
${profile.keyAchievements.slice(0, 3).map(a =>
  `- ${a.description}${a.metrics ? ` (${a.metrics})` : ''}`
).join('\n')}
`;

  // Build stories context
  const storiesContext = stories.length > 0 ? `
## Available STAR Stories (use index to reference)
${stories.map((s, i) => `
[${i}] "${s.title}" (Tags: ${s.tags.join(', ')})
- Situation: ${s.star.situation.slice(0, 150)}...
- Result: ${s.star.result.slice(0, 100)}...
- Metrics: ${s.metrics.primary || 'None'}
`).join('\n')}
` : '(No stories available - suggest creating some based on experience)';

  // Build job context
  const jobContextStr = jobContext?.company ? `
## Job Context
Company: ${jobContext.company}
Role: ${jobContext.role}
${jobContext.jdHighlights ? `Key Requirements: ${jobContext.jdHighlights.join(', ')}` : ''}
${jobContext.companyResearch ? `Company Culture: ${jobContext.companyResearch.engineeringCulture?.notes || 'Unknown'}` : ''}
` : '';

  // Build prepared questions context (from Interview Prep)
  const preparedQuestionsContext = jobContext?.preparedQuestions?.length ? `
## Prepared Interview Questions
You have prepared answers for these similar questions. Use them if relevant:
${jobContext.preparedQuestions.slice(0, 10).map((q, i) => `
[PQ${i}] "${q.question}" (${q.category}, ${q.likelihood} likelihood)
${q.suggestedApproach ? `- Suggested approach: ${q.suggestedApproach.slice(0, 200)}...` : ''}
${q.matchedStoryId ? `- Has linked story` : ''}
${q.matchedAnswerId ? `- Has prepared answer` : ''}
`).join('\n')}
` : '';

  // Build quick reference context
  const quickRefContext = jobContext?.quickReference ? `
## Quick Reference (Interview Day Notes)
${jobContext.quickReference.elevatorPitch ? `Elevator Pitch: ${jobContext.quickReference.elevatorPitch}` : ''}
${jobContext.quickReference.talkingPoints?.length ? `Key Talking Points:\n${jobContext.quickReference.talkingPoints.slice(0, 5).map(tp => `- ${tp}`).join('\n')}` : ''}
${jobContext.quickReference.companyFacts?.length ? `Company Facts:\n${jobContext.quickReference.companyFacts.slice(0, 3).map(f => `- ${f}`).join('\n')}` : ''}
` : '';

  // Build technical answers context (from Answer Prep)
  const technicalAnswersContext = jobContext?.technicalAnswers?.length ? `
## Prepared Technical Answers
You have these prepared technical answers. Use them if the question is related:
${jobContext.technicalAnswers.slice(0, 8).map((a, i) => `
[TA${i}] Q: "${a.question}" (${a.questionType})
- Answer summary: ${a.answer.narrative.slice(0, 300)}...
- Key points: ${a.answer.bulletPoints.slice(0, 3).join('; ')}
${a.followUps?.length ? `- Prepared follow-ups: ${a.followUps.slice(0, 2).map(f => f.question).join('; ')}` : ''}
`).join('\n')}
` : '';

  const prompt = `
    You are an Interview Copilot helping a candidate answer a question in real-time.
    Generate a quick, actionable suggestion they can use RIGHT NOW while speaking.

    IMPORTANT: The candidate has prepared answers and stories. PRIORITIZE using their prepared content
    when relevant - this ensures consistency and uses their practiced responses.

    ${profileContext}
    ${storiesContext}
    ${jobContextStr}
    ${preparedQuestionsContext}
    ${quickRefContext}
    ${technicalAnswersContext}

    ## Question Being Asked
    Type: ${questionType}
    Question: "${question}"

    ## Your Task
    Generate a CONCISE response guide that the candidate can glance at while answering:

    1. **Check Prepared Content First**:
       - If a prepared question [PQ#] or technical answer [TA#] closely matches this question, USE THAT CONTENT as the primary source
       - Adapt the prepared answer to fit the exact question asked
       - If no prepared content matches, generate a new answer using stories and profile

    2. **Matched Stories**: Find the 1-3 most relevant STAR stories. Include specific talking points from each.

    3. **Key Points**: 5-7 bullet points they should mention. Keep each under 15 words.
       - Be specific (use numbers, names, technologies)
       - Focus on impact and results
       - Include relevant soft skills demonstrated
       - If using prepared content, include its key points

    4. **STAR Response** (if behavioral/situational): Write a complete but concise STAR response using the best story.
       - If a prepared answer exists, incorporate its approach

    5. **Anticipated Follow-ups**: 2-3 likely follow-up questions to prepare for.
       - If the prepared answer has follow-ups, include those

    6. **Warnings**: Things to avoid (don't badmouth, don't ramble, etc.)

    Remember: This is for REAL-TIME use. Keep everything scannable and actionable.
    ALWAYS prefer using prepared content when available - the candidate has practiced it!
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: copilotSuggestionSchema,
        thinkingConfig: { thinkingBudget: 1024 }
      }
    });

    if (!response.text) throw new Error("No response from Gemini");

    const result = parseGeminiJson<any>(response.text, { context: 'generateCopilotSuggestion' });

    // Map story indices to actual story data
    const matchedStories: CopilotStoryMatch[] = (result.matchedStories || []).map((m: any) => {
      const story = stories[m.storyIndex];
      return {
        storyId: story?.id || 'unknown',
        storyTitle: m.storyTitle || story?.title || 'Unknown Story',
        relevance: m.relevance,
        keyPoints: m.keyPoints || [],
        openingLine: m.openingLine
      };
    }).filter((m: CopilotStoryMatch) => m.storyId !== 'unknown');

    return {
      questionText: question,
      questionType,
      matchedStories,
      keyPoints: result.keyPoints || [],
      starResponse: result.starResponse,
      anticipatedFollowUps: result.anticipatedFollowUps,
      warnings: result.warnings
    };
  } catch (error) {
    console.error("Copilot Suggestion Generation Failed:", error);
    throw error;
  }
};

/**
 * Quick question type classification (faster than full detection)
 * Use for initial categorization before full AI analysis
 */
export const classifyQuestionType = (questionText: string): CopilotQuestionType => {
  const text = questionText.toLowerCase();

  // Behavioral patterns
  if (/tell me about a time|describe a situation|give me an example|have you ever|when was the last time/.test(text)) {
    return 'behavioral';
  }

  // Technical patterns
  if (/how would you (implement|design|build|solve)|what is|what are|explain|how does|what's the difference/.test(text)) {
    return 'technical';
  }

  // Situational patterns
  if (/what would you do if|imagine that|suppose|how would you handle/.test(text)) {
    return 'situational';
  }

  // Experience patterns
  if (/have you (worked with|used|built|deployed)|what experience|how many years/.test(text)) {
    return 'experience';
  }

  // Motivation patterns
  if (/why (do you want|are you interested|did you apply)|what motivates|what are you looking for/.test(text)) {
    return 'motivation';
  }

  // Culture fit patterns
  if (/work style|team|collaborate|conflict|disagree|feedback/.test(text)) {
    return 'culture-fit';
  }

  // Follow-up patterns
  if (/can you (elaborate|explain more|give another example)|what about|and then|how did that/.test(text)) {
    return 'follow-up';
  }

  // Clarifying patterns
  if (/what do you mean|could you clarify|can you repeat/.test(text)) {
    return 'clarifying';
  }

  return 'general';
};