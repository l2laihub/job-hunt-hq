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

// Shared recommendation schema components
const recommendationSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    verdict: { type: Type.STRING, enum: ['strong-apply', 'apply', 'consider', 'upskill-first', 'pass'] },
    confidence: { type: Type.NUMBER, description: '0-100 confidence in this recommendation' },
    summary: { type: Type.STRING, description: '1-2 sentence recommendation summary' },
    primaryReasons: { type: Type.ARRAY, items: { type: Type.STRING }, description: 'Top 3 reasons for verdict' },
    actionItems: { type: Type.ARRAY, items: { type: Type.STRING }, description: 'What to do next' },
  },
  required: ['verdict', 'confidence', 'summary', 'primaryReasons', 'actionItems'],
};

const careerAlignmentSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    alignmentScore: { type: Type.NUMBER, description: '0-10 career alignment score' },
    alignsWithGoals: { type: Type.ARRAY, items: { type: Type.STRING }, description: 'Which goals this supports' },
    misalignedAreas: { type: Type.ARRAY, items: { type: Type.STRING }, description: 'Areas of misalignment' },
    growthPotential: { type: Type.STRING, enum: ['high', 'medium', 'low'] },
    trajectoryImpact: { type: Type.STRING, description: 'How this affects career trajectory' },
  },
  required: ['alignmentScore', 'alignsWithGoals', 'misalignedAreas', 'growthPotential', 'trajectoryImpact'],
};

const skillGapDetailSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    skill: { type: Type.STRING },
    severity: { type: Type.STRING, enum: ['minor', 'moderate', 'critical'] },
    importance: { type: Type.STRING, description: 'Why this skill matters' },
    timeToAcquire: { type: Type.STRING, description: 'Estimated learning time' },
    suggestion: { type: Type.STRING, description: 'How to acquire this skill' },
  },
  required: ['skill', 'severity', 'importance'],
};

const dealBreakerMatchSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    userDealBreaker: { type: Type.STRING, description: 'The deal breaker from profile' },
    jobRequirement: { type: Type.STRING, description: 'The conflicting job requirement' },
    severity: { type: Type.STRING, enum: ['hard', 'soft'] },
  },
  required: ['userDealBreaker', 'jobRequirement', 'severity'],
};

const workStyleMatchSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    compatible: { type: Type.BOOLEAN },
    jobWorkStyle: { type: Type.STRING, enum: ['remote', 'hybrid', 'onsite', 'unknown'] },
    notes: { type: Type.STRING },
  },
  required: ['compatible', 'jobWorkStyle'],
};

const compensationFitSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    salaryInRange: { type: Type.BOOLEAN },
    assessment: { type: Type.STRING, description: 'Brief assessment like "Within range" or "Below minimum"' },
    marketComparison: { type: Type.STRING },
    negotiationLeverage: { type: Type.STRING },
  },
  required: ['salaryInRange', 'assessment'],
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
    // Enhanced recommendation fields
    recommendation: recommendationSchema,
    careerAlignment: careerAlignmentSchema,
    compensationFit: compensationFitSchema,
    dealBreakerMatches: { type: Type.ARRAY, items: dealBreakerMatchSchema },
    skillGapsDetailed: { type: Type.ARRAY, items: skillGapDetailSchema },
    workStyleMatch: workStyleMatchSchema,
  },
  required: ['fitScore', 'reasoning', 'roleType', 'requiredSkills', 'matchedSkills', 'recommendation', 'careerAlignment', 'dealBreakerMatches', 'skillGapsDetailed', 'workStyleMatch'],
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
    // Enhanced recommendation fields
    recommendation: recommendationSchema,
    careerAlignment: careerAlignmentSchema,
    compensationFit: compensationFitSchema,
    dealBreakerMatches: { type: Type.ARRAY, items: dealBreakerMatchSchema },
    skillGapsDetailed: { type: Type.ARRAY, items: skillGapDetailSchema },
    workStyleMatch: workStyleMatchSchema,
  },
  required: ['fitScore', 'reasoning', 'proposalAngle', 'openingHook', 'suggestedBid', 'recommendation', 'careerAlignment', 'dealBreakerMatches', 'skillGapsDetailed', 'workStyleMatch'],
};

