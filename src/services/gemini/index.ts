// Client and configuration
export { geminiClient, isGeminiAvailable, getApiKeyStatus, requireGemini } from './client';

// AI Functions - with aliases for convenience
export { analyzeJD, analyzeJD as analyzeJobDescription, reanalyzeJD } from './analyze-jd';
export { researchCompany, refreshCompanyResearch, clearCompanyResearchCache } from './research-company';
export { formatExperience, formatExperience as formatExperienceToSTAR, matchStoriesToQuestion } from './format-experience';
export { processDocuments } from './process-documents';
export { createLiveSession, generateInterviewFeedback } from './live-interview';
export { generateTechnicalAnswer, generateFollowUps } from './technical-answers';

// Cache utilities
export { aiCache, cacheKeys } from './cache';

// Schemas (for advanced use cases)
export * from './schemas';
