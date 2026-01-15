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
  description: `CRITICAL: Only include entries when there is a REAL VIOLATION. This array should be EMPTY if the job does NOT contain what the candidate wants to avoid.

CORRECT usage (include in array):
- Deal breaker "Pure management roles" + Job IS pure management → INCLUDE (violation)
- Deal breaker "Salary below $150K" + Job pays $120K → INCLUDE (violation)
- Deal breaker "On-site only" + Job requires on-site → INCLUDE (violation)

INCORRECT usage (DO NOT include):
- Deal breaker "Pure management roles" + Job is IC-heavy → DO NOT INCLUDE (no violation - this is GOOD)
- Deal breaker "Salary below $150K" + Job pays $200K → DO NOT INCLUDE (no violation - this is GOOD)
- Deal breaker "On-site only" + Job is fully remote → DO NOT INCLUDE (no violation - this is GOOD)
- Deal breaker "No equity" + Job has equity → DO NOT INCLUDE (no violation - this is GOOD)

If a job DOES NOT have what the candidate wants to avoid, that is a GREEN FLAG, not a deal breaker match.`,
  properties: {
    userDealBreaker: { type: Type.STRING, description: 'The thing the candidate wants to AVOID' },
    jobRequirement: { type: Type.STRING, description: 'What the job ACTUALLY HAS that violates this preference. Must be something BAD/unwanted.' },
    severity: { type: Type.STRING, enum: ['hard', 'soft'], description: 'hard = absolute deal breaker, soft = negotiable concern' },
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
    content: { type: Type.STRING, description: 'The full cover letter text including screening question answers if provided' },
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
    screeningAnswers: {
      type: Type.ARRAY,
      description: 'Answers to screening questions if they were provided',
      items: {
        type: Type.OBJECT,
        properties: {
          question: { type: Type.STRING, description: 'The original screening question' },
          answer: { type: Type.STRING, description: 'The generated answer' },
        },
        required: ['question', 'answer'],
      },
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
    screeningQuestions: {
      type: Type.ARRAY,
      description: 'Required screening questions that applicants must answer (common in Upwork, LinkedIn applications)',
      items: {
        type: Type.OBJECT,
        properties: {
          question: { type: Type.STRING, description: 'The exact screening question text' },
          isRequired: { type: Type.BOOLEAN, description: 'Whether this question is marked as required' },
          questionType: {
            type: Type.STRING,
            enum: ['technical', 'experience', 'availability', 'rate', 'general'],
            description: 'Category of the question',
          },
        },
        required: ['question', 'isRequired', 'questionType'],
      },
    },
  },
  required: ['company', 'role', 'jobType'],
};

// Cover Letter Refinement schema
export const coverLetterRefinementSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    refinedContent: {
      type: Type.STRING,
      description: 'The refined/improved cover letter',
    },
    changes: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          type: {
            type: Type.STRING,
            enum: ['improved', 'added', 'removed', 'restructured'],
          },
          description: { type: Type.STRING },
        },
      },
      description: 'Summary of changes made',
    },
    keywordsAdded: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: 'Keywords from JD that were added',
    },
    wordCount: { type: Type.NUMBER },
    improvements: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: 'Key improvements made to the letter',
    },
  },
  required: ['refinedContent', 'changes', 'wordCount', 'improvements'],
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
          duration: { type: Type.STRING, description: 'Duration with month and year format, e.g., "January 2020 - Present" or "March 2018 - December 2022"' },
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

