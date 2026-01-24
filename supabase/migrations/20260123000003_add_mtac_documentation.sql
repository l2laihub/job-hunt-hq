-- Add MTAC Intelligence Copilot Project Documentation
-- This populates the project_documentation table with detailed info from the technical docs

-- ============================================
-- ENSURE PROJECT_DOCUMENTATION TABLE EXISTS
-- ============================================
CREATE TABLE IF NOT EXISTS public.project_documentation (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  profile_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  project_id text NOT NULL,
  project_name text NOT NULL,
  documentation jsonb DEFAULT '{
    "screenshots": [],
    "architectureDiagrams": [],
    "technicalDecisions": [],
    "challenges": [],
    "metrics": [],
    "systemContext": "",
    "integrations": [],
    "teamSize": null,
    "duration": "",
    "myRole": "",
    "aiSummary": "",
    "talkingPoints": [],
    "interviewQuestions": []
  }'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, project_id)
);

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS project_docs_user_id_idx ON public.project_documentation(user_id);
CREATE INDEX IF NOT EXISTS project_docs_profile_id_idx ON public.project_documentation(profile_id);
CREATE INDEX IF NOT EXISTS project_docs_project_id_idx ON public.project_documentation(project_id);

-- Enable RLS
ALTER TABLE public.project_documentation ENABLE ROW LEVEL SECURITY;

-- RLS Policies (use CREATE POLICY IF NOT EXISTS pattern via DO block)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'project_documentation' AND policyname = 'Users can view own project documentation') THEN
    CREATE POLICY "Users can view own project documentation" ON public.project_documentation FOR SELECT USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'project_documentation' AND policyname = 'Users can insert own project documentation') THEN
    CREATE POLICY "Users can insert own project documentation" ON public.project_documentation FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'project_documentation' AND policyname = 'Users can update own project documentation') THEN
    CREATE POLICY "Users can update own project documentation" ON public.project_documentation FOR UPDATE USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'project_documentation' AND policyname = 'Users can delete own project documentation') THEN
    CREATE POLICY "Users can delete own project documentation" ON public.project_documentation FOR DELETE USING (auth.uid() = user_id);
  END IF;
END $$;

-- ============================================
-- CONFIGURATION - USE SAME VALUES AS BEFORE
-- ============================================
DO $$
DECLARE
  v_user_id uuid := '2a37edd5-f768-4b25-b2c9-e25909889ebb'::uuid;
  v_profile_id uuid := 'efdd281e-3c4a-4452-9534-1ba4b6a16b08'::uuid;
  v_project_id text := 'mtac-intelligence-copilot';  -- Use consistent project identifier
  v_now timestamptz := now();
