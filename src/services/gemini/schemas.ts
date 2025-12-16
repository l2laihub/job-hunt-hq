import { Type, Schema } from '@google/genai';

// Profile schema for document processing
export const profileSchema: Schema = {
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
          storyType: { type: Type.STRING, enum: ['technical', 'leadership', 'impact', 'collaboration'] },
        },
      },
    },
    recentRoles: {
      type: Type.ARRAY,
      description: 'Professional experience from Resume OR About Me docs. Include freelance work, consulting engagements, and significant contract roles here.',
      items: {
        type: Type.OBJECT,
        properties: {
          company: { type: Type.STRING },
          title: { type: Type.STRING },
          duration: { type: Type.STRING },
          highlights: { type: Type.ARRAY, items: { type: Type.STRING } },
        },
      },
    },
    currentSituation: { type: Type.STRING },
    goals: { type: Type.ARRAY, items: { type: Type.STRING } },
    constraints: { type: Type.ARRAY, items: { type: Type.STRING } },
    activeProjects: {
      type: Type.ARRAY,
      description: 'Side projects, businesses, or products. Can include freelance business entities if they are product/service based.',
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          description: { type: Type.STRING },
          techStack: { type: Type.ARRAY, items: { type: Type.STRING } },
          status: { type: Type.STRING, enum: ['active', 'launched', 'paused'] },
          traction: { type: Type.STRING },
        },
      },
    },
    preferences: {
      type: Type.OBJECT,
      properties: {
        targetRoles: { type: Type.ARRAY, items: { type: Type.STRING } },
        workStyle: { type: Type.STRING, enum: ['remote', 'hybrid', 'onsite', 'flexible'] },
        salaryRange: { type: Type.OBJECT, properties: { min: { type: Type.NUMBER }, max: { type: Type.NUMBER } } },
        dealBreakers: { type: Type.ARRAY, items: { type: Type.STRING } },
        priorityFactors: { type: Type.ARRAY, items: { type: Type.STRING } },
      },
    },
    freelanceProfile: {
      type: Type.OBJECT,
      properties: {
        hourlyRate: { type: Type.OBJECT, properties: { min: { type: Type.NUMBER }, max: { type: Type.NUMBER } } },
        availableHours: { type: Type.STRING },
        preferredProjectTypes: { type: Type.ARRAY, items: { type: Type.STRING } },
        uniqueSellingPoints: { type: Type.ARRAY, items: { type: Type.STRING } },
      },
    },
  },
  required: ['name', 'headline', 'yearsExperience', 'technicalSkills', 'recentRoles'],
};

// FTE Analysis schema
export const fteAnalysisSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    fitScore: { type: Type.NUMBER, description: 'Score from 0-10 indicating fit' },
    reasoning: { type: Type.STRING, description: 'Brief explanation of the score' },
    requiredSkills: { type: Type.ARRAY, items: { type: Type.STRING } },
    matchedSkills: { type: Type.ARRAY, items: { type: Type.STRING } },
    missingSkills: { type: Type.ARRAY, items: { type: Type.STRING } },
    roleType: { type: Type.STRING, enum: ['IC-heavy', 'balanced', 'management-heavy'] },
    redFlags: { type: Type.ARRAY, items: { type: Type.STRING } },
    greenFlags: { type: Type.ARRAY, items: { type: Type.STRING } },
    talkingPoints: { type: Type.ARRAY, items: { type: Type.STRING } },
    questionsToAsk: { type: Type.ARRAY, items: { type: Type.STRING } },
    salaryAssessment: { type: Type.STRING },
  },
  required: ['fitScore', 'reasoning', 'roleType', 'requiredSkills', 'matchedSkills'],
};

// Freelance Analysis schema
export const freelanceAnalysisSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    fitScore: { type: Type.NUMBER, description: 'Score from 0-10 indicating project fit' },
    reasoning: { type: Type.STRING },
    projectType: { type: Type.STRING, enum: ['fixed-price', 'hourly', 'retainer'] },
    estimatedEffort: { type: Type.STRING },
    requiredSkills: { type: Type.ARRAY, items: { type: Type.STRING } },
    matchedSkills: { type: Type.ARRAY, items: { type: Type.STRING } },
    missingSkills: { type: Type.ARRAY, items: { type: Type.STRING } },
    redFlags: { type: Type.ARRAY, items: { type: Type.STRING } },
    greenFlags: { type: Type.ARRAY, items: { type: Type.STRING } },
    proposalAngle: { type: Type.STRING, description: 'Recommended approach for the proposal' },
    openingHook: { type: Type.STRING, description: 'Suggested opening line for the proposal' },
    relevantExperience: { type: Type.ARRAY, items: { type: Type.STRING } },
    questionsForClient: { type: Type.ARRAY, items: { type: Type.STRING } },
    suggestedBid: {
      type: Type.OBJECT,
      properties: {
        hourly: { type: Type.NUMBER },
        fixed: { type: Type.NUMBER },
        rationale: { type: Type.STRING },
      },
    },
  },
  required: ['fitScore', 'reasoning', 'proposalAngle', 'openingHook', 'suggestedBid'],
};