// Topic Details schema - for expandable study cards in Technical Interview Prep
export const topicDetailsSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    keyConcepts: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: '5-8 key concepts/principles to understand about this topic',
    },
    questions: {
      type: Type.ARRAY,
      description: '4-6 interview questions about this topic, ordered by difficulty',
      items: {
        type: Type.OBJECT,
        properties: {
          question: { type: Type.STRING, description: 'The interview question' },
          difficulty: { type: Type.STRING, enum: ['basic', 'intermediate', 'advanced'] },
          answer: { type: Type.STRING, description: 'A well-structured answer (2-4 paragraphs) with markdown formatting for clarity. Use **bold** for key terms, bullet points for lists, and code blocks for examples.' },
          keyPoints: { type: Type.ARRAY, items: { type: Type.STRING }, description: '3-4 key points the answer should cover' },
          followUp: { type: Type.STRING, description: 'A likely follow-up question the interviewer might ask' },
        },
        required: ['question', 'difficulty', 'answer', 'keyPoints'],
      },
    },
    resources: {
      type: Type.ARRAY,
      description: '3-5 curated learning resources for this topic',
      items: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          url: { type: Type.STRING, description: 'URL to the resource' },
          type: { type: Type.STRING, enum: ['article', 'video', 'course', 'documentation', 'practice'] },
          source: { type: Type.STRING, description: 'Source website or platform (e.g., MDN, YouTube, LeetCode)' },
          description: { type: Type.STRING, description: 'Brief description of what this resource covers' },
          priority: { type: Type.STRING, enum: ['high', 'medium', 'low'] },
        },
        required: ['title', 'url', 'type', 'source', 'description', 'priority'],
      },
    },
    practiceNotes: {
      type: Type.STRING,
      description: 'Tips for how to practice this topic effectively',
    },
  },
  required: ['keyConcepts', 'questions', 'resources'],
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
              duration: { type: Type.STRING, description: 'Duration with month and year format, e.g., "January 2020 - Present" or "March 2018 - December 2022"' },
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

// ============================================
// TOPIC RESEARCH SCHEMAS
// ============================================

// Research Classification schema - determines if a message needs research
export const researchClassificationSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    needsResearch: {
      type: Type.BOOLEAN,
      description: 'Whether this message warrants a web search for current information',
    },
    researchType: {
      type: Type.STRING,
      enum: ['salary', 'industry', 'technical', 'interview'],
      description: 'Type of research needed (null if needsResearch is false)',
    },
    confidence: {
      type: Type.NUMBER,
      description: 'Confidence score 0-100 that research is needed',
    },
    extractedQuery: {
      type: Type.STRING,
      description: 'Refined search query extracted from the message',
    },
    reasoning: {
      type: Type.STRING,
      description: 'Brief explanation of the classification decision',
    },
  },
  required: ['needsResearch', 'confidence', 'extractedQuery', 'reasoning'],
};

// Salary Research schema
export const salaryResearchSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    role: { type: Type.STRING, description: 'The role/job title researched' },
    location: { type: Type.STRING, description: 'Geographic location for salary data' },
    experienceLevel: { type: Type.STRING, description: 'Experience level (junior, mid, senior, etc.)' },
    rangeEstimate: {
      type: Type.OBJECT,
      properties: {
        low: { type: Type.NUMBER, description: 'Lower end of salary range' },
        median: { type: Type.NUMBER, description: 'Median salary' },
        high: { type: Type.NUMBER, description: 'Upper end of salary range' },
        currency: { type: Type.STRING, description: 'Currency code (USD, EUR, etc.)' },
      },
      required: ['low', 'median', 'high', 'currency'],
    },
    factors: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: 'Factors that affect salary for this role',
    },
    byCompanySize: {
      type: Type.OBJECT,
      properties: {
        startup: { type: Type.STRING },
        midsize: { type: Type.STRING },
        enterprise: { type: Type.STRING },
      },
    },
    negotiationTips: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: 'Tips for salary negotiation',
    },
    marketTrend: {
      type: Type.STRING,
      enum: ['increasing', 'stable', 'decreasing'],
      description: 'Current market trend for this role',
    },
    comparison: {
      type: Type.OBJECT,
      properties: {
        vsUserTarget: { type: Type.STRING, enum: ['above', 'within', 'below'] },
        notes: { type: Type.STRING },
      },
    },
    summary: { type: Type.STRING, description: 'Overall salary assessment summary' },
  },
  required: ['role', 'rangeEstimate', 'factors', 'marketTrend', 'summary'],
};

