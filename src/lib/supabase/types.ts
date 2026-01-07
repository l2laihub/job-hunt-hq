/**
 * Supabase Database Types
 * Auto-generated from database schema
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          description: string | null;
          color: string | null;
          is_default: boolean;
          display_name: string;
          email: string | null;
          phone: string | null;
          linkedin_url: string | null;
          github_url: string | null;
          portfolio_url: string | null;
          website_url: string | null;
          other_links: Json;
          headline: string;
          years_experience: number;
          current_situation: string;
          technical_skills: Json;
          soft_skills: Json;
          skill_groups: Json;
          industries: Json;
          goals: Json;
          constraints: Json;
          key_achievements: Json;
          recent_roles: Json;
          active_projects: Json;
          preferences: Json;
          freelance_profile: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name?: string;
          description?: string | null;
          color?: string | null;
          is_default?: boolean;
          display_name?: string;
          email?: string | null;
          phone?: string | null;
          linkedin_url?: string | null;
          github_url?: string | null;
          portfolio_url?: string | null;
          website_url?: string | null;
          other_links?: Json;
          headline?: string;
          years_experience?: number;
          current_situation?: string;
          technical_skills?: Json;
          soft_skills?: Json;
          skill_groups?: Json;
          industries?: Json;
          goals?: Json;
          constraints?: Json;
          key_achievements?: Json;
          recent_roles?: Json;
          active_projects?: Json;
          preferences?: Json;
          freelance_profile?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          description?: string | null;
          color?: string | null;
          is_default?: boolean;
          display_name?: string;
          email?: string | null;
          phone?: string | null;
          linkedin_url?: string | null;
          github_url?: string | null;
          portfolio_url?: string | null;
          website_url?: string | null;
          other_links?: Json;
          headline?: string;
          years_experience?: number;
          current_situation?: string;
          technical_skills?: Json;
          soft_skills?: Json;
          skill_groups?: Json;
          industries?: Json;
          goals?: Json;
          constraints?: Json;
          key_achievements?: Json;
          recent_roles?: Json;
          active_projects?: Json;
          preferences?: Json;
          freelance_profile?: Json;
          created_at?: string;
          updated_at?: string;
        };
      };
      applications: {
        Row: {
          id: string;
          user_id: string;
          profile_id: string | null;
          type: 'fulltime' | 'freelance';
          company: string;
          role: string;
          status: 'wishlist' | 'applied' | 'interviewing' | 'offer' | 'rejected';
          source: 'linkedin' | 'upwork' | 'direct' | 'referral' | 'other' | null;
          salary_range: string | null;
          date_applied: string | null;
          notes: string;
          job_description_raw: string | null;
          platform: 'upwork' | 'direct' | 'other' | null;
          proposal_sent: string | null;
          analysis: Json | null;
          company_research: Json | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          profile_id?: string | null;
          type?: 'fulltime' | 'freelance';
          company: string;
          role: string;
          status?: 'wishlist' | 'applied' | 'interviewing' | 'offer' | 'rejected';
          source?: 'linkedin' | 'upwork' | 'direct' | 'referral' | 'other' | null;
          salary_range?: string | null;
          date_applied?: string | null;
          notes?: string;
          job_description_raw?: string | null;
          platform?: 'upwork' | 'direct' | 'other' | null;
          proposal_sent?: string | null;
          analysis?: Json | null;
          company_research?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          profile_id?: string | null;
          type?: 'fulltime' | 'freelance';
          company?: string;
          role?: string;
          status?: 'wishlist' | 'applied' | 'interviewing' | 'offer' | 'rejected';
          source?: 'linkedin' | 'upwork' | 'direct' | 'referral' | 'other' | null;
          salary_range?: string | null;
          date_applied?: string | null;
          notes?: string;
          job_description_raw?: string | null;
          platform?: 'upwork' | 'direct' | 'other' | null;
          proposal_sent?: string | null;
          analysis?: Json | null;
          company_research?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      stories: {
        Row: {
          id: string;
          user_id: string;
          profile_id: string | null;
          title: string;
          raw_input: string;
          input_method: 'manual' | 'voice' | 'import';
          star: Json;
          metrics: Json;
          tags: string[];
          variations: Json;
          follow_up_questions: string[];
          coaching_notes: string | null;
          used_in_interviews: string[];
          times_used: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          profile_id?: string | null;
          title: string;
          raw_input?: string;
          input_method?: 'manual' | 'voice' | 'import';
          star?: Json;
          metrics?: Json;
          tags?: string[];
          variations?: Json;
          follow_up_questions?: string[];
          coaching_notes?: string | null;
          used_in_interviews?: string[];
          times_used?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          profile_id?: string | null;
          title?: string;
          raw_input?: string;
          input_method?: 'manual' | 'voice' | 'import';
          star?: Json;
          metrics?: Json;
          tags?: string[];
          variations?: Json;
          follow_up_questions?: string[];
          coaching_notes?: string | null;
          used_in_interviews?: string[];
          times_used?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      company_research: {
        Row: {
          id: string;
          user_id: string;
          company_name: string;
          role_context: string | null;
          overview: Json;
          recent_news: Json;
          engineering_culture: Json;
          red_flags: Json;
          green_flags: Json;
          key_people: Json;
          interview_intel: Json;
          verdict: Json;
          sources_used: string[];
          searched_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          company_name: string;
          role_context?: string | null;
          overview?: Json;
          recent_news?: Json;
          engineering_culture?: Json;
          red_flags?: Json;
          green_flags?: Json;
          key_people?: Json;
          interview_intel?: Json;
          verdict?: Json;
          sources_used?: string[];
          searched_at?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          company_name?: string;
          role_context?: string | null;
          overview?: Json;
          recent_news?: Json;
          engineering_culture?: Json;
          red_flags?: Json;
          green_flags?: Json;
          key_people?: Json;
          interview_intel?: Json;
          verdict?: Json;
          sources_used?: string[];
          searched_at?: string;
          created_at?: string;
        };
      };
      technical_answers: {
        Row: {
          id: string;
          user_id: string;
          profile_id: string | null;
          question: string;
          question_type: 'behavioral-technical' | 'conceptual' | 'system-design' | 'problem-solving' | 'experience';
          format: Json;
          sources: Json;
          answer: Json;
          follow_ups: Json;
          metadata: Json;
          used_in_interviews: string[];
          times_used: number;
          practice_count: number;
          last_practiced_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          profile_id?: string | null;
          question: string;
          question_type?: 'behavioral-technical' | 'conceptual' | 'system-design' | 'problem-solving' | 'experience';
          format?: Json;
          sources?: Json;
          answer?: Json;
          follow_ups?: Json;
          metadata?: Json;
          used_in_interviews?: string[];
          times_used?: number;
          practice_count?: number;
          last_practiced_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          profile_id?: string | null;
          question?: string;
          question_type?: 'behavioral-technical' | 'conceptual' | 'system-design' | 'problem-solving' | 'experience';
          format?: Json;
          sources?: Json;
          answer?: Json;
          follow_ups?: Json;
          metadata?: Json;
          used_in_interviews?: string[];
          times_used?: number;
          practice_count?: number;
          last_practiced_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      practice_sessions: {
        Row: {
          id: string;
          user_id: string;
          answer_id: string;
          duration_seconds: number | null;
          notes: string | null;
          self_rating: number | null;
          areas_to_improve: string[];
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          answer_id: string;
          duration_seconds?: number | null;
          notes?: string | null;
          self_rating?: number | null;
          areas_to_improve?: string[];
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          answer_id?: string;
          duration_seconds?: number | null;
          notes?: string | null;
          self_rating?: number | null;
          areas_to_improve?: string[];
          created_at?: string;
        };
      };
      analyzed_jobs: {
        Row: {
          id: string;
          user_id: string;
          profile_id: string | null;
          application_id: string | null;
          job_description: string;
          type: 'fulltime' | 'freelance' | 'contract';
          company: string | null;
          role: string | null;
          location: string | null;
          salary_range: string | null;
          source: string | null;
          job_url: string | null;
          analysis: Json;
          cover_letters: Json;
          phone_screen_prep: Json | null;
          technical_interview_prep: Json | null;
          application_strategy: Json | null;
          skills_roadmap: Json | null;
          screening_questions: Json;
          application_questions: Json;
          is_favorite: boolean;
          notes: string | null;
          tags: string[];
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          profile_id?: string | null;
          application_id?: string | null;
          job_description: string;
          type?: 'fulltime' | 'freelance' | 'contract';
          company?: string | null;
          role?: string | null;
          location?: string | null;
          salary_range?: string | null;
          source?: string | null;
          job_url?: string | null;
          analysis: Json;
          cover_letters?: Json;
          phone_screen_prep?: Json | null;
          technical_interview_prep?: Json | null;
          application_strategy?: Json | null;
          skills_roadmap?: Json | null;
          screening_questions?: Json;
          application_questions?: Json;
          is_favorite?: boolean;
          notes?: string | null;
          tags?: string[];
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          profile_id?: string | null;
          application_id?: string | null;
          job_description?: string;
          type?: 'fulltime' | 'freelance' | 'contract';
          company?: string | null;
          role?: string | null;
          location?: string | null;
          salary_range?: string | null;
          source?: string | null;
          job_url?: string | null;
          analysis?: Json;
          cover_letters?: Json;
          phone_screen_prep?: Json | null;
          technical_interview_prep?: Json | null;
          application_strategy?: Json | null;
          skills_roadmap?: Json | null;
          screening_questions?: Json;
          application_questions?: Json;
          is_favorite?: boolean;
          notes?: string | null;
          tags?: string[];
          created_at?: string;
          updated_at?: string;
        };
      };
      enhancements: {
        Row: {
          id: string;
          user_id: string;
          profile_id: string | null;
          mode: 'professional' | 'job-tailored';
          job_id: string | null;
          job_title: string | null;
          company_name: string | null;
          analysis: Json;
          suggestions: Json;
          applied_suggestion_ids: string[];
          enhanced_profile: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          profile_id?: string | null;
          mode?: 'professional' | 'job-tailored';
          job_id?: string | null;
          job_title?: string | null;
          company_name?: string | null;
          analysis: Json;
          suggestions?: Json;
          applied_suggestion_ids?: string[];
          enhanced_profile: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          profile_id?: string | null;
          mode?: 'professional' | 'job-tailored';
          job_id?: string | null;
          job_title?: string | null;
          company_name?: string | null;
          analysis?: Json;
          suggestions?: Json;
          applied_suggestion_ids?: string[];
          enhanced_profile?: Json;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}

// Helper types
export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row'];
export type Insertable<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert'];
export type Updatable<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update'];

// Convenience exports
export type ProfileRow = Tables<'profiles'>;
export type ApplicationRow = Tables<'applications'>;
export type StoryRow = Tables<'stories'>;
export type CompanyResearchRow = Tables<'company_research'>;
export type TechnicalAnswerRow = Tables<'technical_answers'>;
export type PracticeSessionRow = Tables<'practice_sessions'>;
export type AnalyzedJobRow = Tables<'analyzed_jobs'>;
export type EnhancementRow = Tables<'enhancements'>;
