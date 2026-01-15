-- Migration: Add topic_research table for AI Assistant research bank
-- This table stores research results from the AI Assistant's topic research feature

-- Create topic_research table
CREATE TABLE IF NOT EXISTS topic_research (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  profile_id UUID REFERENCES profiles(id) ON DELETE SET NULL,

  -- Research type and query
  type TEXT NOT NULL CHECK (type IN ('salary', 'industry', 'technical', 'interview')),
  query TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed')),

  -- Context linking (optional)
  application_id UUID REFERENCES applications(id) ON DELETE SET NULL,
  analyzed_job_id UUID REFERENCES analyzed_jobs(id) ON DELETE SET NULL,
  company_context TEXT,
  role_context TEXT,

  -- Research data (type-specific JSON)
  data JSONB NOT NULL,

  -- Sources from Google Search grounding
  sources JSONB NOT NULL DEFAULT '[]'::jsonb,
  searched_at TIMESTAMPTZ NOT NULL,

  -- Organization
  tags TEXT[] NOT NULL DEFAULT '{}',
  is_favorite BOOLEAN NOT NULL DEFAULT false,

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for efficient querying
CREATE INDEX idx_topic_research_user_id ON topic_research(user_id);
CREATE INDEX idx_topic_research_type ON topic_research(type);
CREATE INDEX idx_topic_research_application ON topic_research(application_id) WHERE application_id IS NOT NULL;
CREATE INDEX idx_topic_research_profile ON topic_research(profile_id) WHERE profile_id IS NOT NULL;
CREATE INDEX idx_topic_research_searched_at ON topic_research(searched_at DESC);
CREATE INDEX idx_topic_research_is_favorite ON topic_research(is_favorite) WHERE is_favorite = true;

-- Enable Row Level Security
ALTER TABLE topic_research ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only access their own research
CREATE POLICY "Users can view own topic research"
  ON topic_research FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own topic research"
  ON topic_research FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own topic research"
  ON topic_research FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own topic research"
  ON topic_research FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger for automatic updated_at
CREATE OR REPLACE FUNCTION update_topic_research_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER topic_research_updated_at
  BEFORE UPDATE ON topic_research
  FOR EACH ROW
  EXECUTE FUNCTION update_topic_research_updated_at();

-- Comment for documentation
COMMENT ON TABLE topic_research IS 'Stores research results from the AI Assistant topic research feature (salary, industry, technical, interview)';
COMMENT ON COLUMN topic_research.type IS 'Research type: salary, industry, technical, or interview';
COMMENT ON COLUMN topic_research.data IS 'Type-specific research data in JSON format';
COMMENT ON COLUMN topic_research.sources IS 'Array of sources from Google Search grounding';
