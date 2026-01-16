-- Migration: Add user preferences and message feedback tables for AI Assistant learning
-- Created: 2026-01-15

-- =============================================================================
-- USER PREFERENCES TABLE
-- =============================================================================

-- Create user_preferences table for storing learned preferences
CREATE TABLE IF NOT EXISTS user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Preference identification
  category TEXT NOT NULL,  -- 'general', 'communication', 'job-analysis', 'interview-prep', etc.
  key TEXT NOT NULL,       -- Semantic key like 'response_length', 'include_metrics'

  -- Preference value (flexible JSONB for different value types)
  value JSONB NOT NULL,    -- Can store string, boolean, number, or complex values

  -- Learning metadata
  source TEXT NOT NULL,    -- 'explicit', 'feedback', 'correction', 'behavior', 'manual'
  confidence TEXT NOT NULL DEFAULT 'medium',  -- 'low', 'medium', 'high', 'confirmed'
  description TEXT,        -- Human-readable description of the preference

  -- Usage tracking
  applied_count INTEGER NOT NULL DEFAULT 0,
  last_applied_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true,

  -- Examples of when this preference was detected
  examples JSONB DEFAULT '[]'::jsonb,

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Unique constraint: one preference per user + category + key
  UNIQUE(user_id, category, key)
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON user_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_user_preferences_category ON user_preferences(user_id, category);
CREATE INDEX IF NOT EXISTS idx_user_preferences_active ON user_preferences(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_user_preferences_confidence ON user_preferences(user_id, confidence);

-- Enable Row Level Security
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only access their own preferences
CREATE POLICY "Users can view own preferences"
  ON user_preferences FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own preferences"
  ON user_preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own preferences"
  ON user_preferences FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own preferences"
  ON user_preferences FOR DELETE
  USING (auth.uid() = user_id);

-- =============================================================================
-- MESSAGE FEEDBACK TABLE
-- =============================================================================

-- Create message_feedback table for learning from user responses
CREATE TABLE IF NOT EXISTS message_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Message identification
  message_id TEXT NOT NULL,
  chat_id UUID REFERENCES assistant_chats(id) ON DELETE SET NULL,

  -- Feedback data
  rating TEXT NOT NULL CHECK (rating IN ('positive', 'negative')),
  feedback_type TEXT,  -- 'too_long', 'too_short', 'not_helpful', 'wrong_tone', 'perfect', etc.
  correction TEXT,     -- User's correction if provided

  -- Context for learning (what was the conversation about)
  context JSONB NOT NULL DEFAULT '{}'::jsonb,

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_message_feedback_user_id ON message_feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_message_feedback_chat_id ON message_feedback(chat_id);
CREATE INDEX IF NOT EXISTS idx_message_feedback_rating ON message_feedback(user_id, rating);
CREATE INDEX IF NOT EXISTS idx_message_feedback_type ON message_feedback(user_id, feedback_type);
CREATE INDEX IF NOT EXISTS idx_message_feedback_created ON message_feedback(user_id, created_at DESC);

-- Enable Row Level Security
ALTER TABLE message_feedback ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only access their own feedback
CREATE POLICY "Users can view own feedback"
  ON message_feedback FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own feedback"
  ON message_feedback FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Note: No update/delete policies - feedback is immutable for learning integrity

-- =============================================================================
-- TRIGGERS
-- =============================================================================

-- Add trigger for updated_at on user_preferences
CREATE OR REPLACE FUNCTION update_user_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER user_preferences_updated_at
  BEFORE UPDATE ON user_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_user_preferences_updated_at();

-- =============================================================================
-- DOCUMENTATION
-- =============================================================================

-- Add comments for documentation
COMMENT ON TABLE user_preferences IS 'Stores learned user preferences for AI Assistant personalization';
COMMENT ON COLUMN user_preferences.category IS 'Preference category: general, communication, job-analysis, interview-prep, company-research, stories, resume, copilot';
COMMENT ON COLUMN user_preferences.key IS 'Semantic key identifying the preference, e.g., response_length, include_metrics';
COMMENT ON COLUMN user_preferences.value IS 'Preference value as JSONB - can be string, boolean, number, or object';
COMMENT ON COLUMN user_preferences.source IS 'How the preference was learned: explicit, feedback, correction, behavior, manual';
COMMENT ON COLUMN user_preferences.confidence IS 'Confidence level: low, medium, high, confirmed';
COMMENT ON COLUMN user_preferences.examples IS 'Array of example statements/contexts where this preference was detected';

COMMENT ON TABLE message_feedback IS 'Stores user feedback on AI Assistant responses for preference learning';
COMMENT ON COLUMN message_feedback.rating IS 'Positive or negative rating for the response';
COMMENT ON COLUMN message_feedback.feedback_type IS 'Specific feedback type: too_long, too_short, not_helpful, wrong_tone, perfect, etc.';
COMMENT ON COLUMN message_feedback.context IS 'Context object with category, message preview, and user query';