// Contract Analysis schema
export const contractAnalysisSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    fitScore: { type: Type.NUMBER, description: 'Score from 0-10 indicating fit' },
    reasoning: { type: Type.STRING },
    contractType: { type: Type.STRING, enum: ['W-2', '1099', 'corp-to-corp', 'unknown'] },
    duration: { type: Type.STRING, description: 'Expected contract duration if mentioned' },
    extensionLikely: { type: Type.BOOLEAN },
    requiredSkills: { type: Type.ARRAY, items: { type: Type.STRING } },
    matchedSkills: { type: Type.ARRAY, items: { type: Type.STRING } },
    missingSkills: { type: Type.ARRAY, items: { type: Type.STRING } },
    redFlags: { type: Type.ARRAY, items: { type: Type.STRING } },
    greenFlags: { type: Type.ARRAY, items: { type: Type.STRING } },
    roleType: { type: Type.STRING, enum: ['IC-heavy', 'balanced', 'management-heavy'] },
    talkingPoints: { type: Type.ARRAY, items: { type: Type.STRING } },
    questionsToAsk: { type: Type.ARRAY, items: { type: Type.STRING } },
    rateAssessment: { type: Type.STRING },
    conversionPotential: { type: Type.STRING, description: 'Likelihood of contract-to-hire' },
    // Enhanced recommendation fields
    recommendation: recommendationSchema,
    careerAlignment: careerAlignmentSchema,
    compensationFit: compensationFitSchema,
    dealBreakerMatches: { type: Type.ARRAY, items: dealBreakerMatchSchema },
    skillGapsDetailed: { type: Type.ARRAY, items: skillGapDetailSchema },
    workStyleMatch: workStyleMatchSchema,
  },
  required: ['fitScore', 'reasoning', 'contractType', 'roleType', 'requiredSkills', 'matchedSkills', 'recommendation', 'careerAlignment', 'dealBreakerMatches', 'skillGapsDetailed', 'workStyleMatch'],
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

// Cover Letter Generation schema
export const coverLetterSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    content: { type: Type.STRING, description: 'The full cover letter text' },
    keyPoints: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: 'Main points emphasized in the letter',
    },
    wordCount: { type: Type.NUMBER },
    tone: { type: Type.STRING, description: 'Description of the tone used' },
    personalizations: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: 'Specific customizations made for this role',
    },
  },
  required: ['content', 'keyPoints', 'wordCount'],
};

// Application Question Answer schema
export const applicationQuestionAnswerSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    generatedAnswer: {
      type: Type.STRING,
      description: 'The main answer to the application question',
    },
    keyPoints: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: '3-4 key points that make this answer strong',
    },
    sources: {
      type: Type.OBJECT,
      properties: {
        profileSections: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: 'Profile sections used (e.g., recentRoles, keyAchievements, technicalSkills)',
        },
        storyIds: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: 'IDs of stories referenced',
        },
        synthesized: {
          type: Type.BOOLEAN,
          description: 'Whether answer was synthesized from multiple sources',
        },
      },
    },
    alternativeAnswers: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: '1-2 shorter alternative versions of the answer',
    },
    improvements: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: 'Suggestions for how to improve the answer further',
    },
  },
  required: ['generatedAnswer', 'keyPoints'],
};

// Phone Screen Prep schema
export const phoneScreenPrepSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    companyResearchPoints: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: 'Key facts about the company to mention',
    },
    likelyQuestions: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          question: { type: Type.STRING },
          suggestedAnswer: { type: Type.STRING },
        },
      },
    },
    questionsToAsk: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: 'Smart questions to ask the recruiter/interviewer',
    },
    talkingPoints: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: 'Key achievements to weave in',
    },
    redFlagResponses: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: 'How to address potential concerns from your background',
    },
    elevatorPitch: { type: Type.STRING, description: '30-second introduction' },
    closingStatement: { type: Type.STRING, description: 'Strong closing to express interest' },
  },
  required: ['likelyQuestions', 'questionsToAsk', 'talkingPoints', 'elevatorPitch'],
};