// Industry Research schema
export const industryResearchSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    industry: { type: Type.STRING, description: 'The industry researched' },
    currentTrends: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          trend: { type: Type.STRING },
          impact: { type: Type.STRING, enum: ['high', 'medium', 'low'] },
          description: { type: Type.STRING },
        },
        required: ['trend', 'impact', 'description'],
      },
      description: 'Current trends in the industry',
    },
    emergingTech: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: 'Emerging technologies in this industry',
    },
    marketOutlook: {
      type: Type.STRING,
      enum: ['growing', 'stable', 'contracting'],
      description: 'Overall market outlook',
    },
    keyPlayers: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: 'Key companies in this industry',
    },
    skillsInDemand: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: 'Most in-demand skills',
    },
    challenges: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: 'Current challenges in the industry',
    },
    opportunities: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: 'Current opportunities',
    },
    timeframe: { type: Type.STRING, description: 'Timeframe of analysis (e.g., 2024-2025)' },
    summary: { type: Type.STRING, description: 'Overall industry assessment' },
  },
  required: ['industry', 'currentTrends', 'marketOutlook', 'skillsInDemand', 'summary'],
};

// Technical Research schema
export const technicalResearchSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    topic: { type: Type.STRING, description: 'The technical topic researched' },
    category: {
      type: Type.STRING,
      enum: ['framework', 'language', 'concept', 'tool', 'methodology', 'other'],
    },
    overview: { type: Type.STRING, description: 'Overview of the topic' },
    keyFeatures: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: 'Key features or characteristics',
    },
    useCases: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: 'Common use cases',
    },
    prosAndCons: {
      type: Type.OBJECT,
      properties: {
        pros: { type: Type.ARRAY, items: { type: Type.STRING } },
        cons: { type: Type.ARRAY, items: { type: Type.STRING } },
      },
      required: ['pros', 'cons'],
    },
    alternatives: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          comparison: { type: Type.STRING },
        },
        required: ['name', 'comparison'],
      },
      description: 'Alternative technologies',
    },
    learningResources: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          type: { type: Type.STRING, enum: ['course', 'book', 'tutorial', 'documentation', 'other'] },
          name: { type: Type.STRING },
          url: { type: Type.STRING },
          difficulty: { type: Type.STRING, enum: ['beginner', 'intermediate', 'advanced'] },
        },
        required: ['type', 'name'],
      },
    },
    interviewRelevance: {
      type: Type.OBJECT,
      properties: {
        commonQuestions: { type: Type.ARRAY, items: { type: Type.STRING } },
        keyPointsToKnow: { type: Type.ARRAY, items: { type: Type.STRING } },
      },
      required: ['commonQuestions', 'keyPointsToKnow'],
    },
    marketAdoption: {
      type: Type.STRING,
      enum: ['mainstream', 'growing', 'niche', 'emerging', 'declining'],
    },
    summary: { type: Type.STRING, description: 'Overall technical assessment' },
  },
  required: ['topic', 'category', 'overview', 'keyFeatures', 'prosAndCons', 'interviewRelevance', 'summary'],
};

// Interview Research schema
export const interviewResearchSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    company: { type: Type.STRING, description: 'Company name if specific' },
    role: { type: Type.STRING, description: 'Role if specific' },
    interviewProcess: {
      type: Type.OBJECT,
      properties: {
        stages: { type: Type.ARRAY, items: { type: Type.STRING } },
        typicalDuration: { type: Type.STRING },
        format: { type: Type.STRING },
      },
      required: ['stages'],
    },
    commonQuestions: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          question: { type: Type.STRING },
          category: { type: Type.STRING, enum: ['behavioral', 'technical', 'situational', 'culture', 'other'] },
          tips: { type: Type.STRING },
        },
        required: ['question', 'category'],
      },
    },
    technicalTopics: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: 'Technical topics commonly covered',
    },
    companyValues: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
    },
    whatTheyLookFor: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: 'What interviewers typically look for',
    },
    redFlags: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: 'Things to avoid in the interview',
    },
    tips: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: 'General interview tips',
    },
    recentInsights: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: 'Recent insights from Glassdoor, Blind, etc.',
    },
    difficulty: {
      type: Type.STRING,
      enum: ['easy', 'medium', 'hard'],
    },
    summary: { type: Type.STRING, description: 'Overall interview prep summary' },
  },
  required: ['interviewProcess', 'commonQuestions', 'whatTheyLookFor', 'tips', 'difficulty', 'summary'],
};
