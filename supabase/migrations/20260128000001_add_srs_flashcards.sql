-- Migration: Add Spaced Repetition System (SRS) for Flashcard Practice
-- Adds SRS data column to technical_answers and creates study tracking tables

-- Add srs_data JSONB column to technical_answers table
ALTER TABLE technical_answers
ADD COLUMN IF NOT EXISTS srs_data JSONB DEFAULT NULL;

-- Create index for efficient querying of due cards
CREATE INDEX IF NOT EXISTS idx_technical_answers_srs_next_review
ON technical_answers ((srs_data->>'nextReviewDate'))
WHERE srs_data IS NOT NULL;

-- Create study_sessions table to track individual study sessions
CREATE TABLE IF NOT EXISTS study_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  profile_id UUID REFERENCES profiles(id) ON DELETE SET NULL,

  -- Session configuration
  mode TEXT NOT NULL CHECK (mode IN ('daily', 'application', 'quick', 'all-due')),
  application_id UUID REFERENCES applications(id) ON DELETE SET NULL,

  -- Session timing
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ,

  -- Session stats
  total_cards INTEGER NOT NULL DEFAULT 0,
  cards_reviewed INTEGER NOT NULL DEFAULT 0,
  cards_remaining INTEGER NOT NULL DEFAULT 0,

  -- Rating distribution (stored as JSONB for flexibility)
  ratings JSONB NOT NULL DEFAULT '{"0": 0, "1": 0, "2": 0, "3": 0, "4": 0, "5": 0}',
  average_rating DECIMAL(3,2) DEFAULT 0,

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create study_progress table to track overall progress and streaks
CREATE TABLE IF NOT EXISTS study_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  profile_id UUID REFERENCES profiles(id) ON DELETE SET NULL,

  -- Streak tracking
  current_streak INTEGER NOT NULL DEFAULT 0,
  longest_streak INTEGER NOT NULL DEFAULT 0,
  last_study_date DATE,

  -- Card statistics
  total_cards_studied INTEGER NOT NULL DEFAULT 0,
  total_reviews INTEGER NOT NULL DEFAULT 0,
  cards_new INTEGER NOT NULL DEFAULT 0,
  cards_learning INTEGER NOT NULL DEFAULT 0,
  cards_reviewing INTEGER NOT NULL DEFAULT 0,
  cards_mastered INTEGER NOT NULL DEFAULT 0,

  -- Performance metrics
  average_easiness_factor DECIMAL(4,2) DEFAULT 2.5,
  average_rating DECIMAL(3,2) DEFAULT 0,

  -- Session stats
  sessions_completed INTEGER NOT NULL DEFAULT 0,
  total_study_time_minutes INTEGER NOT NULL DEFAULT 0,

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Ensure one progress record per user-profile combination
  UNIQUE(user_id, profile_id)
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_study_sessions_user_id ON study_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_study_sessions_profile_id ON study_sessions(profile_id);
CREATE INDEX IF NOT EXISTS idx_study_sessions_started_at ON study_sessions(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_study_progress_user_id ON study_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_study_progress_profile_id ON study_progress(profile_id);
CREATE INDEX IF NOT EXISTS idx_study_progress_last_study ON study_progress(last_study_date DESC);

-- Enable RLS on new tables
ALTER TABLE study_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_progress ENABLE ROW LEVEL SECURITY;

-- RLS Policies for study_sessions
CREATE POLICY "Users can view their own study sessions"
  ON study_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own study sessions"
  ON study_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own study sessions"
  ON study_sessions FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own study sessions"
  ON study_sessions FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for study_progress
CREATE POLICY "Users can view their own study progress"
  ON study_progress FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own study progress"
  ON study_progress FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own study progress"
  ON study_progress FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own study progress"
  ON study_progress FOR DELETE
  USING (auth.uid() = user_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_study_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
DROP TRIGGER IF EXISTS study_sessions_updated_at ON study_sessions;
CREATE TRIGGER study_sessions_updated_at
  BEFORE UPDATE ON study_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_study_updated_at();

DROP TRIGGER IF EXISTS study_progress_updated_at ON study_progress;
CREATE TRIGGER study_progress_updated_at
  BEFORE UPDATE ON study_progress
  FOR EACH ROW
  EXECUTE FUNCTION update_study_updated_at();

-- Comment on tables and columns
COMMENT ON TABLE study_sessions IS 'Tracks individual flashcard study sessions';
COMMENT ON TABLE study_progress IS 'Tracks overall study progress, streaks, and statistics';
COMMENT ON COLUMN technical_answers.srs_data IS 'Spaced repetition data (SM-2 algorithm) for flashcard practice';