// Technical Interview Prep schema
export const technicalInterviewPrepSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    focusAreas: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: 'Main technical areas to study',
    },
    likelyTopics: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          topic: { type: Type.STRING },
          depth: { type: Type.STRING, enum: ['basic', 'intermediate', 'deep'] },
          notes: { type: Type.STRING, description: 'Key points to know about this topic' },
        },
      },
    },
    relevantStoryIndices: {
      type: Type.ARRAY,
      items: { type: Type.INTEGER },
      description: 'Indices of relevant stories from experience bank',
    },
    systemDesignTopics: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: 'System design topics that may come up',
    },
    codingPatterns: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: 'Common coding patterns/algorithms to review',
    },
    behavioralQuestions: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          question: { type: Type.STRING },
          recommendedStoryIndex: { type: Type.INTEGER },
          suggestedApproach: { type: Type.STRING },
        },
      },
    },
    studyResources: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          topic: { type: Type.STRING },
          resource: { type: Type.STRING },
          priority: { type: Type.STRING, enum: ['high', 'medium', 'low'] },
        },
      },
    },
    practiceProblems: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: 'Specific practice problems to attempt',
    },
  },
  required: ['focusAreas', 'likelyTopics', 'behavioralQuestions'],
};

// Application Strategy schema
export const applicationStrategySchema: Schema = {
  type: Type.OBJECT,
  properties: {
    fitAssessment: {
      type: Type.OBJECT,
      properties: {
        score: { type: Type.NUMBER },
        summary: { type: Type.STRING },
        strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
        gaps: { type: Type.ARRAY, items: { type: Type.STRING } },
        dealBreakers: { type: Type.ARRAY, items: { type: Type.STRING } },
        competitiveness: { type: Type.STRING, enum: ['strong', 'moderate', 'weak'] },
      },
    },
    applicationTiming: { type: Type.STRING, description: 'When to apply and why' },
    customizationTips: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: 'How to tailor resume and application',
    },
    networkingOpportunities: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: 'Ways to network into this role',
    },
    salaryNegotiationNotes: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: 'Salary research and negotiation tips',
    },
    applicationChecklist: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          item: { type: Type.STRING },
          priority: { type: Type.STRING, enum: ['required', 'recommended', 'optional'] },
        },
      },
    },
    followUpStrategy: { type: Type.STRING, description: 'How and when to follow up' },
  },
  required: ['fitAssessment', 'applicationTiming', 'customizationTips', 'applicationChecklist'],
};

// Job Info Extraction schema (for extracting company/role from JD)
export const jobInfoExtractionSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    company: { type: Type.STRING },
    role: { type: Type.STRING },
    location: { type: Type.STRING },
    salaryRange: { type: Type.STRING },
    jobType: { type: Type.STRING, enum: ['fulltime', 'contract', 'freelance'] },
    remote: { type: Type.STRING, enum: ['remote', 'hybrid', 'onsite', 'unknown'] },
    experienceLevel: { type: Type.STRING },
  },
  required: ['company', 'role', 'jobType'],
};

// Resume Analysis schema
export const resumeAnalysisSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    overallScore: { type: Type.NUMBER, description: 'Overall resume quality score 0-100' },
    atsScore: { type: Type.NUMBER, description: 'ATS compatibility score 0-100' },
    strengthAreas: { type: Type.ARRAY, items: { type: Type.STRING } },
    improvementAreas: { type: Type.ARRAY, items: { type: Type.STRING } },
    missingKeywords: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: 'Important keywords missing from resume',
    },
    matchedKeywords: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: 'Keywords present that match job requirements',
    },
    experienceRelevance: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          roleIndex: { type: Type.INTEGER },
          company: { type: Type.STRING },
          title: { type: Type.STRING },
          relevanceScore: { type: Type.NUMBER, description: 'Relevance to target role 0-100' },
          matchedKeywords: { type: Type.ARRAY, items: { type: Type.STRING } },
          reason: { type: Type.STRING },
        },
      },
    },
    recommendedOrder: {
      type: Type.ARRAY,
      items: { type: Type.INTEGER },
      description: 'Recommended order of experiences by index (most relevant first)',
    },
    skillsAnalysis: {
      type: Type.OBJECT,
      properties: {
        strongMatch: { type: Type.ARRAY, items: { type: Type.STRING } },
        partialMatch: { type: Type.ARRAY, items: { type: Type.STRING } },
        missing: { type: Type.ARRAY, items: { type: Type.STRING } },
        irrelevant: { type: Type.ARRAY, items: { type: Type.STRING } },
      },
    },
    summary: { type: Type.STRING, description: 'Overall assessment summary' },
  },
  required: ['overallScore', 'atsScore', 'strengthAreas', 'improvementAreas', 'experienceRelevance', 'recommendedOrder', 'summary'],
};

