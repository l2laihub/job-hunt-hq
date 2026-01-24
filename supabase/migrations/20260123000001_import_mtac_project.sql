-- Import MTAC Intelligence Copilot Project with Stories and Technical Answers
--
-- BEFORE RUNNING: Replace the placeholder values below with your actual IDs
-- 1. Replace 'YOUR_USER_ID_HERE' with your auth.users id
-- 2. Replace 'YOUR_PROFILE_ID_HERE' with your profiles id (Full Stack Focus profile)
--
-- To find your IDs, run these queries:
--   SELECT id FROM auth.users WHERE email = 'your-email@example.com';
--   SELECT id, name FROM profiles WHERE user_id = 'your-user-id';

-- ============================================
-- CONFIGURATION - REPLACE THESE VALUES
-- ============================================
DO $$
DECLARE
  v_user_id uuid := '2a37edd5-f768-4b25-b2c9-e25909889ebb'::uuid;  -- Replace with your user_id
  v_profile_id uuid := 'efdd281e-3c4a-4452-9534-1ba4b6a16b08'::uuid;  -- Replace with your profile_id
  v_now timestamptz := now();

  -- Story IDs (generated for cross-referencing)
  v_story_1 uuid := gen_random_uuid();
  v_story_2 uuid := gen_random_uuid();
  v_story_3 uuid := gen_random_uuid();
  v_story_4 uuid := gen_random_uuid();
  v_story_5 uuid := gen_random_uuid();
  v_story_6 uuid := gen_random_uuid();
  v_story_7 uuid := gen_random_uuid();
  v_story_8 uuid := gen_random_uuid();
  v_story_9 uuid := gen_random_uuid();
  v_story_10 uuid := gen_random_uuid();
  v_story_11 uuid := gen_random_uuid();
  v_story_12 uuid := gen_random_uuid();
