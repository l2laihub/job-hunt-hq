/**
 * AI Assistant (Prep) Types
 * Types for the context-aware AI assistant chat feature
 */

import type {
  JobApplication,
  AnalyzedJob,
  CompanyResearch,
  Experience,
  UserProfileWithMeta,
} from './index';
import type { InterviewPrepSession } from './interview-prep';
import type { TopicResearchType } from './topic-research';

// ============================================
// CONTEXT TYPES
// ============================================

/**
 * Context types the assistant can work with
 */
export type AssistantContextType =
  | 'general'           // No specific context, general career advice
  | 'application'       // Viewing/working on a specific job application
  | 'interview-prep'    // In interview prep mode for a specific application
  | 'company-research'  // Viewing company research
  | 'story'             // Working on a STAR story
  | 'profile'           // Editing profile
  | 'enhancement';      // Resume enhancement

/**
 * What data is available in the current context
 */
export interface AssistantContext {
  type: AssistantContextType;
  route: string;

  // Linked entity IDs
  applicationId?: string;
  storyId?: string;
  prepSessionId?: string;

  // Loaded data (for display and prompt building)
  application?: JobApplication;
  analyzedJob?: AnalyzedJob;
  companyResearch?: CompanyResearch;
  prepSession?: InterviewPrepSession;
  stories?: Experience[];
  profile?: UserProfileWithMeta;

  // Summary for display in UI
  summary: string;

  // Quick action suggestions based on context
  suggestions: string[];
}

// ============================================
// MESSAGE TYPES
// ============================================

/**
 * Metadata about what context was used in generation
 */
export interface MessageContextUsed {
  profileSummary?: boolean;
  applicationData?: boolean;
  companyResearch?: boolean;
  storyIds?: string[];
  prepSession?: boolean;
}

/**
 * A single message in the assistant chat
 */
export interface AssistantMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;

  // Generation metadata (for assistant messages)
  generationTimeMs?: number;
  contextUsed?: MessageContextUsed;

  // Rich response data from AI
  suggestions?: string[];        // Follow-up suggestions
  relatedStoryIds?: string[];   // Stories referenced in response
  actionItems?: string[];       // Actionable next steps

  // Error state
  isError?: boolean;
  errorMessage?: string;

  // Research metadata (when research was used to generate response)
  researchUsed?: {
    id: string;
    type: TopicResearchType;
    savedToBank: boolean;
  };
}

// ============================================
// CHAT SESSION TYPES
// ============================================

/**
 * Summary of context when chat was started (stored in DB)
 */
export interface ChatContextSummary {
  company?: string;
  role?: string;
  profileName?: string;
  description?: string;
}

/**
 * Full chat session
 */
export interface AssistantChat {
  id: string;
  userId?: string;

  // Context when chat was started
  applicationId?: string;
  profileId?: string;
  contextType: AssistantContextType;
  contextSummary: ChatContextSummary;

  // Chat content
  title: string;
  messages: AssistantMessage[];
  messageCount: number;
  lastMessageAt?: string;

  // UI state
  isPinned: boolean;

  // Metadata
  createdAt: string;
  updatedAt: string;
}

// ============================================
// STORE TYPES
// ============================================

/**
 * Assistant store state
 */
export interface AssistantState {
  // UI state
  isOpen: boolean;
  isMinimized: boolean;

  // Current chat
  currentChatId: string | null;
  currentChat: AssistantChat | null;

  // Chat history
  recentChats: AssistantChat[];

  // Processing state
  isLoading: boolean;
  isStreaming: boolean;
  streamingContent: string;

  // Context
  currentContext: AssistantContext | null;

  // Actions
  toggleSidebar: () => void;
  minimize: () => void;
  maximize: () => void;
  setContext: (context: AssistantContext) => void;

  // Chat actions
  startNewChat: (context?: AssistantContext) => Promise<void>;
  loadChat: (chatId: string) => Promise<void>;
  sendMessage: (content: string) => Promise<void>;
  deleteChat: (chatId: string) => Promise<void>;
  pinChat: (chatId: string, pinned: boolean) => Promise<void>;

  // History
  loadRecentChats: () => Promise<void>;

  // Reset
  reset: () => void;
}

// ============================================
// SETTINGS TYPES
// ============================================

/**
 * User settings for the assistant
 */
export interface AssistantSettings {
  autoLoadContext: boolean;     // Auto-load context from current page
  showContextPanel: boolean;    // Show what context is loaded
  streamResponses: boolean;     // Stream or wait for full response
  maxHistoryChats: number;      // How many to keep in sidebar
}

/**
 * Default assistant settings
 */