// Experience/STAR schema
export const experienceSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING, description: 'A concise title for this experience' },
    star: {
      type: Type.OBJECT,
      properties: {
        situation: { type: Type.STRING },
        task: { type: Type.STRING },
        action: { type: Type.STRING },
        result: { type: Type.STRING },
      },
      required: ['situation', 'task', 'action', 'result'],
    },
    metrics: {
      type: Type.OBJECT,
      properties: {
        primary: { type: Type.STRING },
        secondary: { type: Type.ARRAY, items: { type: Type.STRING } },
        missing: { type: Type.ARRAY, items: { type: Type.STRING }, description: 'Metrics that would strengthen this story' },
      },
    },
    suggestedTags: { type: Type.ARRAY, items: { type: Type.STRING } },
    variations: {
      type: Type.OBJECT,
      properties: {
        leadership: { type: Type.STRING, description: 'How to angle this for leadership questions' },
        technical: { type: Type.STRING, description: 'How to angle this for technical questions' },
        challenge: { type: Type.STRING, description: 'How to angle this for overcoming challenges' },
      },
    },
    followUpQuestions: { type: Type.ARRAY, items: { type: Type.STRING } },
    coachingNotes: { type: Type.STRING },
  },
  required: ['title', 'star', 'suggestedTags'],
};

// Story matching schema
export const matchSchema: Schema = {
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
          openingLine: { type: Type.STRING },
        },
        required: ['storyIndex', 'fitScore', 'reasoning'],
      },
    },
    noGoodMatch: { type: Type.BOOLEAN },
    gapSuggestion: { type: Type.STRING, description: 'Suggestion for what story the user should add' },
  },
  required: ['matches', 'noGoodMatch'],
};

// Interview feedback schema
export const feedbackSchema: Schema = {
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
        confidence: { type: Type.STRING },
      },
    },
    technicalAccuracy: { type: Type.STRING },
    starStructureUse: { type: Type.STRING },
    summary: { type: Type.STRING },
  },
  required: ['overallScore', 'strengths', 'weaknesses', 'communication', 'summary'],
};

// Technical Answer Generation schema
export const technicalAnswerSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    questionType: {
      type: Type.STRING,
      enum: ['behavioral-technical', 'conceptual', 'system-design', 'problem-solving', 'experience'],
      description: 'Auto-detected question type',
    },
    format: {
      type: Type.OBJECT,
      properties: {
        type: { type: Type.STRING, description: 'Format name (STAR, Explain-Example-Tradeoffs, etc.)' },
        sections: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              label: { type: Type.STRING },
              content: { type: Type.STRING },
            },
          },
        },
      },
    },
    answer: {
      type: Type.OBJECT,
      properties: {
        structured: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              label: { type: Type.STRING },
              content: { type: Type.STRING },
            },
          },
        },
        narrative: { type: Type.STRING, description: 'Full answer in natural conversational form' },
        bulletPoints: { type: Type.ARRAY, items: { type: Type.STRING } },
      },
    },
    sources: {
      type: Type.OBJECT,
      properties: {
        matchedStoryIndices: { type: Type.ARRAY, items: { type: Type.INTEGER }, description: 'Indices of stories used' },
        profileSectionsUsed: { type: Type.ARRAY, items: { type: Type.STRING } },
        synthesized: { type: Type.BOOLEAN, description: 'True if AI synthesized beyond direct sources' },
      },
    },
    suggestedTags: { type: Type.ARRAY, items: { type: Type.STRING } },
  },
  required: ['questionType', 'format', 'answer'],
};

// Follow-up Q&A schema
export const followUpSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    followUps: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          question: { type: Type.STRING },
          likelihood: { type: Type.STRING, enum: ['high', 'medium', 'low'] },
          suggestedAnswer: { type: Type.STRING },
          keyPoints: { type: Type.ARRAY, items: { type: Type.STRING } },
        },
        required: ['question', 'likelihood', 'suggestedAnswer', 'keyPoints'],
      },
    },
  },
  required: ['followUps'],
};

// Company research schema
export const companyResearchSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    overview: {
      type: Type.OBJECT,
      properties: {
        description: { type: Type.STRING },
        industry: { type: Type.STRING },
        size: { type: Type.STRING },
        founded: { type: Type.STRING },
        headquarters: { type: Type.STRING },
        fundingStatus: { type: Type.STRING },
        lastFunding: { type: Type.STRING },
      },
    },
    recentNews: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          headline: { type: Type.STRING },
          date: { type: Type.STRING },
          source: { type: Type.STRING },
          sentiment: { type: Type.STRING, enum: ['positive', 'neutral', 'negative'] },
          summary: { type: Type.STRING },
        },
      },
    },
    engineeringCulture: {
      type: Type.OBJECT,
      properties: {
        techBlog: { type: Type.STRING },
        openSource: { type: Type.STRING },
        knownStack: { type: Type.ARRAY, items: { type: Type.STRING } },
        teamSize: { type: Type.STRING },
        remotePolicy: { type: Type.STRING, enum: ['remote', 'hybrid', 'onsite', 'unknown'] },
        notes: { type: Type.STRING },
      },
    },
    redFlags: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          flag: { type: Type.STRING },
          detail: { type: Type.STRING },
          source: { type: Type.STRING },
          severity: { type: Type.STRING, enum: ['low', 'medium', 'high'] },
        },
      },
    },
    greenFlags: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          flag: { type: Type.STRING },
          detail: { type: Type.STRING },
          source: { type: Type.STRING },
        },
      },
    },
    keyPeople: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          role: { type: Type.STRING },
          linkedin: { type: Type.STRING },
          notes: { type: Type.STRING },
        },
      },
    },
    interviewIntel: {
      type: Type.OBJECT,
      properties: {
        glassdoorRating: { type: Type.STRING },
        interviewDifficulty: { type: Type.STRING },
        commonTopics: { type: Type.ARRAY, items: { type: Type.STRING } },
        salaryRange: { type: Type.STRING },
        employeeSentiment: { type: Type.STRING },
      },
    },
    verdict: {
      type: Type.OBJECT,
      properties: {
        overall: { type: Type.STRING, enum: ['green', 'yellow', 'red'] },
        summary: { type: Type.STRING },
        topConcern: { type: Type.STRING },
        topPositive: { type: Type.STRING },
      },
    },
  },
};
