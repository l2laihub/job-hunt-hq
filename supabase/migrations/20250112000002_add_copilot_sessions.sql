-- Migration: Add copilot_sessions table for Interview Copilot history
-- Created: 2025-01-12

-- Create copilot_sessions table
CREATE TABLE IF NOT EXISTS copilot_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  profile_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  application_id UUID REFERENCES applications(id) ON DELETE SET NULL,

  -- Session metadata
  title TEXT NOT NULL,
  company TEXT,
  role TEXT,

  -- Session timing
  started_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ NOT NULL,
  duration_ms INTEGER NOT NULL DEFAULT 0,

  -- Session content (stored as JSONB for flexibility)
  transcript JSONB NOT NULL DEFAULT '[]'::jsonb,
  detected_questions JSONB NOT NULL DEFAULT '[]'::jsonb,
  suggestions JSONB NOT NULL DEFAULT '[]'::jsonb,

  -- Context that was used
  context_used JSONB NOT NULL DEFAULT '{}'::jsonb,

  -- Session stats
  stats JSONB NOT NULL DEFAULT '{"questionsDetected": 0, "suggestionsGenerated": 0, "avgResponseTimeMs": 0}'::jsonb,

  -- User feedback (optional, can be added later)
  feedback JSONB,

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_copilot_sessions_user_id ON copilot_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_copilot_sessions_profile_id ON copilot_sessions(profile_id);
CREATE INDEX IF NOT EXISTS idx_copilot_sessions_application_id ON copilot_sessions(application_id);
CREATE INDEX IF NOT EXISTS idx_copilot_sessions_started_at ON copilot_sessions(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_copilot_sessions_company ON copilot_sessions(company);

-- Enable Row Level Security
ALTER TABLE copilot_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only access their own sessions
CREATE POLICY "Users can view own copilot sessions"
  ON copilot_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own copilot sessions"
  ON copilot_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own copilot sessions"
  ON copilot_sessions FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own copilot sessions"
  ON copilot_sessions FOR DELETE
  USING (auth.uid() = user_id);

-- Add trigger for updated_at
CREATE OR REPLACE FUNCTION update_copilot_sessions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER copilot_sessions_updated_at
  BEFORE UPDATE ON copilot_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_copilot_sessions_updated_at();

-- Add comments for documentation
COMMENT ON TABLE copilot_sessions IS 'Stores Interview Copilot session history with questions, answers, and feedback';
COMMENT ON COLUMN copilot_sessions.transcript IS 'Array of CopilotTranscriptEntry objects';
COMMENT ON COLUMN copilot_sessions.detected_questions IS 'Array of DetectedQuestion objects';
COMMENT ON COLUMN copilot_sessions.suggestions IS 'Array of CopilotSuggestion objects';
COMMENT ON COLUMN copilot_sessions.feedback IS 'CopilotSessionFeedback object with ratings and notes';