BEGIN
  RAISE NOTICE 'Using project ID: %', v_project_id;

  -- Insert or update project documentation
  INSERT INTO project_documentation (
    user_id,
    profile_id,
    project_id,
    project_name,
    documentation,
    created_at,
    updated_at
  ) VALUES (
    v_user_id,
    v_profile_id,
    v_project_id,
    'MTAC Intelligence Copilot',
    jsonb_build_object(
      -- Visual assets (empty for now - would need actual files)
      'screenshots', '[]'::jsonb,
      'architectureDiagrams', '[]'::jsonb,
      'documentFiles', '[]'::jsonb,

      -- System Context
      'systemContext', 'Microsoft''s first production GraphRAG-based AI system for threat intelligence analysis at the Microsoft Threat Analysis Center (MTAC). The system enables analysts to query across the entire document corpus of threat intelligence reports, automatically extracting entities (threat actors, malware, vulnerabilities) and their relationships to build a comprehensive knowledge graph. Unlike traditional SharePoint search that returns individual documents, Intel Copilot analyzes patterns across thousands of documents, enabling corpus-wide queries like "Who are Vladimir Putin''s known associates involved in election interference?" with full citation tracking.',

      -- My Role
      'myRole', 'Software Design Engineer 3, CST-E Division. Led the technical design and implementation of the production GraphRAG system. Responsibilities included: designing the end-to-end architecture, implementing the custom GPT-4 load balancer, developing domain-specific entity extraction prompts, collaborating with Microsoft Research to adapt the IRE engine for production, building the React frontend with D3.js graph visualization, and leading the compliance certification process (SFI, SDL, Responsible AI).',

      -- Duration
      'duration', 'August 2023 - March 2025 (19 months)',

      -- Team Size
      'teamSize', 5,

      -- Integrations
      'integrations', jsonb_build_array(
        'SharePoint (document source)',
        'Azure OpenAI Service (GPT-4, GPT-4o Mini, text-embedding-ada-002)',
        'Cosmos DB (knowledge graph storage)',
        'Azure Cognitive Search (hybrid vector search)',
        'Azure Functions (document ingestion)',
        'Databricks (Python processing)',
        'Azure Data Factory (daily pipeline orchestration)',
        'Azure Kubernetes Service (container orchestration)',
        'Microsoft Research IRE Engine (GraphRAG)',
        'Azure AD (authentication)',
        'Application Insights (monitoring)'
      ),

      -- Technical Decisions
      'technicalDecisions', jsonb_build_array(
        jsonb_build_object(
          'id', gen_random_uuid()::text,
          'decision', 'GraphRAG over Traditional RAG',
          'context', 'Analysts needed to understand patterns and relationships across thousands of documents, not just retrieve individual documents',
          'alternatives', jsonb_build_array('Traditional RAG with vector search only', 'Keyword-based search', 'Manual knowledge graph construction'),
          'rationale', 'GraphRAG enables corpus-wide analysis by automatically constructing knowledge graphs of entities and relationships, allowing queries that traverse connections across documents',
          'outcome', 'Enabled queries like "Show all organizations APT28 has targeted" - impossible with traditional RAG. Became Microsoft''s first production GraphRAG system.',
          'tags', jsonb_build_array('architecture', 'ai', 'graphrag')
        ),
        jsonb_build_object(
          'id', gen_random_uuid()::text,
          'decision', 'Hybrid Search (Vector + Keyword + Graph)',
          'context', 'Vector-only search missed exact keyword matches; graph relationships weren''t being leveraged in retrieval',
          'alternatives', jsonb_build_array('Vector search only', 'Keyword search only', 'Sequential search methods'),
          'rationale', 'Combining three retrieval strategies covers different query types: semantic similarity (vectors), exact terms (keywords), and relationship traversal (graph)',
          'outcome', '94% citation accuracy from reduced retrieval noise. Queries now find semantically related content AND exact matches AND connected entities.',
          'tags', jsonb_build_array('search', 'retrieval', 'architecture')
        ),
        jsonb_build_object(
          'id', gen_random_uuid()::text,
          'decision', 'Custom Load Balancer for GPT-4 Endpoints',
          'context', 'Single GPT-4 endpoint had 240 req/min rate limit causing 15% throttling during peak hours',
          'alternatives', jsonb_build_array('Azure built-in load balancing', 'Queue-based rate limiting', 'Single endpoint with retry logic'),
          'rationale', 'Built-in Azure load balancing doesn''t understand LLM-specific rate limits. Custom balancer can track per-endpoint request counts and route to least-loaded endpoint.',
          'outcome', '4x capacity increase (960 req/min), throttling reduced from 15% to <1%, 50% faster processing time',
          'tags', jsonb_build_array('performance', 'scalability', 'azure')
        ),
        jsonb_build_object(
          'id', gen_random_uuid()::text,
          'decision', 'GPT-4o Mini for Theme-Based Retrieval',
          'context', 'All LLM tasks were using GPT-4, resulting in $2,000/day API costs',
          'alternatives', jsonb_build_array('GPT-4 for all tasks', 'Open source models', 'No model tiering'),
          'rationale', 'Theme-based retrieval and summarization don''t require GPT-4''s complex reasoning. GPT-4o Mini provides sufficient quality at 80% lower cost.',
          'outcome', '40% overall cost reduction ($2,000/day to $1,200/day). Theme retrieval 60% faster.',
          'tags', jsonb_build_array('cost-optimization', 'ai', 'performance')
        ),
        jsonb_build_object(
          'id', gen_random_uuid()::text,
          'decision', 'LLM Response Caching with Redis',
          'context', 'Daily pipeline reprocessed all documents, including unchanged ones, wasting API calls',
          'alternatives', jsonb_build_array('No caching', 'File-based caching', 'Database caching'),
          'rationale', 'Redis provides fast lookup and TTL-based expiration. Cache key based on prompt hash ensures deterministic responses.',
          'outcome', '60% reduction in API costs from cache hits on unchanged documents',
          'tags', jsonb_build_array('cost-optimization', 'caching', 'performance')
        ),
        jsonb_build_object(
          'id', gen_random_uuid()::text,
          'decision', 'Citation Tracking in Prompt Templates',
          'context', 'Analysts were skeptical of AI-generated intelligence and needed to verify every statement',
          'alternatives', jsonb_build_array('Post-hoc citation matching', 'No citations', 'Manual citation addition'),
          'rationale', 'Requiring citations in prompt template ensures LLM generates traceable statements. Numbered [Source N] format enables automated parsing.',
          'outcome', '94% citation accuracy. Every generated statement links to source documents. Built analyst trust.',
          'tags', jsonb_build_array('responsible-ai', 'trust', 'compliance')
        )
      ),

      -- Challenges
      'challenges', jsonb_build_array(
        jsonb_build_object(
          'id', gen_random_uuid()::text,
          'challenge', 'Research Prototype to Production',
          'approach', 'Wrapped Microsoft Research''s IRE engine with production-grade infrastructure: error handling, retry logic, monitoring hooks, and edge case handling',
          'technicalDetails', 'IRE was optimized for research notebooks, not production APIs. Added: exponential backoff retries (max 3), graceful degradation for partial failures, Application Insights telemetry, input validation for malformed documents, timeout handling for long documents.',
          'lessonsLearned', 'Research prototypes are great starting points but need 10x more operational code for production. Established bi-weekly syncs with MSR to provide feedback that improved IRE for all users.',
          'relatedStoryIds', jsonb_build_array()
        ),
        jsonb_build_object(
          'id', gen_random_uuid()::text,
          'challenge', 'Entity Extraction Accuracy at 70%',
          'approach', 'Developed domain-specific prompts with custom entity types, few-shot examples, and confidence scoring',
          'technicalDetails', 'Generic LangChain prompts extracted irrelevant entities ("the company", "hackers") while missing critical ones. Created 6 threat-intelligence entity types (threat_actor, malware, vulnerability, target_organization, infrastructure, technique). Added 20 few-shot examples from real MTAC reports. Implemented confidence scoring (High/Medium/Low) to filter uncertain extractions.',
          'lessonsLearned', 'Generic prompts don''t work for specialized domains. Few-shot examples showing what NOT to extract are as important as positive examples. Built 500-entity evaluation dataset for measuring improvements.',
          'relatedStoryIds', jsonb_build_array()
        ),
        jsonb_build_object(
          'id', gen_random_uuid()::text,
          'challenge', 'LLM Rate Limits Causing 15% Throttling',
          'approach', 'Deployed across 4 Azure OpenAI regional endpoints with custom load balancer',
          'technicalDetails', 'Single endpoint: 240 req/min. Solution: East US (x2), West US, Central US deployments = 960 req/min total. Load balancer tracks per-endpoint request counts, resets every minute, routes to least-loaded healthy endpoint. Health checks every 30 seconds, automatic failover after 5 consecutive failures.',
          'lessonsLearned', 'Each Azure region has independent rate limits - multi-region deployment provides linear capacity scaling. Custom load balancing is required because Azure built-in LB doesn''t understand LLM rate limits.',
          'relatedStoryIds', jsonb_build_array()
        ),
        jsonb_build_object(
          'id', gen_random_uuid()::text,
          'challenge', 'API Costs Unsustainable at $2,000/day',
          'approach', 'Implemented caching, model tiering, and rate limiting',
          'technicalDetails', 'Three optimizations: (1) Redis caching for LLM responses - 60% cost reduction; (2) GPT-4o Mini for summarization tasks - 20% additional savings; (3) Rate limiting to catch inefficient queries. Monthly costs dropped from $60K projection to $36K actual.',
          'lessonsLearned', 'Cost optimization should be built in from the start. Caching deterministic LLM calls (same prompt = same response) provides massive savings. Not all tasks need the most expensive model.',
          'relatedStoryIds', jsonb_build_array()
        ),
        jsonb_build_object(
          'id', gen_random_uuid()::text,
          'challenge', 'Entity Duplicates Fragmenting Knowledge Graph',
          'approach', 'Built Entity Merge UI for analyst-driven data curation',
          'technicalDetails', 'Same threat actor appeared as separate entities: "APT28", "Fancy Bear", "Sofacy". Solution: Merge UI lets analysts select primary entity + duplicates, provide reason, combine all relationships. Merge decisions stored in Cosmos DB for audit. Future queries automatically apply merge mappings.',
          'lessonsLearned', 'AI extraction isn''t perfect - need human-in-the-loop for corrections. Analysts know their domain better than any model. This feature became one of the most-used, directly improving data quality.',
          'relatedStoryIds', jsonb_build_array()
        ),
        jsonb_build_object(
          'id', gen_random_uuid()::text,
          'challenge', 'Building Analyst Trust in AI-Generated Intelligence',
          'approach', 'Implemented citation tracking, transparent limitations, and gradual rollout',
          'technicalDetails', 'Every AI statement links to source documents via [Source N] citations. System says "I don''t know" when uncertain. Started pilot with 5 analysts, expanded based on feedback. Added entity merge UI so analysts can correct mistakes.',
          'lessonsLearned', 'Trust is earned through transparency and control. Showing sources lets analysts verify. Admitting limitations is more trustworthy than overconfidence. Gradual rollout catches issues before wide deployment.',
          'relatedStoryIds', jsonb_build_array()
        )
      ),

      -- Metrics
      'metrics', jsonb_build_array(
        jsonb_build_object(
          'id', gen_random_uuid()::text,
          'metric', 'Analyst Productivity',
          'before', 'Hours spent on manual document synthesis',
          'after', '50% reduction in time',
          'improvement', '50% faster',
          'context', 'Time spent on report summaries and weekly roundups'
        ),
        jsonb_build_object(
          'id', gen_random_uuid()::text,
          'metric', 'Theme-Based Retrieval Speed',
          'before', '100% baseline',
          'after', '50% of original time',
          'improvement', '50% faster',
          'context', 'Processing time for complex corpus-wide queries'
        ),
        jsonb_build_object(
          'id', gen_random_uuid()::text,
          'metric', 'API Uptime',
          'before', 'Single region deployment',
          'after', '99.8%',
          'improvement', 'Production-grade reliability',
          'context', 'Multi-region deployment with automatic failover'
        ),
        jsonb_build_object(
          'id', gen_random_uuid()::text,
          'metric', 'Citation Accuracy',
          'before', 'No citation tracking',
          'after', '94%',
          'improvement', 'Every statement traceable',
          'context', 'AI-generated content with source document links'
        ),
        jsonb_build_object(
          'id', gen_random_uuid()::text,
          'metric', 'User Satisfaction',
          'before', 'N/A (new system)',
          'after', '87%',
          'improvement', 'High analyst adoption',
          'context', 'MTAC analyst feedback and daily usage'
        ),
        jsonb_build_object(
          'id', gen_random_uuid()::text,
          'metric', 'Entity Extraction Accuracy',
          'before', '70%',
          'after', '92%',
          'improvement', '22 percentage points',
          'context', 'Domain-specific prompts with few-shot examples'
        ),
        jsonb_build_object(
          'id', gen_random_uuid()::text,
          'metric', 'Daily API Costs',
          'before', '$2,000/day',
          'after', '$1,200/day',
          'improvement', '40% reduction',
          'context', 'Caching, model selection, rate limiting optimizations'
        ),
        jsonb_build_object(
          'id', gen_random_uuid()::text,
          'metric', 'Request Capacity',
          'before', '240 req/min (single endpoint)',
          'after', '960 req/min (4 endpoints)',
          'improvement', '4x increase',
          'context', 'Custom load balancer across regional deployments'
        ),
        jsonb_build_object(
          'id', gen_random_uuid()::text,
          'metric', 'Throttling Errors',
          'before', '15%',
          'after', '<1%',
          'improvement', '15x reduction',
          'context', 'Load balancing eliminated rate limit errors'
        )
      ),

      -- AI-generated content
      'aiSummary', 'Built Microsoft''s first production GraphRAG system for threat intelligence analysis at MTAC. Designed end-to-end architecture including custom GPT-4 load balancing (4x capacity), domain-specific entity extraction (70% to 92% accuracy), and hybrid search combining vectors, keywords, and graph traversal. Achieved 50% analyst productivity improvement, 99.8% uptime, 94% citation accuracy, and 40% cost reduction. Led compliance certification (SFI, SDL, Responsible AI) and collaborated with Microsoft Research to adapt the IRE engine for production.',

      'talkingPoints', jsonb_build_array(
        'Built Microsoft''s first production GraphRAG system - pioneering work that became reference architecture for other teams',
        'Designed custom load balancer distributing across 4 GPT-4 endpoints (960 req/min capacity)',
        'Improved entity extraction accuracy from 70% to 92% through domain-specific prompt engineering',
        'Achieved 50% reduction in analyst time for report summaries and weekly roundups',
        'Optimized costs from $2,000/day to $1,200/day (40% reduction) through caching and model tiering',
        '99.8% API uptime with multi-region deployment and automatic failover',
        'Collaborated with Microsoft Research to adapt IRE engine for production use',
        '87% user satisfaction - analysts use system daily for threat intelligence work'
      ),

      'interviewQuestions', jsonb_build_array(
        'How did you design the load balancing across multiple GPT-4 endpoints?',
        'What was the difference between your GraphRAG approach and traditional RAG?',
        'How did you improve entity extraction accuracy from 70% to 92%?',
        'How did you handle the transition from research prototype to production?',
        'What cost optimization strategies did you implement?',
        'How did you build trust with analysts skeptical of AI-generated intelligence?',
        'What were the key challenges in achieving 99.8% uptime?',
        'How did you approach the compliance certification process?',
        'What would you do differently if building this system again?'
      )
    ),
    v_now,
    v_now
  )
  ON CONFLICT (user_id, project_id)
  DO UPDATE SET
    documentation = EXCLUDED.documentation,
    updated_at = v_now;

  RAISE NOTICE 'MTAC project documentation added/updated successfully';
END $$;
