import { GoogleGenAI } from '@google/genai';

// Get API key from environment
const apiKey = import.meta.env.VITE_GEMINI_API_KEY || (typeof process !== 'undefined' ? process.env.GEMINI_API_KEY : undefined);

// Create Gemini client
export const geminiClient = apiKey ? new GoogleGenAI({ apiKey }) : null;

// Check if API is available
export function isGeminiAvailable(): boolean {
  return geminiClient !== null;
}

// Get API key status for UI
export function getApiKeyStatus(): 'available' | 'missing' {
  return apiKey ? 'available' : 'missing';
}

// Throw a helpful error if API is not available
export function requireGemini(): GoogleGenAI {
  if (!geminiClient) {
    throw new Error(
      'Gemini API key is not configured. Please set VITE_GEMINI_API_KEY in your .env.local file.'
    );
  }
  return geminiClient;
}

// Default model configuration
export const DEFAULT_MODEL = 'gemini-2.5-flash';
export const LIVE_MODEL = 'gemini-2.5-flash-native-audio-preview-09-2025';

// Default thinking budget
export const DEFAULT_THINKING_BUDGET = 1024;
export const MAX_THINKING_BUDGET = 2048;