// Enhancement Suggestions schema
export const enhancementSuggestionsSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    suggestions: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          section: {
            type: Type.STRING,
            enum: ['headline', 'summary', 'experience', 'skills', 'achievements', 'projects'],
          },
          type: {
            type: Type.STRING,
            enum: ['rewrite', 'reorder', 'add', 'remove', 'quantify', 'keyword'],
          },
          targetIndex: { type: Type.INTEGER, description: 'Index for array items (roles, achievements, etc.)' },
          field: { type: Type.STRING, description: 'Specific field within section' },
          original: { type: Type.STRING },
          suggested: { type: Type.STRING },
          reason: { type: Type.STRING },
          impact: { type: Type.STRING, enum: ['high', 'medium', 'low'] },
          keywords: { type: Type.ARRAY, items: { type: Type.STRING } },
        },
        required: ['section', 'type', 'original', 'suggested', 'reason', 'impact'],
      },
    },
  },
  required: ['suggestions'],
};

// Enhanced Profile schema (for preview)
export const enhancedProfileSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    headline: { type: Type.STRING, description: 'Enhanced professional headline' },
    summary: { type: Type.STRING, description: 'Professional summary if generated' },
    technicalSkills: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: 'Reordered/enhanced technical skills',
    },
    softSkills: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: 'Reordered/enhanced soft skills',
    },
    recentRoles: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          originalIndex: { type: Type.INTEGER },
          company: { type: Type.STRING },
          title: { type: Type.STRING },
          duration: { type: Type.STRING },
          relevanceScore: { type: Type.NUMBER },
          highlights: { type: Type.ARRAY, items: { type: Type.STRING }, description: 'Original highlights' },
          enhancedHighlights: { type: Type.ARRAY, items: { type: Type.STRING }, description: 'Improved bullet points' },
        },
      },
    },
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
  },
  required: ['headline', 'technicalSkills', 'recentRoles'],
};

// Skills Roadmap schema - for aspirational jobs with low fit
export const skillsRoadmapSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    currentFitScore: { type: Type.NUMBER, description: 'Current fit score from analysis' },
    targetFitScore: { type: Type.NUMBER, description: 'Estimated fit score after completing roadmap' },
    totalEstimatedTime: { type: Type.STRING, description: 'Total estimated time to become qualified (e.g., "3-6 months")' },
    summary: { type: Type.STRING, description: 'Brief overview of what is needed to become qualified' },
    skillGaps: {
      type: Type.ARRAY,
      description: 'Prioritized list of skills to acquire',
      items: {
        type: Type.OBJECT,
        properties: {
          skill: { type: Type.STRING },
          priority: { type: Type.STRING, enum: ['critical', 'important', 'nice-to-have'] },
          currentLevel: { type: Type.STRING, enum: ['none', 'beginner', 'intermediate', 'advanced'] },
          targetLevel: { type: Type.STRING, enum: ['beginner', 'intermediate', 'advanced', 'expert'] },
          estimatedTime: { type: Type.STRING, description: 'Time to acquire (e.g., "2-4 weeks")' },
          learningResources: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                type: { type: Type.STRING, enum: ['course', 'book', 'tutorial', 'project', 'certification', 'practice'] },
                name: { type: Type.STRING },
                provider: { type: Type.STRING, description: 'Platform or author (e.g., "Coursera", "freeCodeCamp")' },
                url: { type: Type.STRING },
                estimatedHours: { type: Type.NUMBER },
                cost: { type: Type.STRING, enum: ['free', 'paid', 'subscription'] },
              },
            },
          },
          practiceProjects: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: 'Hands-on projects to build this skill',
          },
        },
        required: ['skill', 'priority', 'currentLevel', 'targetLevel', 'estimatedTime'],
      },
    },
    experienceGaps: {
      type: Type.ARRAY,
      description: 'Types of experience needed',
      items: {
        type: Type.OBJECT,
        properties: {
          area: { type: Type.STRING, description: 'Area of experience needed' },
          currentExperience: { type: Type.STRING },
          requiredExperience: { type: Type.STRING },
          howToGain: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: 'Ways to gain this experience',
          },
        },
      },
    },
    steppingStoneRoles: {
      type: Type.ARRAY,
      description: 'Intermediate roles that could help bridge the gap',
      items: {
        type: Type.OBJECT,
        properties: {
          roleTitle: { type: Type.STRING },
          whyItHelps: { type: Type.STRING },
          fitScore: { type: Type.NUMBER, description: 'Estimated current fit for this role' },
          skillsYoullGain: { type: Type.ARRAY, items: { type: Type.STRING } },
        },
      },
    },
    certifications: {
      type: Type.ARRAY,
      description: 'Certifications that would strengthen candidacy',
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          provider: { type: Type.STRING },
          relevance: { type: Type.STRING, enum: ['required', 'highly-valued', 'nice-to-have'] },
          estimatedPrepTime: { type: Type.STRING },
          cost: { type: Type.STRING },
        },
      },
    },
    quickWins: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: 'Things you can do immediately to improve candidacy',
    },
    milestones: {
      type: Type.ARRAY,
      description: 'Key checkpoints on the learning journey',
      items: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          description: { type: Type.STRING },
          estimatedTimeFromStart: { type: Type.STRING },
          expectedFitScore: { type: Type.NUMBER },
        },
      },
    },
    reapplyTimeline: { type: Type.STRING, description: 'Suggested time to wait before reapplying to similar roles' },
  },
  required: ['currentFitScore', 'targetFitScore', 'totalEstimatedTime', 'summary', 'skillGaps', 'quickWins', 'milestones'],
};