export const DEFAULT_ASSISTANT_SETTINGS: AssistantSettings = {
  autoLoadContext: true,
  showContextPanel: true,
  streamResponses: true,
  maxHistoryChats: 10,
};

// ============================================
// DATABASE ROW TYPES
// ============================================

/**
 * Database row type for assistant_chats table
 */
export interface AssistantChatRow {
  id: string;
  user_id: string;
  application_id: string | null;
  profile_id: string | null;
  title: string;
  context_type: string;
  context_summary: ChatContextSummary;
  messages: AssistantMessage[];
  message_count: number;
  last_message_at: string | null;
  is_pinned: boolean;
  created_at: string;
  updated_at: string;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Create a new assistant message
 */
export function createAssistantMessage(
  role: 'user' | 'assistant',
  content: string,
  metadata?: Partial<AssistantMessage>
): AssistantMessage {
  return {
    id: crypto.randomUUID(),
    role,
    content,
    timestamp: new Date().toISOString(),
    ...metadata,
  };
}

/**
 * Create a new assistant chat
 */
export function createAssistantChat(
  context?: AssistantContext
): Omit<AssistantChat, 'id' | 'userId' | 'createdAt' | 'updatedAt'> {
  const now = new Date().toISOString();

  // Generate title based on context
  let title = 'New Chat';
  const contextSummary: ChatContextSummary = {};

  if (context) {
    if (context.application) {
      title = `${context.application.company} - ${context.application.role}`;
      contextSummary.company = context.application.company;
      contextSummary.role = context.application.role;
    } else if (context.profile) {
      title = `General - ${context.profile.metadata.name}`;
      contextSummary.profileName = context.profile.metadata.name;
    }
    contextSummary.description = context.summary;
  }

  return {
    applicationId: context?.applicationId,
    profileId: context?.profile?.metadata.id,
    contextType: context?.type || 'general',
    contextSummary,
    title,
    messages: [],
    messageCount: 0,
    isPinned: false,
  };
}

/**
 * Convert database row to AssistantChat
 */
export function assistantChatRowToChat(row: AssistantChatRow): AssistantChat {
  return {
    id: row.id,
    userId: row.user_id,
    applicationId: row.application_id || undefined,
    profileId: row.profile_id || undefined,
    contextType: row.context_type as AssistantContextType,
    contextSummary: row.context_summary,
    title: row.title,
    messages: row.messages,
    messageCount: row.message_count,
    lastMessageAt: row.last_message_at || undefined,
    isPinned: row.is_pinned,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Convert AssistantChat to database row
 */
export function assistantChatToRow(
  chat: Omit<AssistantChat, 'id' | 'userId' | 'createdAt' | 'updatedAt'>,
  userId: string
): Omit<AssistantChatRow, 'id' | 'created_at' | 'updated_at'> {
  return {
    user_id: userId,
    application_id: chat.applicationId || null,
    profile_id: chat.profileId || null,
    title: chat.title,
    context_type: chat.contextType,
    context_summary: chat.contextSummary,
    messages: chat.messages,
    message_count: chat.messageCount,
    last_message_at: chat.lastMessageAt || null,
    is_pinned: chat.isPinned,
  };
}

// ============================================
// CONSTANTS
// ============================================

/**
 * Assistant name for UI and prompts
 */
export const ASSISTANT_NAME = 'Prep';

/**
 * Quick action suggestions by context type
 */
export const CONTEXT_SUGGESTIONS: Record<AssistantContextType, string[]> = {
  general: [
    'Help me improve my resume',
    'What should I focus on in my job search?',
    'Research salary trends for my target role',
    'What are the industry trends in tech?',
  ],
  application: [
    'How well do I fit this role?',
    'Research salary range for this role',
    'Interview tips for this company',
    'What questions should I ask them?',
  ],
  'interview-prep': [
    'What are the most likely questions?',
    'Help me practice answering questions',
    'Research interview process at this company',
    'What technical topics should I prepare?',
  ],
  'company-research': [
    'What are the red flags I should watch for?',
    'How does this company compare to others?',
    'Research interview process here',
    'Is this a good company to work for?',
  ],
  story: [
    'How can I improve this story?',
    'What metrics should I include?',
    'Help me practice telling this story',
    'What follow-up questions might I get?',
  ],
  profile: [
    'How can I improve my headline?',
    'What skills should I highlight?',
    'Research in-demand skills for my roles',
    'Review my profile completeness',
  ],
  enhancement: [
    'What are the most important changes?',
    'How can I improve my ATS score?',
    'Research keywords for this role',
    'What skills am I missing?',
  ],
};
