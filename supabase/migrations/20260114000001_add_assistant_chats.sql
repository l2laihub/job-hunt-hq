-- Migration: Add assistant_chats table for AI Assistant conversations
-- Created: 2026-01-14

-- Create assistant_chats table
CREATE TABLE IF NOT EXISTS assistant_chats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  application_id UUID REFERENCES applications(id) ON DELETE SET NULL,
  profile_id UUID REFERENCES profiles(id) ON DELETE SET NULL,

  -- Chat metadata
  title TEXT NOT NULL,
  context_type TEXT NOT NULL,  -- 'general', 'application', 'interview-prep', 'company-research', 'story', 'profile'
  context_summary JSONB NOT NULL DEFAULT '{}'::jsonb,  -- Snapshot of context: company, role, profileName, etc.

  -- Chat content (stored as JSONB array)
  messages JSONB NOT NULL DEFAULT '[]'::jsonb,

  -- Stats
  message_count INTEGER NOT NULL DEFAULT 0,
  last_message_at TIMESTAMPTZ,
  is_pinned BOOLEAN NOT NULL DEFAULT false,

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_assistant_chats_user_id ON assistant_chats(user_id);
CREATE INDEX IF NOT EXISTS idx_assistant_chats_application_id ON assistant_chats(application_id);
CREATE INDEX IF NOT EXISTS idx_assistant_chats_profile_id ON assistant_chats(profile_id);
CREATE INDEX IF NOT EXISTS idx_assistant_chats_last_message ON assistant_chats(last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_assistant_chats_context_type ON assistant_chats(context_type);

-- Enable Row Level Security
ALTER TABLE assistant_chats ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only access their own chats
CREATE POLICY "Users can view own assistant chats"
  ON assistant_chats FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own assistant chats"
  ON assistant_chats FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own assistant chats"
  ON assistant_chats FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own assistant chats"
  ON assistant_chats FOR DELETE
  USING (auth.uid() = user_id);

-- Add trigger for updated_at
CREATE OR REPLACE FUNCTION update_assistant_chats_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER assistant_chats_updated_at
  BEFORE UPDATE ON assistant_chats
  FOR EACH ROW
  EXECUTE FUNCTION update_assistant_chats_updated_at();

-- Add comments for documentation
COMMENT ON TABLE assistant_chats IS 'Stores AI Assistant chat conversations with context-aware history per application';
COMMENT ON COLUMN assistant_chats.context_type IS 'Type of context: general, application, interview-prep, company-research, story, profile';
COMMENT ON COLUMN assistant_chats.context_summary IS 'Snapshot of context when chat was started (company, role, profileName, description)';
COMMENT ON COLUMN assistant_chats.messages IS 'Array of AssistantMessage objects with role, content, timestamp, and metadata';