// Full Resume Enhancement Response schema (combines analysis + suggestions + preview)
export const resumeEnhancementSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    analysis: {
      type: Type.OBJECT,
      properties: {
        overallScore: { type: Type.NUMBER },
        atsScore: { type: Type.NUMBER },
        strengthAreas: { type: Type.ARRAY, items: { type: Type.STRING } },
        improvementAreas: { type: Type.ARRAY, items: { type: Type.STRING } },
        missingKeywords: { type: Type.ARRAY, items: { type: Type.STRING } },
        matchedKeywords: { type: Type.ARRAY, items: { type: Type.STRING } },
        experienceRelevance: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              roleIndex: { type: Type.INTEGER },
              company: { type: Type.STRING },
              title: { type: Type.STRING },
              relevanceScore: { type: Type.NUMBER },
              matchedKeywords: { type: Type.ARRAY, items: { type: Type.STRING } },
              reason: { type: Type.STRING },
            },
          },
        },
        recommendedOrder: { type: Type.ARRAY, items: { type: Type.INTEGER } },
        skillsAnalysis: {
          type: Type.OBJECT,
          properties: {
            strongMatch: { type: Type.ARRAY, items: { type: Type.STRING } },
            partialMatch: { type: Type.ARRAY, items: { type: Type.STRING } },
            missing: { type: Type.ARRAY, items: { type: Type.STRING } },
            irrelevant: { type: Type.ARRAY, items: { type: Type.STRING } },
          },
        },
        summary: { type: Type.STRING },
      },
    },
    suggestions: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          section: { type: Type.STRING, enum: ['headline', 'summary', 'experience', 'skills', 'achievements', 'projects'] },
          type: { type: Type.STRING, enum: ['rewrite', 'reorder', 'add', 'remove', 'quantify', 'keyword'] },
          targetIndex: { type: Type.INTEGER },
          field: { type: Type.STRING },
          original: { type: Type.STRING },
          suggested: { type: Type.STRING },
          reason: { type: Type.STRING },
          impact: { type: Type.STRING, enum: ['high', 'medium', 'low'] },
          keywords: { type: Type.ARRAY, items: { type: Type.STRING } },
        },
      },
    },
    enhancedProfile: {
      type: Type.OBJECT,
      properties: {
        headline: { type: Type.STRING },
        summary: { type: Type.STRING },
        technicalSkills: { type: Type.ARRAY, items: { type: Type.STRING } },
        softSkills: { type: Type.ARRAY, items: { type: Type.STRING } },
        recentRoles: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              originalIndex: { type: Type.INTEGER },
              company: { type: Type.STRING },
              title: { type: Type.STRING },
              duration: { type: Type.STRING },
              relevanceScore: { type: Type.NUMBER },
              highlights: { type: Type.ARRAY, items: { type: Type.STRING } },
              enhancedHighlights: { type: Type.ARRAY, items: { type: Type.STRING } },
            },
          },
        },
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
      },
    },
  },
  required: ['analysis', 'suggestions', 'enhancedProfile'],
};