BEGIN
  -- ============================================
  -- 1. ADD MTAC PROJECT TO PROFILE
  -- ============================================
  UPDATE profiles
  SET active_projects = active_projects || jsonb_build_array(jsonb_build_object(
    'id', gen_random_uuid()::text,
    'name', 'MTAC Intelligence Copilot',
    'description', 'Microsoft''s first production GraphRAG-based AI system for threat intelligence analysis at MTAC. Enables analysts to query across entire document corpus, extract entity relationships, and generate comprehensive summaries with citations.',
    'techStack', jsonb_build_array(
      'C#', '.NET Core', 'Python', 'FastAPI', 'React 18', 'FluentUI', 'D3.js',
      'GPT-4', 'GPT-4o Mini', 'Azure OpenAI', 'Cosmos DB', 'Azure Cognitive Search',
      'Azure Functions', 'Databricks', 'Azure Data Factory', 'Kubernetes'
    ),
    'status', 'launched',
    'traction', 'Production system with 50% analyst productivity improvement, 99.8% uptime',
    'hasDocumentation', true,
    'documentation', jsonb_build_object(
      'screenshots', '[]'::jsonb,
      'architectureDiagrams', '[]'::jsonb,
      'documentFiles', '[]'::jsonb,
      'technicalDecisions', jsonb_build_array(
        jsonb_build_object(
          'id', gen_random_uuid()::text,
          'decision', 'GraphRAG over Traditional RAG',
          'context', 'Analysts needed to understand patterns and relationships across thousands of documents',
          'alternatives', jsonb_build_array('Traditional vector search RAG', 'Keyword-based search', 'Manual document analysis'),
          'rationale', 'GraphRAG builds a knowledge graph of entities and relationships, enabling queries that span multiple documents',
          'outcome', 'Enabled comprehensive threat actor network analysis and theme-based retrieval',
          'tags', jsonb_build_array('architecture', 'ai', 'innovation')
        ),
        jsonb_build_object(
          'id', gen_random_uuid()::text,
          'decision', 'Hybrid Search (Vector + Keyword + Graph)',
          'context', 'Single search method was insufficient for complex intelligence queries',
          'alternatives', jsonb_build_array('Vector-only search', 'Keyword-only search', 'Graph-only traversal'),
          'rationale', 'Combined semantic understanding of vectors, precision of keywords, and relationship awareness of graph',
          'outcome', 'Better retrieval quality, reduced noise, 94% citation accuracy',
          'tags', jsonb_build_array('search', 'performance', 'quality')
        ),
        jsonb_build_object(
          'id', gen_random_uuid()::text,
          'decision', 'GPT-4o Mini for Theme Retrieval',
          'context', 'Need to balance cost vs quality for different AI tasks',
          'alternatives', jsonb_build_array('GPT-4 for all tasks', 'Open source models', 'Fine-tuned smaller models'),
          'rationale', 'GPT-4o Mini provides sufficient quality for summarization while being 80% cheaper',
          'outcome', '80% cost reduction for theme retrieval workload',
          'tags', jsonb_build_array('cost-optimization', 'ai', 'efficiency')
        ),
        jsonb_build_object(
          'id', gen_random_uuid()::text,
          'decision', 'Custom Load Balancer for GPT-4 Endpoints',
          'context', 'Single endpoint rate limited at 240 req/min, causing throttling',
          'alternatives', jsonb_build_array('Azure built-in load balancing', 'Third-party API gateway', 'Queue-based processing'),
          'rationale', 'Built-in solutions didn''t handle LLM-specific rate limits; needed custom logic',
          'outcome', '960 req/min capacity (4x increase), 50% faster processing',
          'tags', jsonb_build_array('scalability', 'performance', 'reliability')
        ),
        jsonb_build_object(
          'id', gen_random_uuid()::text,
          'decision', 'LLM Response Caching with Redis',
          'context', 'Daily processing was re-extracting entities from unchanged documents',
          'alternatives', jsonb_build_array('No caching', 'File-based caching', 'Database caching'),
          'rationale', 'Redis provides fast key-value lookups with TTL support',
          'outcome', '60% reduction in API costs',
          'tags', jsonb_build_array('cost-optimization', 'performance', 'caching')
        )
      ),
      'challenges', jsonb_build_array(
        jsonb_build_object(
          'id', gen_random_uuid()::text,
          'challenge', 'Adapting MSR Research Prototype for Production',
          'approach', 'Wrapped IRE engine with production-grade error handling, retry logic, monitoring',
          'technicalDetails', 'Implemented circuit breakers, exponential backoff, structured logging',
          'lessonsLearned', 'Research prototypes need 10x more operational code for production'
        ),
        jsonb_build_object(
          'id', gen_random_uuid()::text,
          'challenge', 'Entity Extraction Accuracy at 70%',
          'approach', 'Developed domain-specific prompts with threat intelligence entity types',
          'technicalDetails', 'Custom entity types, few-shot examples, confidence scoring',
          'lessonsLearned', 'Generic prompts don''t work for specialized domains'
        ),
        jsonb_build_object(
          'id', gen_random_uuid()::text,
          'challenge', 'LLM Rate Limits During Peak Hours',
          'approach', 'Multi-region deployment with custom load balancer',
          'technicalDetails', 'Per-endpoint tracking, health checks, automatic failover',
          'lessonsLearned', 'Plan for rate limits from day one'
        ),
        jsonb_build_object(
          'id', gen_random_uuid()::text,
          'challenge', 'Unsustainable API Costs ($2,000/day)',
          'approach', 'Multi-pronged cost optimization: caching, model selection, rate limiting',
          'technicalDetails', 'Redis caching (60% savings), GPT-4o Mini for non-critical tasks',
          'lessonsLearned', 'Model selection strategy based on task complexity pays dividends'
        ),
        jsonb_build_object(
          'id', gen_random_uuid()::text,
          'challenge', 'Analyst Trust in AI-Generated Intelligence',
          'approach', 'Built citation tracking, entity merge UI, transparent limitations',
          'technicalDetails', 'Every statement links to sources, system says "I don''t know" when uncertain',
          'lessonsLearned', 'Trust is earned through transparency and human-in-the-loop features'
        )
      ),
      'metrics', jsonb_build_array(
        jsonb_build_object('id', gen_random_uuid()::text, 'metric', 'Analyst Productivity', 'before', 'Hours on weekly roundups', 'after', '50% reduction', 'improvement', '50%'),
        jsonb_build_object('id', gen_random_uuid()::text, 'metric', 'Theme-Based Retrieval', 'before', '20+ seconds', 'after', '<10 seconds', 'improvement', '50% faster'),
        jsonb_build_object('id', gen_random_uuid()::text, 'metric', 'API Uptime', 'after', '99.8%', 'context', 'Multi-region deployment'),
        jsonb_build_object('id', gen_random_uuid()::text, 'metric', 'Citation Accuracy', 'after', '94%', 'context', 'AI statements traceable to sources'),
        jsonb_build_object('id', gen_random_uuid()::text, 'metric', 'User Satisfaction', 'after', '87%', 'context', 'MTAC analyst feedback'),
        jsonb_build_object('id', gen_random_uuid()::text, 'metric', 'API Costs', 'before', '$2,000/day', 'after', '$1,200/day', 'improvement', '40% reduction'),
        jsonb_build_object('id', gen_random_uuid()::text, 'metric', 'Entity Extraction', 'before', '70%', 'after', '92%', 'improvement', '22% improvement'),
        jsonb_build_object('id', gen_random_uuid()::text, 'metric', 'Request Capacity', 'before', '240 req/min', 'after', '960 req/min', 'improvement', '4x increase'),
        jsonb_build_object('id', gen_random_uuid()::text, 'metric', 'Throttling Errors', 'before', '15%', 'after', '<1%', 'improvement', '93% reduction')
      ),
      'systemContext', 'Threat intelligence analysis platform for Microsoft Threat Analysis Center (MTAC)',
      'integrations', jsonb_build_array('SharePoint', 'Azure OpenAI', 'Cosmos DB', 'Azure Cognitive Search', 'Azure AD'),
      'duration', 'August 2023 - March 2025',
      'myRole', 'Software Design Engineer 3, CST-E Division',
      'talkingPoints', jsonb_build_array(
        'Built Microsoft''s first production GraphRAG system',
        'Designed load balancing across 4 GPT-4 endpoints (960 req/min)',
        'Achieved 50% reduction in analyst time for report summaries',
        'Optimized costs from $2,000/day to $1,200/day (40% reduction)',
        '99.8% API uptime with multi-region deployment'
      )
    )
  )),
  updated_at = v_now
  WHERE id = v_profile_id AND user_id = v_user_id;

  -- ============================================
  -- 2. INSERT STAR STORIES (12 stories)
  -- ============================================

  -- Story 1: Built Microsoft's First Production GraphRAG System
  INSERT INTO stories (id, user_id, profile_id, title, raw_input, input_method, star, metrics, tags, variations, follow_up_questions, coaching_notes, created_at, updated_at)
  VALUES (
    v_story_1, v_user_id, v_profile_id,
    'Built Microsoft''s First Production GraphRAG System',
    'Auto-generated from MTAC Intelligence Copilot documentation',
    'import',
    jsonb_build_object(
      'situation', 'Microsoft Threat Analysis Center (MTAC) analysts were spending hours manually reading through thousands of threat intelligence documents daily. Traditional SharePoint search returned individual documents, missing critical patterns and connections across the entire corpus.',
      'task', 'As the lead engineer, I was tasked with designing and building Microsoft''s first production GraphRAG-based AI system that would enable analysts to query across the entire threat intelligence corpus, automatically extract entities and relationships, and generate comprehensive summaries with full citation tracking.',
      'action', 'I designed the end-to-end architecture including: (1) Azure Functions for document ingestion, (2) Databricks pipeline for processing, (3) Integration with MSR''s IRE engine for entity extraction using GPT-4, (4) Cosmos DB for knowledge graph storage, (5) Azure Cognitive Search for hybrid search, (6) C# API with custom load balancing across 4 GPT-4 endpoints, and (7) React frontend with D3.js visualization. I personally wrote the load balancing logic, designed entity extraction prompts achieving 92% accuracy, and collaborated with MSR.',
      'result', 'The system launched successfully in production. Key outcomes: 50% reduction in time spent on report summaries, 50% faster theme-based retrieval, 99.8% API uptime, 94% citation accuracy, and 87% user satisfaction. This became Microsoft''s first production GraphRAG system.'
    ),
    jsonb_build_object(
      'primary', '50% reduction in analyst productivity time for report summaries',
      'secondary', jsonb_build_array('50% faster theme-based retrieval', '99.8% API uptime', '94% citation accuracy', '87% user satisfaction', 'First production GraphRAG at Microsoft')
    ),
    ARRAY['system-design', 'graphrag', 'llm', 'microsoft', 'production', 'leadership', 'ai', 'azure'],
    jsonb_build_object(
      'leadership', 'Focus on leading the technical design, coordinating with Microsoft Research, and driving production launch.',
      'technical', 'Deep-dive into GraphRAG architecture: entity extraction, relationship mapping, hybrid search.',
      'challenge', 'Emphasize adapting MSR''s research prototype for production.'
    ),
    ARRAY['How did you handle entity extraction accuracy?', 'What was your load balancing approach?', 'How did you collaborate with Microsoft Research?', 'What were the biggest production challenges?'],
    'This is your flagship project story. Emphasize innovation (first production GraphRAG), scale (thousands of documents daily), and measurable impact (50% productivity improvement).',
    v_now, v_now
  );

  -- Story 2: Designed GPT-4 Load Balancing
  INSERT INTO stories (id, user_id, profile_id, title, raw_input, input_method, star, metrics, tags, variations, follow_up_questions, coaching_notes, created_at, updated_at)
  VALUES (
    v_story_2, v_user_id, v_profile_id,
    'Designed GPT-4 Load Balancing for 960 req/min Capacity',
    'Auto-generated from MTAC Intelligence Copilot documentation',
    'import',
    jsonb_build_object(
      'situation', 'The Intel Copilot system was hitting rate limits on our single GPT-4 endpoint (240 req/min). During peak hours, analysts waited 30-60 seconds and 15% of requests failed due to throttling.',
      'task', 'Design and implement a load balancing solution that would eliminate throttling, improve response times, and maintain high availability.',
      'action', 'Designed custom load balancer in C# distributing across 4 Azure OpenAI deployments (2 East US, 1 West US, 1 Central US). Implemented per-endpoint rate tracking, health checks with automatic failover, least-loaded-first routing, and distributed state via Redis.',
      'result', 'Combined capacity increased to 960 req/min (4x). Response time under 10 seconds. Throttling dropped from 15% to <1%. Contributed to 50% faster theme-based retrieval.'
    ),
    jsonb_build_object(
      'primary', '50% reduction in theme-based retrieval processing time',
      'secondary', jsonb_build_array('960 req/min capacity (4x increase)', '<1% throttling (from 15%)', '<10 second response time', 'Zero-impact automatic failover')
    ),
    ARRAY['system-design', 'performance', 'azure', 'scalability', 'reliability', 'load-balancing'],
    jsonb_build_object(
      'technical', 'Deep-dive into the load balancing algorithm: rate limit tracking, health checks, failover logic.',
      'challenge', 'Emphasize solving the 15% throttling problem.'
    ),
    ARRAY['How did you decide on the load balancing algorithm?', 'How do you handle endpoint failures?', 'What monitoring did you put in place?'],
    'Great story for performance/scalability questions. Quantify the before/after clearly.',
    v_now, v_now
  );

  -- Story 3: Improved Entity Extraction Accuracy
  INSERT INTO stories (id, user_id, profile_id, title, raw_input, input_method, star, metrics, tags, variations, follow_up_questions, coaching_notes, created_at, updated_at)
  VALUES (
    v_story_3, v_user_id, v_profile_id,
    'Improved Entity Extraction Accuracy from 70% to 92%',
    'Auto-generated from MTAC Intelligence Copilot documentation',
    'import',
    jsonb_build_object(
      'situation', 'Our initial entity extraction using generic prompts achieved only 70% accuracy, missing critical threat intelligence entities while extracting irrelevant ones.',
      'task', 'Improve entity extraction accuracy to production-grade quality (>90%) for the threat intelligence domain.',
      'action', 'Developed domain-specific prompts with threat-intelligence entity types: threat_actor, malware, vulnerability, target_organization, infrastructure, technique. Added few-shot examples from 20 real MTAC reports. Implemented confidence scoring and explicit instructions to ignore generic mentions. Created evaluation dataset of 500 labeled entities.',
      'result', 'Entity extraction accuracy improved from 70% to 92%. Enabled accurate threat actor network visualization. The approach was documented and reused by other teams.'
    ),
    jsonb_build_object(
      'primary', '92% entity extraction accuracy (22% improvement from 70%)',
      'secondary', jsonb_build_array('Enabled reliable threat actor visualization', 'Foundation for GraphRAG quality', 'Approach reused by other teams')
    ),
    ARRAY['prompt-engineering', 'ai', 'nlp', 'quality', 'llm', 'machine-learning'],
    jsonb_build_object(
      'technical', 'Focus on prompt engineering methodology: few-shot examples, entity type definitions, confidence scoring.'
    ),
    ARRAY['How did you evaluate extraction accuracy?', 'What were the most common failure modes?', 'How did few-shot examples help?'],
    'Good story for AI/ML questions. Emphasize the systematic approach: baseline measurement, hypothesis testing, quantified improvement.',
    v_now, v_now
  );

  -- Story 4: Created Hybrid Search System
  INSERT INTO stories (id, user_id, profile_id, title, raw_input, input_method, star, metrics, tags, variations, follow_up_questions, coaching_notes, created_at, updated_at)
  VALUES (
    v_story_4, v_user_id, v_profile_id,
    'Created Hybrid Search System (Vector + Keyword + Graph)',
    'Auto-generated from MTAC Intelligence Copilot documentation',
    'import',
    jsonb_build_object(
      'situation', 'Vector-only search was missing results matching keywords but not semantic embeddings. Searching for "APT28" sometimes missed documents using alias "Fancy Bear". Knowledge graph relationships weren''t leveraged during retrieval.',
      'task', 'Design a multi-pronged search system combining semantic vectors, keyword matching, and graph traversal for comprehensive retrieval.',
      'action', 'Implemented hybrid search architecture: Azure Cognitive Search with HNSW vector index, BM25 keyword matching for precise lookups, semantic ranking for intent, Cosmos DB graph queries for entity relationships, query orchestration executing all strategies in parallel with weighted scoring.',
      'result', 'Dramatically improved retrieval quality. Queries now find semantically relevant documents AND keyword matches AND traverse entity relationships. Reduced noise led to 94% citation accuracy.'
    ),
    jsonb_build_object(
      'primary', 'Enabled comprehensive corpus-wide analysis with 94% citation accuracy',
      'secondary', jsonb_build_array('Multi-pronged retrieval (vector + keyword + graph)', 'Reduced noise in LLM context', 'Semantic ranking for query intent')
    ),
    ARRAY['search', 'system-design', 'azure', 'retrieval', 'ai', 'information-retrieval'],
    jsonb_build_object(
      'technical', 'Deep-dive into the three search strategies, scoring weights, and result merging logic.'
    ),
    ARRAY['How did you weight the different search strategies?', 'How do you handle conflicting results?', 'What were the latency implications?'],
    'Good for system design questions about search. Be ready to explain the trade-offs between different search approaches.',
    v_now, v_now
  );

  -- Story 5: Built Citation Tracking System
  INSERT INTO stories (id, user_id, profile_id, title, raw_input, input_method, star, metrics, tags, variations, follow_up_questions, coaching_notes, created_at, updated_at)
  VALUES (
    v_story_5, v_user_id, v_profile_id,
    'Built Citation Tracking System with 94% Accuracy',
    'Auto-generated from MTAC Intelligence Copilot documentation',
    'import',
    jsonb_build_object(
      'situation', 'MTAC analysts were skeptical of AI-generated intelligence. They needed to verify every statement before including in official reports. Without citation tracking, they manually searched for sources, negating time savings.',
      'task', 'Implement a citation tracking system linking every AI statement to source documents for verification and compliance.',
      'action', 'Designed comprehensive citation system: prompts requiring [Source N] citations, parsing logic to extract indices and map to source chunks, metadata linking to SharePoint URLs, UI with clickable citations and hover tooltips, validation logic to flag unsupported claims, audit logging for compliance.',
      'result', '94% citation accuracy achieved. Analysts verify claims with one click. Built trust leading to 87% satisfaction. Met SFI and Responsible AI compliance requirements.'
    ),
    jsonb_build_object(
      'primary', '94% citation accuracy',
      'secondary', jsonb_build_array('One-click source verification', '87% user satisfaction', 'Full SFI and Responsible AI compliance', 'Complete audit trail')
    ),
    ARRAY['quality', 'compliance', 'responsible-ai', 'trust', 'ux', 'ai'],
    jsonb_build_object(
      'challenge', 'Emphasize building trust with skeptical users through transparency and verification.'
    ),
    ARRAY['How did you handle incorrect citations?', 'What about hallucinated citations?', 'How did you meet compliance requirements?'],
    'Great story for Responsible AI, compliance, and building trust. Emphasize the connection between transparency and user adoption.',
    v_now, v_now
  );

  -- Story 6: Designed Zero-Downtime Pipeline
  INSERT INTO stories (id, user_id, profile_id, title, raw_input, input_method, star, metrics, tags, variations, follow_up_questions, coaching_notes, created_at, updated_at)
  VALUES (
    v_story_6, v_user_id, v_profile_id,
    'Designed Zero-Downtime Daily Refresh Pipeline',
    'Auto-generated from MTAC Intelligence Copilot documentation',
    'import',
    jsonb_build_object(
      'situation', 'The system needed daily document ingestion but refresh required restarting services. For mission-critical intelligence work, even brief outages were unacceptable.',
      'task', 'Design a data refresh pipeline processing thousands of documents daily without service interruption.',
      'action', 'Built Azure Data Factory pipeline with graceful degradation: health check, maintenance mode toggle notifying frontend, parallel document ingestion, incremental IRE indexing, atomic updates to Cosmos DB and Cognitive Search, rolling restarts, post-refresh verification. Frontend displays maintenance banner but continues accepting queries.',
      'result', 'Zero hard downtime. Analysts continue working during ~45 minute refresh. Health checks ensure automatic recovery. Pipeline runs successfully every night.'
    ),
    jsonb_build_object(
      'primary', 'Zero-downtime daily data refresh',
      'secondary', jsonb_build_array('45-minute refresh with degraded service only', 'Automatic health check recovery', 'Transparent maintenance communication')
    ),
    ARRAY['devops', 'reliability', 'azure', 'pipelines', 'data-engineering', 'sre'],
    jsonb_build_object(
      'technical', 'Focus on the pipeline architecture, incremental processing, and atomic updates.'
    ),
    ARRAY['How do you handle failures mid-pipeline?', 'What about rollback scenarios?', 'How do you test the pipeline?'],
    'Good for DevOps and reliability questions. Emphasize the user-centric design (degraded service vs outage).',
    v_now, v_now
  );

  -- Story 7: Optimized LLM Costs
  INSERT INTO stories (id, user_id, profile_id, title, raw_input, input_method, star, metrics, tags, variations, follow_up_questions, coaching_notes, created_at, updated_at)
  VALUES (
    v_story_7, v_user_id, v_profile_id,
    'Optimized LLM Costs by 40% ($2,000/day to $1,200/day)',
    'Auto-generated from MTAC Intelligence Copilot documentation',
    'import',
    jsonb_build_object(
      'situation', 'Initial daily API costs were $2,000 (~$60K/month), unsustainable at scale. Leadership flagged as blocker.',
      'task', 'Reduce LLM API costs to sustainable levels without impacting quality or analyst productivity.',
      'action', 'Implemented multi-pronged optimization: Redis caching for LLM responses (hash prompts, cache entity extraction for 30 days), model selection (GPT-4 for complex reasoning, GPT-4o Mini for summarization), rate limiting to prevent runaway costs, monitoring dashboards to identify expensive patterns.',
      'result', 'Reduced from $2,000/day to $1,200/day (40% reduction). Caching saved 60%, model selection saved 20%. Monthly costs now ~$36K vs projected $60K+. Project approved for production.'
    ),
    jsonb_build_object(
      'primary', '40% cost reduction ($800/day savings)',
      'secondary', jsonb_build_array('Caching saved 60%', 'Model selection saved 20%', 'Monthly costs: $36K vs $60K+', 'Sustainable at production scale')
    ),
    ARRAY['cost-optimization', 'cloud', 'efficiency', 'azure', 'llm', 'caching'],
    jsonb_build_object(
      'technical', 'Deep-dive into caching strategy, cache key design, and TTL decisions.'
    ),
    ARRAY['How did you decide which tasks to use GPT-4o Mini for?', 'What about cache invalidation?', 'How do you monitor costs in real-time?'],
    'Excellent for questions about cost optimization, cloud economics, or making technical decisions with business impact.',
    v_now, v_now
  );

  -- Story 8: Achieved 99.8% API Uptime
  INSERT INTO stories (id, user_id, profile_id, title, raw_input, input_method, star, metrics, tags, variations, follow_up_questions, coaching_notes, created_at, updated_at)
  VALUES (
    v_story_8, v_user_id, v_profile_id,
    'Achieved 99.8% API Uptime with Multi-Region Deployment',
    'Auto-generated from MTAC Intelligence Copilot documentation',
    'import',
    jsonb_build_object(
      'situation', 'Intel Copilot supported mission-critical threat intelligence work. Single-region deployment was vulnerable to Azure outages. Analysts needed near-100% availability.',
      'task', 'Achieve production-grade reliability (99.8%+ uptime) for a critical AI system.',
      'action', 'Designed multi-region architecture: Azure OpenAI endpoints across East US, West US, Central US; health check endpoints verifying all dependencies; automatic failover after 5 consecutive failures; Application Insights monitoring with alerts; graceful degradation where healthy endpoints absorb load; recovery scheduler retesting unhealthy endpoints.',
      'result', '99.8% API uptime achieved. Automatic failover handled issues without analyst impact. No single point of failure. The architecture has handled multiple Azure incidents transparently.'
    ),
    jsonb_build_object(
      'primary', '99.8% API uptime',
      'secondary', jsonb_build_array('Multi-region deployment (East, West, Central US)', 'Automatic failover with no user impact', 'Graceful degradation instead of errors')
    ),
    ARRAY['reliability', 'sre', 'azure', 'high-availability', 'monitoring', 'devops'],
    '{}',
    ARRAY['How do you handle partial failures?', 'What monitoring alerts do you have?', 'How do you test failover scenarios?'],
    'Great for SRE and reliability questions. Emphasize the user-centric design (no visible impact).',
    v_now, v_now
  );

  -- Story 9: Collaborated with Microsoft Research
  INSERT INTO stories (id, user_id, profile_id, title, raw_input, input_method, star, metrics, tags, variations, follow_up_questions, coaching_notes, created_at, updated_at)
  VALUES (
    v_story_9, v_user_id, v_profile_id,
    'Collaborated with Microsoft Research on Production Adaptation',
    'Auto-generated from MTAC Intelligence Copilot documentation',
    'import',
    jsonb_build_object(
      'situation', 'Microsoft Research had developed IRE GraphRAG engine as a research prototype. While core algorithms were sound, it lacked error handling, monitoring, and scalability features for production.',
      'task', 'Collaborate with MSR team to adapt the prototype for production while providing feedback to improve the engine.',
      'action', 'Established bi-weekly syncs with MSR. Identified gaps (error handling, retry logic, monitoring, edge cases). Built production wrapper adding robustness without modifying core engine. Documented real-world issues and proposed improvements. Created feedback loop where production metrics informed research.',
      'result', 'Successfully adapted prototype for production with 99.8% uptime. Several suggestions incorporated into next IRE release. Established reusable MSR-to-production collaboration pattern. Intel Copilot became showcase for GraphRAG capabilities.'
    ),
    jsonb_build_object(
      'primary', 'Successfully shipped MSR research to production',
      'secondary', jsonb_build_array('Established MSR-to-production collaboration pattern', 'Multiple improvements incorporated into IRE', 'Model for future research-to-production projects')
    ),
    ARRAY['collaboration', 'cross-team', 'research', 'communication', 'leadership'],
    jsonb_build_object(
      'leadership', 'Emphasize establishing the collaboration process and creating reusable patterns.'
    ),
    ARRAY['What were the biggest gaps between research and production?', 'How did you manage different priorities?', 'What improvements did you contribute back?'],
    'Good for behavioral questions about collaboration, working with researchers, and bridging organizational boundaries.',
    v_now, v_now
  );

  -- Story 10: Built Entity Merge UI
  INSERT INTO stories (id, user_id, profile_id, title, raw_input, input_method, star, metrics, tags, variations, follow_up_questions, coaching_notes, created_at, updated_at)
  VALUES (
    v_story_10, v_user_id, v_profile_id,
    'Built Entity Merge UI for Analyst-Driven Data Curation',
    'Auto-generated from MTAC Intelligence Copilot documentation',
    'import',
    jsonb_build_object(
      'situation', 'Despite 92% accuracy, duplicate entities fragmented the knowledge graph. Same threat actor "APT28" appeared separately as "APT28", "Fancy Bear", and "Sofacy". Each had partial relationship data, preventing complete network views.',
      'task', 'Enable analysts to improve data quality by merging duplicates while preserving relationships and creating audit trail.',
      'action', 'Designed entity merge feature: React/FluentUI UI for selecting primary and duplicate entities, reason field for documentation, backend merge logic combining all relationships, reference updates across document chunks, merge history in Cosmos DB for audit, future queries automatically apply mappings. Added analytics to track merge patterns.',
      'result', 'Analysts curate data quality without engineering intervention. Entity with 15+8+3 separate relationships now shows all 26 together. Continuous knowledge graph improvement through human-in-the-loop corrections. Merge patterns informed extraction prompt improvements.'
    ),
    jsonb_build_object(
      'primary', 'Enabled comprehensive entity views through user curation',
      'secondary', jsonb_build_array('Human-in-the-loop for AI corrections', 'Full audit trail for merges', 'Continuous knowledge graph improvement')
    ),
    ARRAY['product', 'ux', 'data-quality', 'user-research', 'frontend', 'react'],
    jsonb_build_object(
      'technical', 'Focus on the merge logic, referential integrity, and preventing data corruption.'
    ),
    ARRAY['How do you handle merge conflicts?', 'What about reversing a merge?', 'How did analysts discover duplicate entities?'],
    'Good for product/UX questions and human-in-the-loop AI patterns.',
    v_now, v_now
  );

  -- Story 11: Led Full Compliance Certification
  INSERT INTO stories (id, user_id, profile_id, title, raw_input, input_method, star, metrics, tags, variations, follow_up_questions, coaching_notes, created_at, updated_at)
  VALUES (
    v_story_11, v_user_id, v_profile_id,
    'Led Full Compliance Certification (SFI, SDL, Responsible AI)',
    'Auto-generated from MTAC Intelligence Copilot documentation',
    'import',
    jsonb_build_object(
      'situation', 'Intel Copilot handled sensitive threat intelligence requiring full security and compliance certification before production. First production AI system in MTAC with no precedent.',
      'task', 'Lead the system through all required compliance certifications while maintaining development velocity.',
      'action', 'Coordinated compliance across workstreams: threat modeling sessions, network isolation via AME with VPN-only access, encryption at rest and in transit, comprehensive audit logging, static analysis and vulnerability scanning in CI/CD, penetration testing, Responsible AI review including bias testing, hallucination monitoring via citation verification, human-in-the-loop for high-stakes decisions. Created documentation and incident response runbooks.',
      'result', 'Full SFI, SDL, and Responsible AI certification achieved. Launched with zero security findings. Established security patterns for division. Documentation reduced certification time for subsequent projects.'
    ),
    jsonb_build_object(
      'primary', 'Full compliance certification achieved',
      'secondary', jsonb_build_array('Zero security findings at launch', 'Established security patterns for division', 'Reduced certification time for future projects')
    ),
    ARRAY['compliance', 'security', 'leadership', 'responsible-ai', 'governance'],
    jsonb_build_object(
      'leadership', 'Emphasize coordinating across security, legal, and engineering teams.'
    ),
    ARRAY['What was the most challenging compliance requirement?', 'How did you handle Responsible AI concerns?', 'What about ongoing compliance monitoring?'],
    'Important for questions about security, compliance, and Responsible AI. Shows leadership and organizational skills.',
    v_now, v_now
  );

  -- Story 12: Achieved 87% User Satisfaction
  INSERT INTO stories (id, user_id, profile_id, title, raw_input, input_method, star, metrics, tags, variations, follow_up_questions, coaching_notes, created_at, updated_at)
  VALUES (
    v_story_12, v_user_id, v_profile_id,
    'Achieved 87% User Satisfaction with Iterative Improvement',
    'Auto-generated from MTAC Intelligence Copilot documentation',
    'import',
    jsonb_build_object(
      'situation', 'AI systems often fail user adoption due to trust issues and usability problems. MTAC analysts were skeptical of AI-generated intelligence and needed to trust the system before incorporating it into their workflow.',
      'task', 'Achieve high user satisfaction and daily adoption among skeptical threat intelligence analysts.',
      'action', 'Led user-centric development: pilot with 5 analysts before rollout, implemented citation tracking per analyst request, added entity merge UI based on feedback, created downloadable intelligence reports, improved prompts iteratively, made system transparent about limitations (says "I don''t have information" rather than hallucinating). Established regular feedback sessions and feature request tracking.',
      'result', '87% user satisfaction in post-launch survey. Daily usage by all MTAC teams. 50% reduction in time spent on weekly roundups. The iterative approach became a model for AI system rollouts in the organization.'
    ),
    jsonb_build_object(
      'primary', '87% user satisfaction',
      'secondary', jsonb_build_array('Daily usage by all MTAC teams', '50% time reduction on weekly roundups', 'Model for AI system rollouts')
    ),
    ARRAY['customer-success', 'user-research', 'iteration', 'feedback', 'product', 'adoption'],
    jsonb_build_object(
      'leadership', 'Focus on establishing feedback processes and driving adoption across teams.'
    ),
    ARRAY['How did you gather feedback?', 'What was the biggest complaint?', 'How did you prioritize feature requests?'],
    'Excellent for questions about user adoption, product thinking, and iterative development. Shows customer focus.',
    v_now, v_now
  );

  -- ============================================
  -- 3. INSERT TECHNICAL ANSWERS (10 answers)
  -- ============================================

  -- Answer 1: Most Impactful Project
  INSERT INTO technical_answers (id, user_id, profile_id, question, question_type, format, sources, answer, follow_ups, metadata, created_at, updated_at)
  VALUES (
    gen_random_uuid(), v_user_id, v_profile_id,
    'Tell me about your most impactful project',
    'experience',
    jsonb_build_object(
      'type', 'STAR',
      'sections', jsonb_build_array(
        jsonb_build_object('label', 'Situation', 'content', 'MTAC analysts spent hours reading thousands of threat intelligence documents daily, missing patterns across the corpus.'),
        jsonb_build_object('label', 'Task', 'content', 'Build Microsoft''s first production GraphRAG system for corpus-wide threat intelligence analysis.'),
        jsonb_build_object('label', 'Action', 'content', 'Designed end-to-end architecture: Azure Functions ingestion, Databricks processing, IRE GraphRAG engine, hybrid search, C# API with load balancing, React frontend.'),
        jsonb_build_object('label', 'Result', 'content', '50% reduction in analyst time, 99.8% uptime, 94% citation accuracy, 87% satisfaction. First production GraphRAG at Microsoft.')
      )
    ),
    jsonb_build_object('storyIds', jsonb_build_array(v_story_1::text), 'profileSections', jsonb_build_array('activeProjects'), 'synthesized', false),
    jsonb_build_object(
      'structured', jsonb_build_array(
        jsonb_build_object('label', 'Situation', 'content', 'Microsoft Threat Analysis Center analysts were spending hours manually reading through thousands of threat intelligence documents daily. Traditional SharePoint search returned individual documents, missing critical patterns and connections across the entire corpus.'),
        jsonb_build_object('label', 'Task', 'content', 'As the lead engineer, I was tasked with designing and building Microsoft''s first production GraphRAG-based AI system that would enable analysts to query across the entire threat intelligence corpus, automatically extract entities and relationships, and generate comprehensive summaries with full citation tracking.'),
        jsonb_build_object('label', 'Action', 'content', 'I designed the end-to-end architecture: Azure Functions for document ingestion, Databricks for processing, integrated Microsoft Research''s IRE engine for entity extraction using GPT-4, built hybrid search combining Azure Cognitive Search vectors with Cosmos DB graph traversal, created a C# API layer with custom load balancing across 4 GPT-4 endpoints, and built a React frontend with D3.js graph visualization. I personally wrote the load balancing logic, designed entity extraction prompts achieving 92% accuracy, and collaborated with MSR to adapt their research prototype for production.'),
        jsonb_build_object('label', 'Result', 'content', 'The system launched successfully in production. Key outcomes: 50% reduction in time spent on report summaries, 50% faster theme-based retrieval, 99.8% API uptime, 94% citation accuracy, and 87% user satisfaction. This became Microsoft''s first production GraphRAG system, and the architecture patterns were adopted by other teams across the CST-E division.')
      ),
      'narrative', 'My most impactful project was building **MTAC Intelligence Copilot** - Microsoft''s first production GraphRAG system for threat intelligence analysis.\n\n**The Challenge**: MTAC analysts were spending hours daily manually reading through thousands of threat intelligence documents. Traditional SharePoint search only returned individual documents, completely missing the patterns and connections across the corpus that are critical for threat analysis.\n\n**My Role**: As the lead engineer, I designed and built the complete system from scratch. The key innovation was using **GraphRAG** - instead of just searching documents, we automatically extract entities (threat actors, malware, vulnerabilities) and their relationships to build a knowledge graph.\n\n**The Impact**: The numbers speak for themselves:\n- **50% reduction** in time spent on weekly roundups and report summaries\n- **99.8% API uptime** with multi-region deployment\n- **94% citation accuracy** - every claim traceable to sources\n- **87% user satisfaction** among analysts\n\nThis was Microsoft''s first production GraphRAG system, and the architecture patterns we established are now being adopted by other teams across the division.',
      'bulletPoints', jsonb_build_array('First production GraphRAG system at Microsoft', '50% reduction in analyst time on reports', 'Custom load balancing for 960 req/min capacity', '92% entity extraction accuracy through prompt engineering', '99.8% uptime with multi-region deployment')
    ),
    jsonb_build_array(
      jsonb_build_object('question', 'How did you handle the entity extraction accuracy challenges?', 'likelihood', 'high', 'suggestedAnswer', 'Initial accuracy was 70% using generic prompts. I developed domain-specific prompts with threat intelligence entity types and few-shot examples from real MTAC reports, improving to 92%.', 'keyPoints', jsonb_build_array('Domain-specific prompts', 'Few-shot examples', 'Confidence scoring')),
      jsonb_build_object('question', 'What was your load balancing strategy?', 'likelihood', 'high', 'suggestedAnswer', 'Custom C# load balancer distributing across 4 Azure OpenAI endpoints with least-loaded-first routing, health checks, and automatic failover. Achieved 960 req/min capacity.', 'keyPoints', jsonb_build_array('4 regional endpoints', 'Health checks', 'Automatic failover'))
    ),
    jsonb_build_object('difficulty', 'staff', 'tags', jsonb_build_array('graphrag', 'microsoft', 'llm', 'azure', 'system-design')),
    v_now, v_now
  );

  -- Answer 2: System Performance Improvement
  INSERT INTO technical_answers (id, user_id, profile_id, question, question_type, format, sources, answer, follow_ups, metadata, created_at, updated_at)
  VALUES (
    gen_random_uuid(), v_user_id, v_profile_id,
    'Describe a time you improved system performance significantly',
    'behavioral-technical',
    jsonb_build_object(
      'type', 'STAR',
      'sections', jsonb_build_array(
        jsonb_build_object('label', 'Situation', 'content', 'Single GPT-4 endpoint was rate limited, causing 15% throttling and 30-60 second wait times.'),
        jsonb_build_object('label', 'Task', 'content', 'Eliminate throttling and improve response times while maintaining high availability.'),
        jsonb_build_object('label', 'Action', 'content', 'Designed custom load balancer across 4 Azure OpenAI endpoints with health checks and automatic failover.'),
        jsonb_build_object('label', 'Result', 'content', '4x capacity increase to 960 req/min, <1% throttling, 50% faster processing.')
      )
    ),
    jsonb_build_object('storyIds', jsonb_build_array(v_story_2::text), 'profileSections', jsonb_build_array('activeProjects'), 'synthesized', false),
    jsonb_build_object(
      'structured', jsonb_build_array(
        jsonb_build_object('label', 'Situation', 'content', 'Our Intel Copilot system was hitting rate limits on our single GPT-4 endpoint (240 req/min). During peak hours, analysts waited 30-60 seconds and 15% of requests failed due to throttling.'),
        jsonb_build_object('label', 'Task', 'content', 'Design a load balancing solution to eliminate throttling, improve response times, and maintain high availability.'),
        jsonb_build_object('label', 'Action', 'content', 'Designed custom load balancer in C# distributing across 4 Azure OpenAI endpoints (2 East US, 1 West US, 1 Central US). Implemented per-endpoint rate tracking, health checks with automatic failover, least-loaded-first routing, and distributed state via Redis.'),
        jsonb_build_object('label', 'Result', 'content', 'Combined capacity increased to 960 req/min (4x). Response time under 10 seconds. Throttling dropped from 15% to <1%. Contributed to 50% faster theme-based retrieval.')
      ),
      'narrative', 'I significantly improved system performance by designing a **custom load balancer** for our LLM-based threat intelligence system.\n\n**The Problem**: Our single GPT-4 endpoint was capped at 240 requests per minute. During peak hours, analysts were waiting 30-60 seconds for responses, and about 15% of requests were failing due to throttling.\n\n**My Solution**: I designed and implemented a custom load balancer in C# that distributed requests across 4 Azure OpenAI deployments across different regions:\n\n- **Per-endpoint tracking**: Each endpoint tracks its own request count and rate limit status\n- **Health checks**: Endpoints marked unhealthy after 5 consecutive failures, with automatic recovery testing\n- **Smart routing**: Least-loaded-first algorithm with geographic proximity for latency optimization\n\n**The Results** were dramatic:\n- **4x capacity increase** to 960 requests/minute\n- **Response time under 10 seconds** for complex queries\n- **Throttling dropped from 15% to <1%**\n- Contributed to **50% faster overall processing**',
      'bulletPoints', jsonb_build_array('4x capacity increase (240 to 960 req/min)', 'Response time under 10 seconds', 'Throttling reduced from 15% to <1%', 'Automatic failover with no user impact')
    ),
    jsonb_build_array(
      jsonb_build_object('question', 'How did you test the failover scenarios?', 'likelihood', 'high', 'suggestedAnswer', 'Created chaos engineering tests that intentionally disabled endpoints. Verified traffic rerouted within seconds and recovered when endpoints came back online.', 'keyPoints', jsonb_build_array('Chaos testing', 'Automated verification', 'Recovery testing'))
    ),
    jsonb_build_object('difficulty', 'senior', 'tags', jsonb_build_array('performance', 'load-balancing', 'azure', 'scalability')),
    v_now, v_now
  );

  -- Answer 3: Cost Optimization
  INSERT INTO technical_answers (id, user_id, profile_id, question, question_type, format, sources, answer, follow_ups, metadata, created_at, updated_at)
  VALUES (
    gen_random_uuid(), v_user_id, v_profile_id,
    'Tell me about a time you had to optimize costs',
    'behavioral-technical',
    jsonb_build_object(
      'type', 'STAR',
      'sections', jsonb_build_array(
        jsonb_build_object('label', 'Situation', 'content', 'LLM API costs were $2,000/day (~$60K/month), flagged as unsustainable by leadership.'),
        jsonb_build_object('label', 'Task', 'content', 'Reduce costs to sustainable levels without impacting quality or analyst productivity.'),
        jsonb_build_object('label', 'Action', 'content', 'Implemented Redis caching (60% savings), model selection strategy (20% savings), and cost monitoring.'),
        jsonb_build_object('label', 'Result', 'content', 'Reduced from $2,000/day to $1,200/day - 40% reduction. Project continued to production.')
      )
    ),
    jsonb_build_object('storyIds', jsonb_build_array(v_story_7::text), 'profileSections', jsonb_build_array('activeProjects'), 'synthesized', false),
    jsonb_build_object(
      'structured', jsonb_build_array(
        jsonb_build_object('label', 'Situation', 'content', 'Our AI system was costing approximately $2,000 per day in LLM API costs - about $60,000 monthly. Leadership flagged this as unsustainable and a potential blocker for continued development.'),
        jsonb_build_object('label', 'Task', 'content', 'Reduce LLM API costs to sustainable levels without impacting system quality, response time, or analyst productivity.'),
        jsonb_build_object('label', 'Action', 'content', 'Implemented multi-pronged optimization: (1) Redis caching for LLM responses - hash prompts to detect identical requests, cache entity extraction for 30 days; (2) Model selection - GPT-4 for complex reasoning, GPT-4o Mini for simpler summarization tasks; (3) Rate limiting and per-user quotas during testing; (4) Cost monitoring dashboards to identify expensive patterns.'),
        jsonb_build_object('label', 'Result', 'content', 'Reduced costs from $2,000/day to $1,200/day - 40% reduction. Caching alone saved 60% by eliminating redundant processing. Model selection saved additional 20%. Monthly costs now ~$36K vs projected $60K+. Project approved for production launch.')
      ),
      'narrative', 'I led a cost optimization effort that **reduced LLM API costs by 40%** - from $2,000/day to $1,200/day.\n\n**The Problem**: Our AI-powered threat intelligence system was burning through about $2,000 in API costs daily - roughly $60,000 per month. Leadership flagged this as unsustainable and it was becoming a blocker for production launch.\n\n**My Approach**: I implemented a multi-pronged strategy:\n\n1. **LLM Response Caching (60% savings)**\n   - Redis cache with hashed prompts as keys\n   - Entity extraction results cached for 30 days\n   - Only new or modified documents trigger LLM calls\n\n2. **Smart Model Selection (20% savings)**\n   - GPT-4 for complex reasoning (entity extraction, relationship detection)\n   - GPT-4o Mini for simpler tasks (summarization, theme descriptions)\n\n**The Impact**: Costs dropped from **$2,000/day to $1,200/day** - a 40% reduction that saved about $24,000 monthly.',
      'bulletPoints', jsonb_build_array('40% cost reduction ($2K to $1.2K/day)', 'Caching saved 60% on redundant processing', 'Model selection saved 20% on appropriate tasks', 'Enabled production launch approval')
    ),
    jsonb_build_array(
      jsonb_build_object('question', 'How did you decide which tasks to use GPT-4o Mini for?', 'likelihood', 'high', 'suggestedAnswer', 'Evaluated task complexity: entity extraction needs nuanced reasoning (GPT-4), while summarization and theme descriptions work well with GPT-4o Mini. Validated with quality metrics before switching.', 'keyPoints', jsonb_build_array('Task complexity analysis', 'Quality validation', 'A/B testing'))
    ),
    jsonb_build_object('difficulty', 'senior', 'tags', jsonb_build_array('cost-optimization', 'cloud', 'llm', 'caching', 'efficiency')),
    v_now, v_now
  );

  -- Answer 4: Cross-Team Collaboration
  INSERT INTO technical_answers (id, user_id, profile_id, question, question_type, format, sources, answer, follow_ups, metadata, created_at, updated_at)
  VALUES (
    gen_random_uuid(), v_user_id, v_profile_id,
    'Describe a challenging collaboration with another team',
    'experience',
    jsonb_build_object(
      'type', 'STAR',
      'sections', jsonb_build_array(
        jsonb_build_object('label', 'Situation', 'content', 'MSR''s GraphRAG engine was a research prototype lacking production features.'),
        jsonb_build_object('label', 'Task', 'content', 'Adapt the prototype for production while providing feedback to improve the engine.'),
        jsonb_build_object('label', 'Action', 'content', 'Established bi-weekly syncs, implemented production wrapper, documented real-world issues, contributed improvements back.'),
        jsonb_build_object('label', 'Result', 'content', 'Successfully shipped to production. Improvements incorporated into MSR engine. Established collaboration pattern for org.')
      )
    ),
    jsonb_build_object('storyIds', jsonb_build_array(v_story_9::text), 'profileSections', jsonb_build_array('activeProjects'), 'synthesized', false),
    jsonb_build_object(
      'structured', jsonb_build_array(
        jsonb_build_object('label', 'Situation', 'content', 'Microsoft Research had developed the IRE GraphRAG engine as a research prototype. While the core algorithms were excellent, it was optimized for experiments, not production - lacking error handling, monitoring, and scalability features we needed.'),
        jsonb_build_object('label', 'Task', 'content', 'Collaborate with MSR to adapt their prototype for production use while providing feedback that would improve the engine for future users.'),
        jsonb_build_object('label', 'Action', 'content', 'Established bi-weekly syncs with MSR. Identified gaps between research and production (error handling, retry logic, monitoring). Built a production wrapper adding robustness without modifying core engine. Documented real-world issues and proposed improvements. Created feedback loop where production metrics informed research priorities.'),
        jsonb_build_object('label', 'Result', 'content', 'Successfully adapted prototype for production with 99.8% uptime. Several suggestions incorporated into next IRE release. Established reusable MSR-to-production collaboration pattern. Intel Copilot became a showcase for GraphRAG capabilities.')
      ),
      'narrative', 'I navigated a challenging collaboration between my product team and **Microsoft Research** to ship their GraphRAG prototype to production.\n\n**The Challenge**: MSR had built an impressive GraphRAG engine for research purposes. But research code and production code have very different requirements - the prototype lacked error handling, monitoring hooks, retry logic, and scalability features.\n\n**My Approach**: I established a structured collaboration:\n\n1. **Bi-weekly syncs** with the MSR team to align on priorities and share learnings\n2. **Gap analysis** documenting research vs production requirements\n3. **Production wrapper** that added robustness without modifying the core engine\n4. **Feedback loop** where our production metrics informed their research direction\n\n**The Outcome**: We successfully shipped to production with 99.8% uptime. Several of our suggested improvements were incorporated into the next IRE release. Most importantly, we established a **reusable collaboration pattern** that other teams have since followed for MSR partnerships.',
      'bulletPoints', jsonb_build_array('Established structured MSR-to-production collaboration', '99.8% uptime for adapted research prototype', 'Improvements contributed back to MSR engine', 'Created reusable pattern for future projects')
    ),
    jsonb_build_array(
      jsonb_build_object('question', 'What were the biggest gaps between research and production?', 'likelihood', 'high', 'suggestedAnswer', 'Error handling (research fails fast, production needs graceful degradation), monitoring (research uses notebooks, production needs observability), and edge cases (research uses clean data, production sees everything).', 'keyPoints', jsonb_build_array('Error handling', 'Monitoring', 'Edge cases', 'Scale'))
    ),
    jsonb_build_object('difficulty', 'senior', 'tags', jsonb_build_array('collaboration', 'cross-team', 'research', 'communication')),
    v_now, v_now
  );

  -- Answer 5: Building Trust with Skeptical Users
  INSERT INTO technical_answers (id, user_id, profile_id, question, question_type, format, sources, answer, follow_ups, metadata, created_at, updated_at)
  VALUES (
    gen_random_uuid(), v_user_id, v_profile_id,
    'Tell me about a time you had to build trust with skeptical users',
    'experience',
    jsonb_build_object(
      'type', 'STAR',
      'sections', jsonb_build_array(
        jsonb_build_object('label', 'Situation', 'content', 'MTAC analysts were skeptical of AI-generated intelligence and needed to verify every statement.'),
        jsonb_build_object('label', 'Task', 'content', 'Build trust to achieve adoption for a mission-critical AI system.'),
        jsonb_build_object('label', 'Action', 'content', 'Implemented citation tracking, entity merge UI, transparent limitations, pilot program with feedback loops.'),
        jsonb_build_object('label', 'Result', 'content', '94% citation accuracy, 87% satisfaction, daily adoption by all teams.')
      )
    ),
    jsonb_build_object('storyIds', jsonb_build_array(v_story_5::text, v_story_12::text), 'profileSections', jsonb_build_array('activeProjects'), 'synthesized', true),
    jsonb_build_object(
      'structured', jsonb_build_array(
        jsonb_build_object('label', 'Situation', 'content', 'MTAC analysts were initially skeptical of AI-generated intelligence. They needed to verify every statement before including it in official reports, which negated the time savings. For a mission-critical system, trust was essential.'),
        jsonb_build_object('label', 'Task', 'content', 'Build trust with skeptical users to achieve adoption of the AI system for daily intelligence work.'),
        jsonb_build_object('label', 'Action', 'content', 'Implemented multiple trust-building features: (1) Citation tracking linking every AI statement to source documents with one-click verification; (2) Entity merge UI giving analysts control over data quality; (3) Transparent limitations - system explicitly says "I don''t have information" rather than hallucinating; (4) Pilot program with 5 analysts for detailed feedback; (5) Regular feedback sessions and iterative improvements.'),
        jsonb_build_object('label', 'Result', 'content', '94% citation accuracy achieved. 87% user satisfaction in post-launch survey. Daily adoption across all MTAC teams. The trust-building approach became a model for AI system rollouts in the organization.')
      ),
      'narrative', 'I built trust with initially skeptical users to drive adoption of our **AI-powered threat intelligence system**.\n\n**The Challenge**: MTAC analysts were rightfully skeptical of AI-generated intelligence. For their work, every claim must be verifiable - they can''t include unverified AI statements in official reports. Initial reaction was "interesting demo, but I''ll stick to manual analysis."\n\n**My Trust-Building Strategy**:\n\n1. **Citation Tracking (94% accuracy)**\n   - Every AI-generated statement links to source documents\n   - One-click access to verify any claim\n\n2. **Human-in-the-Loop Controls**\n   - Entity merge UI lets analysts correct AI mistakes\n   - Analysts feel ownership over data quality\n\n3. **Transparent Limitations**\n   - System explicitly says "I don''t have information on this"\n   - No hallucination - silence is better than fabrication\n\n**The Outcome**: **87% user satisfaction** in our post-launch survey. Analysts now use the system daily for intelligence work.',
      'bulletPoints', jsonb_build_array('Citation tracking with 94% accuracy', 'Human-in-the-loop corrections', 'Transparent about limitations', '87% satisfaction, daily adoption')
    ),
    jsonb_build_array(
      jsonb_build_object('question', 'What was the biggest complaint and how did you address it?', 'likelihood', 'high', 'suggestedAnswer', 'Duplicate entities fragmenting the knowledge graph. Addressed with entity merge UI that let analysts combine duplicates themselves, improving both immediate usability and long-term data quality.', 'keyPoints', jsonb_build_array('User feedback', 'Entity merge UI', 'Continuous improvement'))
    ),
    jsonb_build_object('difficulty', 'senior', 'tags', jsonb_build_array('trust', 'user-research', 'adoption', 'ai', 'responsible-ai')),
    v_now, v_now
  );

  -- Answer 6: System Design - Document Search with Relationships
  INSERT INTO technical_answers (id, user_id, profile_id, question, question_type, format, sources, answer, follow_ups, metadata, created_at, updated_at)
  VALUES (
    gen_random_uuid(), v_user_id, v_profile_id,
    'Design a document search system that understands relationships between entities',
    'system-design',
    jsonb_build_object(
      'type', 'Requirements-Design-Tradeoffs',
      'sections', jsonb_build_array(
        jsonb_build_object('label', 'Requirements', 'content', 'Entity extraction, relationship mapping, hybrid search, scalability, accuracy.'),
        jsonb_build_object('label', 'Design', 'content', 'GraphRAG architecture with document ingestion, entity extraction pipeline, knowledge graph storage, hybrid retrieval.'),
        jsonb_build_object('label', 'Tradeoffs', 'content', 'Accuracy vs cost, real-time vs batch processing, graph complexity vs query performance.')
      )
    ),
    jsonb_build_object('storyIds', jsonb_build_array(v_story_1::text, v_story_2::text, v_story_3::text, v_story_4::text), 'profileSections', jsonb_build_array('activeProjects'), 'synthesized', true),
    jsonb_build_object(
      'structured', jsonb_build_array(
        jsonb_build_object('label', 'Requirements', 'content', 'Entity extraction from documents, relationship mapping between entities, hybrid search (semantic + keyword + graph), scalability to thousands of documents, high accuracy for production use.'),
        jsonb_build_object('label', 'High-Level Architecture', 'content', 'Document Ingestion (Azure Functions) → Processing Pipeline (Databricks) → Entity Extraction (GPT-4) → Knowledge Graph (Cosmos DB) → Vector Index (Azure Cognitive Search) → Query Layer (C# API) → Frontend.'),
        jsonb_build_object('label', 'Key Components', 'content', '1) Entity extraction with domain-specific prompts and few-shot examples; 2) Relationship extraction with evidence requirements; 3) Hybrid search combining vectors, keywords, and graph traversal; 4) Load balancing across LLM endpoints.'),
        jsonb_build_object('label', 'Tradeoffs', 'content', 'GPT-4 vs smaller models (accuracy vs cost), real-time vs batch extraction (freshness vs cost), graph depth vs query latency.')
      ),
      'narrative', 'I''ll design a **GraphRAG-based document search system** that understands entity relationships - similar to what I built for Microsoft''s threat intelligence platform.\n\n## High-Level Architecture\n\n```\nDocuments → Ingestion → Processing → Entity Extraction → Knowledge Graph\n                                              ↓\n                                    Vector Index ← Hybrid Search ← Query API ← Users\n```\n\n## Key Components\n\n### 1. Document Ingestion\n- Azure Functions triggered by new documents\n- Format conversion (PDF, DOCX → text)\n- Semantic chunking (800-1200 tokens with overlap)\n\n### 2. Entity Extraction Pipeline\n- **GPT-4** with domain-specific prompts\n- Custom entity types for the domain\n- Few-shot examples from real documents\n- Confidence scoring to filter uncertain extractions\n\n### 3. Knowledge Graph Storage (Cosmos DB)\n- Entities as nodes with properties\n- Relationships as edges with metadata\n- Community detection for theme clustering\n\n### 4. Hybrid Search\n- Vector search + Keyword search + Graph traversal\n- Parallel execution with weighted result merging\n\n### 5. Load Balancing\n- Multi-endpoint deployment for LLM calls\n- Automatic failover and rate limit handling',
      'bulletPoints', jsonb_build_array('GraphRAG architecture for entity relationship understanding', 'Hybrid search: vector + keyword + graph traversal', 'Domain-specific entity extraction with GPT-4', 'Load balancing for LLM scalability', 'Caching for cost optimization')
    ),
    jsonb_build_array(
      jsonb_build_object('question', 'How would you handle entity deduplication?', 'likelihood', 'high', 'suggestedAnswer', 'Combine automated clustering (similar names/embeddings) with user-driven merge UI. Store merge history for audit. Apply mappings at query time.', 'keyPoints', jsonb_build_array('Automated detection', 'User confirmation', 'Audit trail')),
      jsonb_build_object('question', 'How would you evaluate search quality?', 'likelihood', 'medium', 'suggestedAnswer', 'Create golden dataset with labeled queries and expected results. Measure precision/recall. Track user feedback. A/B test ranking changes.', 'keyPoints', jsonb_build_array('Golden dataset', 'Precision/recall', 'User feedback'))
    ),
    jsonb_build_object('difficulty', 'staff', 'tags', jsonb_build_array('system-design', 'graphrag', 'search', 'azure', 'llm')),
    v_now, v_now
  );

  -- Answer 7: Design for LLM Rate Limits
  INSERT INTO technical_answers (id, user_id, profile_id, question, question_type, format, sources, answer, follow_ups, metadata, created_at, updated_at)
  VALUES (
    gen_random_uuid(), v_user_id, v_profile_id,
    'How would you design a system to handle LLM rate limits?',
    'system-design',
    jsonb_build_object(
      'type', 'Requirements-Design-Tradeoffs',
      'sections', jsonb_build_array(
        jsonb_build_object('label', 'Requirements', 'content', 'Handle rate limits gracefully, maximize throughput, maintain availability.'),
        jsonb_build_object('label', 'Design', 'content', 'Multi-endpoint deployment with custom load balancer, health checks, caching layer.'),
        jsonb_build_object('label', 'Tradeoffs', 'content', 'Cost (more endpoints) vs capacity, complexity vs reliability.')
      )
    ),
    jsonb_build_object('storyIds', jsonb_build_array(v_story_2::text), 'profileSections', jsonb_build_array('activeProjects'), 'synthesized', false),
    jsonb_build_object(
      'structured', jsonb_build_array(
        jsonb_build_object('label', 'Requirements', 'content', 'Handle rate limits without user-visible errors, maximize throughput, maintain high availability, control costs.'),
        jsonb_build_object('label', 'Architecture', 'content', 'Multi-endpoint deployment (4 regions) → Custom Load Balancer → Request Queue → Rate Tracking → Health Checks → Failover Logic.'),
        jsonb_build_object('label', 'Key Mechanisms', 'content', '1) Per-endpoint rate tracking with automatic reset; 2) Least-loaded-first routing; 3) Health checks with automatic failover; 4) Response caching to reduce LLM calls; 5) Circuit breakers for degraded mode.'),
        jsonb_build_object('label', 'Tradeoffs', 'content', 'More endpoints = higher cost but better capacity. Caching adds complexity but reduces load. Queue-based adds latency but handles bursts.')
      ),
      'narrative', 'I''ll walk through designing a system to handle **LLM rate limits** - something I''ve built for production at Microsoft.\n\n## The Challenge\n\nLLM APIs have rate limits - typically around 240 requests/minute. When you hit limits, you get 429 errors and degraded user experience.\n\n## My Design\n\n### 1. Multi-Endpoint Deployment\nDeploy across **multiple regional endpoints**:\n- East US (primary)\n- West US\n- Central US\n- Each endpoint has its own rate limit, so 4 endpoints = 4x capacity.\n\n### 2. Custom Load Balancer\n**Key features:**\n- Track requests per endpoint per minute\n- Automatic reset at minute boundaries\n- Route to least-loaded healthy endpoint\n- Failover if endpoint becomes unhealthy\n\n### 3. Caching Layer\nReduce LLM calls by caching:\n- Identical prompts → same response\n- Hash prompts as cache keys\n- 30-day TTL for entity extraction\n\n### 4. Circuit Breakers\nWhen all endpoints are overloaded:\n- Queue requests with timeout\n- Return degraded response\n- Prevent cascade failures\n\n## Results from Production\n- **4x capacity** (240 → 960 req/min)\n- **<1% throttling** (down from 15%)\n- **<10 second** response time',
      'bulletPoints', jsonb_build_array('Multi-region deployment for 4x capacity', 'Custom load balancer with rate tracking', 'Health checks and automatic failover', 'Caching to reduce LLM calls', 'Circuit breakers for graceful degradation')
    ),
    jsonb_build_array(
      jsonb_build_object('question', 'How do you handle the cold start problem when endpoints come back online?', 'likelihood', 'medium', 'suggestedAnswer', 'Gradual ramp-up: when endpoint recovers, start with 10% traffic and increase over 5 minutes. Monitor error rates before full traffic restoration.', 'keyPoints', jsonb_build_array('Gradual ramp-up', 'Error monitoring', 'Traffic percentage'))
    ),
    jsonb_build_object('difficulty', 'senior', 'tags', jsonb_build_array('system-design', 'rate-limiting', 'load-balancing', 'llm')),
    v_now, v_now
  );

  -- Answer 8: Explain GraphRAG
  INSERT INTO technical_answers (id, user_id, profile_id, question, question_type, format, sources, answer, follow_ups, metadata, created_at, updated_at)
  VALUES (
    gen_random_uuid(), v_user_id, v_profile_id,
    'Explain GraphRAG and how it differs from traditional RAG',
    'conceptual',
    jsonb_build_object(
      'type', 'Explain-Example-Tradeoffs',
      'sections', jsonb_build_array(
        jsonb_build_object('label', 'Explain', 'content', 'GraphRAG builds a knowledge graph from documents, enabling relationship-aware retrieval.'),
        jsonb_build_object('label', 'Example', 'content', 'Query about threat actor networks retrieves connected entities, not just similar documents.'),
        jsonb_build_object('label', 'Tradeoffs', 'content', 'Higher accuracy for relationship queries, but more expensive and complex to build.')
      )
    ),
    jsonb_build_object('storyIds', jsonb_build_array(v_story_1::text), 'profileSections', jsonb_build_array('activeProjects'), 'synthesized', false),
    jsonb_build_object(
      'structured', jsonb_build_array(
        jsonb_build_object('label', 'What is GraphRAG?', 'content', 'GraphRAG extends traditional RAG by building a knowledge graph from documents. Instead of just storing document chunks as vectors, it extracts entities and relationships, enabling queries that understand connections across the entire corpus.'),
        jsonb_build_object('label', 'How it Differs', 'content', 'Traditional RAG: Query → Vector search → Similar chunks → LLM generation. GraphRAG: Query → Vector search + Graph traversal → Chunks + Related entities + Relationships → LLM generation with full context.'),
        jsonb_build_object('label', 'Example', 'content', 'Query: "What organizations has APT28 targeted?" Traditional RAG might miss documents using alias "Fancy Bear". GraphRAG finds APT28, traverses "targets" relationships, returns all connected organizations regardless of naming.'),
        jsonb_build_object('label', 'Tradeoffs', 'content', 'Pros: Better for relationship queries, theme analysis, corpus-wide patterns. Cons: Higher cost (entity extraction), more complex pipeline, requires domain expertise for entity types.')
      ),
      'narrative', '**GraphRAG** is an evolution of traditional RAG that builds a **knowledge graph** from your documents, enabling queries that understand relationships across the entire corpus.\n\n## Traditional RAG\n\n```\nQuery → Vector Search → Top-K Similar Chunks → LLM Generation\n```\n\nLimitations:\n- Only finds documents similar to the query\n- Misses related information in dissimilar documents\n- Can''t answer "who is connected to whom?"\n\n## GraphRAG\n\n```\nQuery → Vector Search + Graph Traversal → Chunks + Entities + Relationships → LLM Generation\n```\n\n**Key difference**: Before query time, GraphRAG:\n1. **Extracts entities** (people, organizations, concepts) from all documents\n2. **Maps relationships** between entities\n3. **Clusters into communities** (themes, topics)\n\n## Concrete Example\n\n**Query**: "What organizations has APT28 targeted?"\n\n**Traditional RAG**: Searches for chunks containing "APT28" and "targeted." Might miss documents that use the alias "Fancy Bear."\n\n**GraphRAG**: \n1. Finds "APT28" entity (knows it''s the same as "Fancy Bear")\n2. Traverses all "targets" relationships\n3. Returns connected organization entities with evidence\n4. Synthesizes comprehensive answer across multiple sources',
      'bulletPoints', jsonb_build_array('Builds knowledge graph from documents', 'Extracts entities and relationships before query time', 'Enables relationship-aware queries across corpus', 'Best for cross-document analysis and theme-based retrieval')
    ),
    jsonb_build_array(
      jsonb_build_object('question', 'When would you choose traditional RAG over GraphRAG?', 'likelihood', 'high', 'suggestedAnswer', 'When relationships between entities aren''t important, when documents are independent, when budget is limited, or when real-time indexing is required. GraphRAG adds value for corpus-wide analysis.', 'keyPoints', jsonb_build_array('Independent documents', 'Budget constraints', 'Real-time requirements'))
    ),
    jsonb_build_object('difficulty', 'senior', 'tags', jsonb_build_array('graphrag', 'rag', 'ai', 'architecture', 'conceptual')),
    v_now, v_now
  );

  -- Answer 9: Prompt Engineering Approach
  INSERT INTO technical_answers (id, user_id, profile_id, question, question_type, format, sources, answer, follow_ups, metadata, created_at, updated_at)
  VALUES (
    gen_random_uuid(), v_user_id, v_profile_id,
    'How do you approach prompt engineering for domain-specific tasks?',
    'conceptual',
    jsonb_build_object(
      'type', 'Explain-Example-Tradeoffs',
      'sections', jsonb_build_array(
        jsonb_build_object('label', 'Explain', 'content', 'Systematic approach: baseline, domain analysis, few-shot examples, iteration with evaluation.'),
        jsonb_build_object('label', 'Example', 'content', 'Entity extraction improved from 70% to 92% through domain-specific types, few-shot examples, and confidence scoring.'),
        jsonb_build_object('label', 'Tradeoffs', 'content', 'More examples = better accuracy but higher token cost. Domain-specific = better quality but less generalizable.')
      )
    ),
    jsonb_build_object('storyIds', jsonb_build_array(v_story_3::text), 'profileSections', jsonb_build_array('activeProjects'), 'synthesized', false),
    jsonb_build_object(
      'structured', jsonb_build_array(
        jsonb_build_object('label', 'My Approach', 'content', '1) Establish baseline with generic prompts, 2) Analyze failure modes, 3) Define domain-specific constraints, 4) Add few-shot examples from real data, 5) Iterate with quantitative evaluation, 6) Add confidence scoring for production.'),
        jsonb_build_object('label', 'Key Principles', 'content', 'Be explicit about output format. Use domain terminology. Provide examples of edge cases. Tell the model what NOT to do. Include confidence/certainty indicators.'),
        jsonb_build_object('label', 'Example: Entity Extraction', 'content', 'Started at 70% accuracy with generic prompts. Defined 6 domain-specific entity types. Added 20 few-shot examples from real reports. Explicit instructions to ignore generic mentions. Result: 92% accuracy.'),
        jsonb_build_object('label', 'Evaluation', 'content', 'Create labeled evaluation dataset. Measure precision/recall. Track common failure modes. A/B test prompt variations systematically.')
      ),
      'narrative', 'I take a **systematic, evidence-based approach** to prompt engineering for domain-specific tasks.\n\n## My Framework\n\n### 1. Establish Baseline\n- Start with a generic prompt\n- Measure performance quantitatively\n- Creates comparison point for improvements\n\n### 2. Analyze Failure Modes\n- What''s the model getting wrong?\n- Categories: wrong type, missed entity, hallucination, format errors\n- Prioritize by frequency and impact\n\n### 3. Define Domain Constraints\n- What entity types matter for this domain?\n- What should be ignored?\n- What format is required?\n\n### 4. Add Few-Shot Examples\n- Select examples that cover:\n  - Common cases\n  - Edge cases\n  - What NOT to extract\n- 5-20 examples is typically optimal\n\n### 5. Iterate with Evaluation\n- Create labeled test dataset (500+ examples)\n- Measure precision/recall after each change\n- A/B test prompt variations\n\n## Concrete Example: Threat Intelligence Entity Extraction\n\n**Before** (generic prompt): 70% accuracy\n\n**Changes made**:\n- Defined 6 entity types: threat_actor, malware, vulnerability, target_organization, infrastructure, technique\n- Added 20 few-shot examples from real MTAC reports\n- Explicit instruction: "Ignore generic mentions like ''hackers'' or ''the company''"\n- Added confidence scoring: High/Medium/Low\n\n**After**: 92% accuracy (22-point improvement)',
      'bulletPoints', jsonb_build_array('Systematic: baseline → analysis → iteration → evaluation', 'Domain-specific entity types and terminology', 'Few-shot examples from real data (5-20)', 'Explicit about what NOT to do', 'Quantitative evaluation with labeled dataset')
    ),
    jsonb_build_array(
      jsonb_build_object('question', 'How do you handle prompt drift as the model updates?', 'likelihood', 'medium', 'suggestedAnswer', 'Version-control prompts alongside code. Run evaluation suite after model updates. Monitor production accuracy metrics. Have rollback plan for prompt versions.', 'keyPoints', jsonb_build_array('Version control', 'Automated evaluation', 'Production monitoring'))
    ),
    jsonb_build_object('difficulty', 'senior', 'tags', jsonb_build_array('prompt-engineering', 'ai', 'llm', 'methodology')),
    v_now, v_now
  );

  -- Answer 10: Measuring AI System Success
  INSERT INTO technical_answers (id, user_id, profile_id, question, question_type, format, sources, answer, follow_ups, metadata, created_at, updated_at)
  VALUES (
    gen_random_uuid(), v_user_id, v_profile_id,
    'How do you measure success for AI/ML systems in production?',
    'conceptual',
    jsonb_build_object(
      'type', 'Explain-Example-Tradeoffs',
      'sections', jsonb_build_array(
        jsonb_build_object('label', 'Explain', 'content', 'Multi-dimensional: accuracy metrics, user satisfaction, business impact, operational health.'),
        jsonb_build_object('label', 'Example', 'content', 'MTAC: 94% citation accuracy (quality), 87% satisfaction (user), 50% time savings (business), 99.8% uptime (ops).'),
        jsonb_build_object('label', 'Tradeoffs', 'content', 'More metrics = better understanding but harder to optimize. Leading vs lagging indicators.')
      )
    ),
    jsonb_build_object('storyIds', jsonb_build_array(v_story_1::text, v_story_12::text), 'profileSections', jsonb_build_array('activeProjects'), 'synthesized', true),
    jsonb_build_object(
      'structured', jsonb_build_array(
        jsonb_build_object('label', 'Metric Categories', 'content', '1) Quality Metrics: accuracy, precision/recall, citation accuracy; 2) User Metrics: satisfaction, adoption, time savings; 3) Business Metrics: productivity gain, cost reduction; 4) Operational Metrics: uptime, latency, error rates.'),
        jsonb_build_object('label', 'Leading vs Lagging', 'content', 'Leading (predict success): query quality scores, time-to-first-value. Lagging (confirm success): user satisfaction surveys, adoption rates.'),
        jsonb_build_object('label', 'Example from MTAC', 'content', 'Quality: 94% citation accuracy, 92% entity extraction. User: 87% satisfaction, daily adoption. Business: 50% reduction in report time. Ops: 99.8% uptime, <10s latency.'),
        jsonb_build_object('label', 'Implementation', 'content', 'Dashboards with real-time metrics. Weekly reviews of trends. Alerts for degradation. Quarterly user surveys.')
      ),
      'narrative', 'I measure AI system success across **four dimensions**: quality, user, business, and operational metrics.\n\n## 1. Quality Metrics (Is the AI accurate?)\n\n- **Accuracy/Precision/Recall**: Core ML metrics\n- **Citation accuracy**: % of claims traceable to sources\n- **Hallucination rate**: % of false information\n- **Format compliance**: Does output match expected schema?\n\n**Example from MTAC**:\n- 94% citation accuracy\n- 92% entity extraction accuracy\n- <5% hallucination rate\n\n## 2. User Metrics (Do users like it?)\n\n- **Satisfaction surveys**: Post-launch NPS or CSAT\n- **Adoption rate**: Daily/weekly active users\n- **Feature usage**: Which features get used?\n\n**Example from MTAC**:\n- 87% user satisfaction\n- Daily usage by all MTAC teams\n\n## 3. Business Metrics (Does it create value?)\n\n- **Time savings**: Hours saved per task\n- **Productivity gain**: Tasks completed per period\n- **Cost impact**: Revenue generated or costs avoided\n\n**Example from MTAC**:\n- 50% reduction in time spent on weekly roundups\n\n## 4. Operational Metrics (Is it reliable?)\n\n- **Uptime/availability**: % of time system is accessible\n- **Latency**: Response time percentiles\n- **Error rates**: Failed requests\n\n**Example from MTAC**:\n- 99.8% API uptime\n- <10 second response time\n- $1,200/day API costs (40% optimized)',
      'bulletPoints', jsonb_build_array('Quality: accuracy, precision/recall, hallucination rate', 'User: satisfaction, adoption, feature usage', 'Business: time savings, productivity, cost impact', 'Operational: uptime, latency, error rates')
    ),
    jsonb_build_array(
      jsonb_build_object('question', 'How do you handle conflicting metrics?', 'likelihood', 'medium', 'suggestedAnswer', 'Prioritize based on business goals. Often quality → user → business → ops. Example: improving accuracy might slow response time - acceptable if accuracy is the priority.', 'keyPoints', jsonb_build_array('Goal-based prioritization', 'Explicit tradeoffs', 'Stakeholder alignment'))
    ),
    jsonb_build_object('difficulty', 'senior', 'tags', jsonb_build_array('metrics', 'ai', 'production', 'measurement')),
    v_now, v_now
  );

  RAISE NOTICE 'MTAC project import completed successfully!';
  RAISE NOTICE 'Added: 1 project, 12 stories, 10 technical answers';
END $$;
