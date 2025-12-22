// Client and configuration
export { geminiClient, isGeminiAvailable, getApiKeyStatus, requireGemini } from './client';

// AI Functions - with aliases for convenience
export { analyzeJD, analyzeJD as analyzeJobDescription, reanalyzeJD } from './analyze-jd';
export { extractJobInfo, type ScreeningQuestion, type ExtractedJobInfo } from './extract-job-info';
export { researchCompany, refreshCompanyResearch, clearCompanyResearchCache } from './research-company';
export { formatExperience, formatExperience as formatExperienceToSTAR, matchStoriesToQuestion } from './format-experience';
export { processDocuments } from './process-documents';
export { createLiveSession, generateInterviewFeedback } from './live-interview';
export { generateTechnicalAnswer, generateFollowUps } from './technical-answers';
export { generateCoverLetter, refineCoverLetter, type RefinementMode } from './cover-letter';
export { generatePhoneScreenPrep, generateTechnicalInterviewPrep, generateApplicationStrategy } from './interview-prep';
export { predictInterviewQuestions, matchStoryToQuestion } from './predict-questions';
export { generateQuickReference, generateQuickRefFromSession } from './generate-quick-ref';
export { generateStarAnswer, refineStarAnswer, answerToExperience, type GeneratedAnswer, type GenerateAnswerParams, type RefineAnswerParams } from './generate-star-answer';
export { generateNarrative, generateQuickNarrative, type GenerateNarrativeParams } from './generate-narrative';
export { generateTopicDetails } from './topic-details';
export { enhanceResume, analyzeResumeQuick } from './resume-enhance';
export { generateSkillsRoadmap } from './skills-roadmap';
export { generateApplicationAnswer, generateBatchApplicationAnswers } from './application-questions';

// Cache utilities
export { aiCache, cacheKeys } from './cache';

// Schemas (for advanced use cases)
export * from './schemas';
