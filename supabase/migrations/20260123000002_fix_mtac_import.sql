-- Fix MTAC Import Issues
-- 1. Fix project not showing (use COALESCE for NULL handling)
-- 2. Add generated_answer_metadata to stories (for enhanced AI view)
-- 3. Add targetCompany to technical answers (for MTAC identification)
--
-- Run this AFTER running 20260123000001_import_mtac_project.sql

-- ============================================
-- CONFIGURATION - USE SAME VALUES AS BEFORE
-- ============================================
DO $$
DECLARE
  v_user_id uuid := '2a37edd5-f768-4b25-b2c9-e25909889ebb'::uuid;  -- Same as before
  v_profile_id uuid := 'efdd281e-3c4a-4452-9534-1ba4b6a16b08'::uuid;  -- Same as before
  v_project_exists boolean;
  v_stories_updated integer := 0;
  v_answers_updated integer := 0;
  v_row_count integer;
BEGIN
  -- ============================================
  -- 1. FIX: Add MTAC Project to Profile
  -- ============================================

  -- Check if project already exists
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = v_profile_id
    AND user_id = v_user_id
    AND active_projects @> '[{"name": "MTAC Intelligence Copilot"}]'::jsonb
  ) INTO v_project_exists;

  IF NOT v_project_exists THEN
    -- Use COALESCE to handle NULL active_projects
    UPDATE profiles
    SET active_projects = COALESCE(active_projects, '[]'::jsonb) || jsonb_build_array(jsonb_build_object(
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
      'hasDocumentation', true
    )),
    updated_at = now()
    WHERE id = v_profile_id AND user_id = v_user_id;

    RAISE NOTICE 'Project added to profile';
  ELSE
    RAISE NOTICE 'Project already exists in profile';
  END IF;

  -- ============================================
  -- 2. FIX: Add generated_answer_metadata to MTAC stories
  -- ============================================

  -- Story 1: Built Microsoft's First Production GraphRAG System
  UPDATE stories SET generated_answer_metadata = jsonb_build_object(
    'detectedQuestionType', 'experience',
    'answerFormat', 'STAR',
    'sections', jsonb_build_array(
      jsonb_build_object('label', 'Situation', 'content', 'MTAC analysts spent hours manually reading through thousands of threat intelligence documents daily. Traditional SharePoint search returned individual documents, missing critical patterns and connections across the entire corpus.'),
      jsonb_build_object('label', 'Task', 'content', 'Design and build Microsoft''s first production GraphRAG-based AI system to enable corpus-wide analysis with automatic entity extraction and relationship mapping.'),
      jsonb_build_object('label', 'Action', 'content', 'I designed the end-to-end architecture: Azure Functions for document ingestion, Databricks for processing, integrated MSR''s IRE engine for entity extraction, built hybrid search combining Azure Cognitive Search vectors with Cosmos DB graph traversal, created C# API layer with custom load balancing, and React frontend with D3.js visualization.'),
      jsonb_build_object('label', 'Result', 'content', 'Launched in production, used daily by MTAC analysts. 50% reduction in report summary time, 50% faster theme retrieval, 99.8% uptime. Became Microsoft''s first production GraphRAG, architecture adopted by other CST-E teams.')
    ),
    'narrative', E'I built **Microsoft''s first production GraphRAG system** for threat intelligence analysis at MTAC.\n\n**The Problem**: MTAC analysts were drowning in documents - thousands of threat intelligence reports daily, with no way to see the patterns and connections across them. Traditional SharePoint search was useless for understanding threat actor networks.\n\n**My Solution**: I designed and built a complete GraphRAG system that:\n- **Extracts entities** (threat actors, malware, targets) from every document using GPT-4\n- **Maps relationships** between entities in a knowledge graph\n- **Enables corpus-wide queries** like "Show me all organizations APT28 has targeted"\n- **Generates summaries with citations** so analysts can verify every claim\n\n**Key Technical Decisions**:\n1. **Hybrid Search**: Combined vector search + keyword matching + graph traversal\n2. **Custom Load Balancer**: Distributed across 4 GPT-4 endpoints for 960 req/min capacity\n3. **92% Entity Accuracy**: Achieved through domain-specific prompts and few-shot examples\n\n**The Impact**:\n- **50% reduction** in time spent on weekly roundups\n- **99.8% API uptime** with multi-region deployment\n- **94% citation accuracy** - every statement traceable to sources\n- **87% user satisfaction** among MTAC analysts\n\nThis became the reference architecture for GraphRAG systems across Microsoft''s CST-E division.',
    'bulletPoints', jsonb_build_array(
      'Built Microsoft''s first production GraphRAG system for threat intelligence',
      '50% reduction in analyst time on report summaries and weekly roundups',
      'Custom load balancing across 4 GPT-4 endpoints (960 req/min capacity)',
      '92% entity extraction accuracy through domain-specific prompt engineering',
      '99.8% API uptime with multi-region Azure deployment',
      '94% citation accuracy - every AI claim traceable to source documents',
      'Architecture adopted by other teams across CST-E division'
    ),
    'keyTalkingPoints', jsonb_build_array(
      'This was Microsoft''s FIRST production GraphRAG system - pioneering work',
      'The key innovation was combining entity extraction with relationship mapping at scale',
      'We achieved production-grade reliability (99.8% uptime) for mission-critical intelligence work',
      'The system enabled queries that were impossible before - understanding patterns across thousands of documents'
    ),
    'deliveryTips', jsonb_build_array(
      'Lead with the problem - analysts drowning in documents, missing critical patterns',
      'Emphasize the "first production GraphRAG" angle - this was pioneering at Microsoft',
      'Have the metrics ready: 50% time savings, 99.8% uptime, 94% citation accuracy',
      'Be ready to deep-dive into any technical component: load balancing, entity extraction, hybrid search'
    ),
    'followUpQA', jsonb_build_array(
      jsonb_build_object('question', 'How did you achieve 92% entity extraction accuracy?', 'likelihood', 'high', 'suggestedAnswer', 'Started at 70% with generic prompts. I developed domain-specific prompts with 6 threat intelligence entity types (threat_actor, malware, vulnerability, etc.) and 20 few-shot examples from real MTAC reports. Added confidence scoring to filter uncertain extractions.', 'keyPoints', jsonb_build_array('Domain-specific entity types', 'Few-shot examples from real data', 'Confidence scoring')),
      jsonb_build_object('question', 'What was the load balancing approach?', 'likelihood', 'high', 'suggestedAnswer', 'Custom C# load balancer distributing across 4 Azure OpenAI endpoints (2 East US, 1 West US, 1 Central US). Per-endpoint rate tracking, health checks every 30 seconds, automatic failover after 5 consecutive failures, least-loaded-first routing.', 'keyPoints', jsonb_build_array('4 regional endpoints', 'Health checks', 'Automatic failover')),
      jsonb_build_object('question', 'How did you collaborate with Microsoft Research?', 'likelihood', 'medium', 'suggestedAnswer', 'Established bi-weekly syncs. MSR provided the IRE engine as a research prototype. I wrapped it with production-grade error handling, retry logic, and monitoring. Several of our improvements were incorporated back into the next IRE release.', 'keyPoints', jsonb_build_array('Regular syncs', 'Production wrapper', 'Feedback loop'))
    ),
    'sources', jsonb_build_object('storyIds', jsonb_build_array(), 'profileSections', jsonb_build_array('activeProjects'), 'synthesized', false)
  )
  WHERE user_id = v_user_id AND profile_id = v_profile_id
  AND title = 'Built Microsoft''s First Production GraphRAG System';
  GET DIAGNOSTICS v_stories_updated = ROW_COUNT;

  -- Story 2: Designed GPT-4 Load Balancing
  UPDATE stories SET generated_answer_metadata = jsonb_build_object(
    'detectedQuestionType', 'behavioral-technical',
    'answerFormat', 'STAR',
    'sections', jsonb_build_array(
      jsonb_build_object('label', 'Situation', 'content', 'Single GPT-4 endpoint had 240 req/min rate limit. During peak hours, analysts waited 30-60 seconds with ~15% throttling errors.'),
      jsonb_build_object('label', 'Task', 'content', 'Design a load balancing solution to eliminate throttling and improve response times while maintaining high availability.'),
      jsonb_build_object('label', 'Action', 'content', 'Designed custom load balancer in C# distributing requests across 4 Azure OpenAI deployments. Implemented per-endpoint rate tracking, health checks, automatic failover, and least-loaded-first routing with geographic proximity optimization.'),
      jsonb_build_object('label', 'Result', 'content', 'Combined capacity of 960 req/min (4x increase), response time under 10 seconds, throttling dropped to <1%, 50% reduction in processing time.')
    ),
    'narrative', E'I **solved LLM rate limiting** by designing a custom load balancer that increased our capacity 4x.\n\n**The Problem**: Our single GPT-4 endpoint was capped at 240 requests per minute. During peak hours, analysts waited 30-60 seconds for responses, and 15% of requests were failing due to throttling.\n\n**My Solution**: I built a custom load balancer in C# that distributes across 4 Azure OpenAI deployments:\n\n**Architecture**:\n- **4 Regional Endpoints**: East US (x2), West US, Central US\n- **Per-endpoint Tracking**: Request count, rate limit status, health state\n- **Smart Routing**: Least-loaded-first with geographic proximity optimization\n- **Health Checks**: Every 30 seconds, mark unhealthy after 5 failures\n- **Automatic Failover**: Healthy endpoints absorb load seamlessly\n\n**The Results** were dramatic:\n- **960 req/min capacity** (4x increase from 240)\n- **<10 second response time** for complex queries\n- **Throttling dropped from 15% to <1%**\n- **50% faster** overall processing\n\nThe architecture has handled multiple Azure incidents transparently - analysts never noticed.',
    'bulletPoints', jsonb_build_array(
      '4x capacity increase: 240 to 960 requests per minute',
      'Response time under 10 seconds for complex queries',
      'Throttling reduced from 15% to <1%',
      '50% faster overall processing',
      'Zero-impact automatic failover during Azure incidents'
    ),
    'keyTalkingPoints', jsonb_build_array(
      'The key insight was that each Azure region has its own rate limit - 4 endpoints = 4x capacity',
      'Built custom solution because Azure built-in load balancing doesn''t understand LLM rate limits',
      'Health checks and failover meant analysts never experienced outages'
    ),
    'deliveryTips', jsonb_build_array(
      'Start with the pain point: 15% of requests failing, analysts frustrated',
      'Walk through the architecture: 4 endpoints, routing logic, health checks',
      'End with the dramatic improvement: 4x capacity, <1% throttling'
    ),
    'followUpQA', jsonb_build_array(
      jsonb_build_object('question', 'How do you handle the cold start problem when endpoints recover?', 'likelihood', 'medium', 'suggestedAnswer', 'Gradual ramp-up: when an endpoint recovers, we start at 10% traffic and increase over 5 minutes while monitoring error rates. Only restore full traffic after sustained success.', 'keyPoints', jsonb_build_array('Gradual ramp-up', 'Error monitoring', 'Sustained success check')),
      jsonb_build_object('question', 'How did you test the failover scenarios?', 'likelihood', 'high', 'suggestedAnswer', 'Chaos engineering tests: intentionally disabled endpoints, verified traffic rerouted within seconds, checked recovery when endpoints came back. All automated in our CI/CD pipeline.', 'keyPoints', jsonb_build_array('Chaos testing', 'Automated verification', 'CI/CD integration'))
    ),
    'sources', jsonb_build_object('storyIds', jsonb_build_array(), 'profileSections', jsonb_build_array('activeProjects'), 'synthesized', false)
  )
  WHERE user_id = v_user_id AND profile_id = v_profile_id
  AND title = 'Designed GPT-4 Load Balancing for 960 req/min Capacity';
  GET DIAGNOSTICS v_row_count = ROW_COUNT;
  v_stories_updated := v_stories_updated + v_row_count;

  -- Story 3: Improved Entity Extraction Accuracy
  UPDATE stories SET generated_answer_metadata = jsonb_build_object(
    'detectedQuestionType', 'behavioral-technical',
    'answerFormat', 'STAR',
    'sections', jsonb_build_array(
      jsonb_build_object('label', 'Situation', 'content', 'Initial entity extraction using generic prompts achieved only 70% accuracy, missing critical threat intelligence entities.'),
      jsonb_build_object('label', 'Task', 'content', 'Improve entity extraction accuracy to production-grade quality (>90%) for threat intelligence domain.'),
      jsonb_build_object('label', 'Action', 'content', 'Developed domain-specific prompts with custom entity types, few-shot examples from real reports, confidence scoring, and explicit instructions on what NOT to extract.'),
      jsonb_build_object('label', 'Result', 'content', 'Entity extraction accuracy improved from 70% to 92%. Enabled accurate threat actor network visualization.')
    ),
    'narrative', E'I improved **entity extraction accuracy from 70% to 92%** through systematic prompt engineering.\n\n**The Problem**: Our initial approach using generic LangChain prompts was only 70% accurate. It missed critical entities like specific malware names while extracting irrelevant generic terms like "the company" or "hackers".\n\n**My Approach**:\n\n1. **Domain-Specific Entity Types**\n   Defined 6 threat-intelligence-specific types:\n   - threat_actor, malware, vulnerability\n   - target_organization, infrastructure, technique\n\n2. **Few-Shot Examples**\n   Created 20 examples from real MTAC reports showing:\n   - What TO extract: "APT28 deployed CHOPSTICK malware"\n   - What NOT to extract: Generic mentions like "hackers attacked"\n\n3. **Confidence Scoring**\n   Added High/Medium/Low confidence ratings\n   Only high-confidence extractions go into the knowledge graph\n\n4. **Evaluation Dataset**\n   Built 500-entity labeled dataset for measuring accuracy\n\n**The Results**:\n- **92% accuracy** (22-point improvement)\n- Enabled accurate threat actor network visualization\n- Approach documented and reused by other teams',
    'bulletPoints', jsonb_build_array(
      '22-point accuracy improvement: 70% to 92%',
      '6 domain-specific entity types for threat intelligence',
      '20 few-shot examples from real MTAC reports',
      'Confidence scoring to filter uncertain extractions',
      '500-entity evaluation dataset for measurement'
    ),
    'keyTalkingPoints', jsonb_build_array(
      'Generic prompts don''t work for specialized domains - need domain expertise',
      'Few-shot examples are critical - show what TO extract AND what NOT to extract',
      'Confidence scoring lets you trade off precision vs recall'
    ),
    'deliveryTips', jsonb_build_array(
      'Have specific examples ready: "APT28" vs generic "hackers"',
      'Quantify the improvement clearly: 70% to 92%',
      'Mention the systematic approach: types, examples, evaluation'
    ),
    'followUpQA', jsonb_build_array(
      jsonb_build_object('question', 'How did you build the evaluation dataset?', 'likelihood', 'high', 'suggestedAnswer', 'Manually labeled 500 entities across 50 documents with help from 2 MTAC analysts. Inter-annotator agreement of 89%. Used this as ground truth for measuring prompt iterations.', 'keyPoints', jsonb_build_array('Manual labeling', 'Domain expert involvement', 'Inter-annotator agreement')),
      jsonb_build_object('question', 'What were the most common error types?', 'likelihood', 'medium', 'suggestedAnswer', 'Three main categories: (1) False positives - extracting generic terms; (2) Missed aliases - not recognizing "Fancy Bear" = "APT28"; (3) Wrong type - calling malware a threat actor. Fixed each with targeted few-shot examples.', 'keyPoints', jsonb_build_array('False positives', 'Alias recognition', 'Type confusion'))
    ),
    'sources', jsonb_build_object('storyIds', jsonb_build_array(), 'profileSections', jsonb_build_array('activeProjects'), 'synthesized', false)
  )
  WHERE user_id = v_user_id AND profile_id = v_profile_id
  AND title = 'Improved Entity Extraction Accuracy from 70% to 92%';
  GET DIAGNOSTICS v_row_count = ROW_COUNT;
  v_stories_updated := v_stories_updated + v_row_count;

  -- Story 4: Created Hybrid Search System
  UPDATE stories SET generated_answer_metadata = jsonb_build_object(
    'detectedQuestionType', 'system-design',
    'answerFormat', 'STAR',
    'sections', jsonb_build_array(
      jsonb_build_object('label', 'Situation', 'content', 'Vector-only search missed keyword matches. Searching for "APT28" sometimes missed "Fancy Bear" documents. Knowledge graph relationships weren''t leveraged.'),
      jsonb_build_object('label', 'Task', 'content', 'Design a multi-pronged search combining semantic vectors, keyword matching, and graph traversal.'),
      jsonb_build_object('label', 'Action', 'content', 'Implemented Azure Cognitive Search with HNSW vectors, BM25 keyword matching, semantic ranking, Cosmos DB graph queries for entity relationships, and query orchestration with weighted scoring.'),
      jsonb_build_object('label', 'Result', 'content', 'Dramatically improved retrieval quality. Queries find semantically relevant documents AND keyword matches AND traverse relationships. 94% citation accuracy.')
    ),
    'narrative', E'I designed a **hybrid search system** combining three retrieval strategies for comprehensive intelligence queries.\n\n**The Problem**: Traditional vector-only search had blind spots:\n- Missed exact keyword matches when embeddings weren''t similar\n- Didn''t leverage entity relationships in our knowledge graph\n- Searching "APT28" might miss documents using the alias "Fancy Bear"\n\n**My Solution - Three-Pronged Search**:\n\n1. **Vector Search (Azure Cognitive Search)**\n   - HNSW index for semantic similarity\n   - Catches conceptually related content\n\n2. **Keyword Search (BM25)**\n   - Exact term matching\n   - Handles entity names, technical terms\n\n3. **Graph Traversal (Cosmos DB)**\n   - 1-hop relationship queries\n   - "APT28" → finds all connected entities\n\n**Query Orchestration**:\n- Execute all three in parallel\n- Merge with weighted scoring\n- Semantic ranking for final relevance\n\n**The Results**:\n- Queries like "Russian election interference" now find:\n  - Semantically related documents\n  - Exact keyword matches\n  - Connected threat actor entities\n- **94% citation accuracy** from reduced noise',
    'bulletPoints', jsonb_build_array(
      'Three search strategies: vector + keyword + graph traversal',
      'Parallel execution with weighted score merging',
      'Entity alias resolution through graph relationships',
      '94% citation accuracy from reduced retrieval noise'
    ),
    'keyTalkingPoints', jsonb_build_array(
      'No single search method is perfect - need to combine approaches',
      'Graph traversal enables queries impossible with traditional RAG',
      'Parallel execution keeps latency acceptable despite complexity'
    ),
    'deliveryTips', jsonb_build_array(
      'Use concrete example: "APT28" query finding "Fancy Bear" documents',
      'Draw the three-pronged architecture if whiteboard available',
      'Mention the trade-off: complexity vs retrieval quality'
    ),
    'followUpQA', jsonb_build_array(
      jsonb_build_object('question', 'How did you tune the weights between search strategies?', 'likelihood', 'high', 'suggestedAnswer', 'Empirical testing with 100 benchmark queries. Started with equal weights, then tuned based on which strategy contributed most to correct answers. Ended up: 0.4 vector, 0.3 keyword, 0.3 graph.', 'keyPoints', jsonb_build_array('Benchmark queries', 'Empirical tuning', 'Final weights'))
    ),
    'sources', jsonb_build_object('storyIds', jsonb_build_array(), 'profileSections', jsonb_build_array('activeProjects'), 'synthesized', false)
  )
  WHERE user_id = v_user_id AND profile_id = v_profile_id
  AND title = 'Created Hybrid Search System (Vector + Keyword + Graph)';
  GET DIAGNOSTICS v_row_count = ROW_COUNT;
  v_stories_updated := v_stories_updated + v_row_count;

  -- Story 5: Built Citation Tracking System
  UPDATE stories SET generated_answer_metadata = jsonb_build_object(
    'detectedQuestionType', 'experience',
    'answerFormat', 'STAR',
    'sections', jsonb_build_array(
      jsonb_build_object('label', 'Situation', 'content', 'Analysts were skeptical of AI-generated intelligence. Needed to verify every statement before including in official reports.'),
      jsonb_build_object('label', 'Task', 'content', 'Implement citation tracking linking every AI statement to source documents.'),
      jsonb_build_object('label', 'Action', 'content', 'Designed prompts requiring [Source N] citations, parsing logic, metadata linking to SharePoint URLs, clickable UI with tooltips, validation for unsupported claims, audit logging.'),
      jsonb_build_object('label', 'Result', 'content', '94% citation accuracy. Analysts verify claims with one click. 87% satisfaction. Met SFI and Responsible AI compliance.')
    ),
    'narrative', E'I built a **citation tracking system** that links every AI-generated statement to its source documents.\n\n**The Problem**: MTAC analysts couldn''t trust AI-generated intelligence without verification. For official reports, every claim must be traceable. Without citations, analysts had to manually search for sources - negating the time savings.\n\n**My Solution**:\n\n1. **Prompt Engineering**\n   - Require [Source 1], [Source 2] format in all responses\n   - Explicit instruction: "Only include statements supported by sources"\n\n2. **Citation Parsing**\n   - Extract [Source N] indices from LLM output\n   - Map to actual document chunks\n   - Link to SharePoint URLs for full document access\n\n3. **UI Design**\n   - Clickable citation badges\n   - Hover tooltip shows source quote\n   - One-click to open full document\n\n4. **Validation**\n   - Flag claims without citations\n   - System says "I don''t have information" rather than hallucinating\n   - Audit logging for compliance reviews\n\n**The Results**:\n- **94% citation accuracy**\n- **One-click verification** for any claim\n- **87% user satisfaction**\n- Full **SFI and Responsible AI compliance**',
    'bulletPoints', jsonb_build_array(
      '94% citation accuracy - every claim traceable',
      'One-click source verification for analysts',
      'Transparent "I don''t know" for gaps instead of hallucination',
      'Full compliance with SFI and Responsible AI requirements'
    ),
    'keyTalkingPoints', jsonb_build_array(
      'Trust is earned through transparency - citations are essential',
      'Better to say "I don''t know" than hallucinate',
      'Compliance wasn''t an afterthought - built into design from start'
    ),
    'deliveryTips', jsonb_build_array(
      'Lead with the trust problem - analysts skeptical of AI',
      'Show how citations enable one-click verification',
      'Connect to Responsible AI principles'
    ),
    'followUpQA', jsonb_build_array(
      jsonb_build_object('question', 'How do you handle hallucinated citations?', 'likelihood', 'high', 'suggestedAnswer', 'Validation layer checks every citation index exists in the source context. Invalid citations are flagged and logged. We also sample-audit 5% of responses weekly to catch false citations that pass validation.', 'keyPoints', jsonb_build_array('Validation layer', 'Invalid citation flagging', 'Weekly audits'))
    ),
    'sources', jsonb_build_object('storyIds', jsonb_build_array(), 'profileSections', jsonb_build_array('activeProjects'), 'synthesized', false)
  )
  WHERE user_id = v_user_id AND profile_id = v_profile_id
  AND title = 'Built Citation Tracking System with 94% Accuracy';
  GET DIAGNOSTICS v_row_count = ROW_COUNT;
  v_stories_updated := v_stories_updated + v_row_count;

  -- Story 6: Designed Zero-Downtime Pipeline
  UPDATE stories SET generated_answer_metadata = jsonb_build_object(
    'detectedQuestionType', 'behavioral-technical',
    'answerFormat', 'STAR',
    'sections', jsonb_build_array(
      jsonb_build_object('label', 'Situation', 'content', 'Daily document refresh required service restarts. For mission-critical intelligence work, outages were unacceptable.'),
      jsonb_build_object('label', 'Task', 'content', 'Design a data refresh pipeline processing thousands of documents daily without service interruption.'),
      jsonb_build_object('label', 'Action', 'content', 'Built Azure Data Factory pipeline with graceful degradation: maintenance mode toggle, parallel ingestion, incremental indexing, atomic updates, rolling restarts, post-refresh verification.'),
      jsonb_build_object('label', 'Result', 'content', 'Zero hard downtime. Analysts continue working during ~45 minute refresh. Automatic health check recovery.')
    ),
    'narrative', E'I designed a **zero-downtime data refresh pipeline** that processes thousands of documents daily without service interruption.\n\n**The Problem**: Our system needed daily document ingestion to stay current with threat intelligence. But the refresh process required restarting services - and for mission-critical work, even brief outages were unacceptable.\n\n**My Solution - Graceful Degradation**:\n\n1. **Maintenance Mode Toggle**\n   - Frontend displays "Updating" banner\n   - System continues accepting queries (degraded but functional)\n   - No hard outage\n\n2. **Pipeline Architecture (Azure Data Factory)**\n   - Health check → Maintenance ON\n   - Parallel document ingestion\n   - Incremental IRE indexing (only changed docs)\n   - Atomic Cosmos DB updates\n   - Atomic Cognitive Search index swap\n   - Rolling web app restarts\n   - Health check → Maintenance OFF\n\n3. **Recovery Handling**\n   - If any step fails, previous state preserved\n   - Automatic retry with exponential backoff\n   - Alert on 3 consecutive failures\n\n**The Results**:\n- **Zero hard downtime**\n- Analysts work through ~45 minute refresh period\n- **Automatic recovery** from transient failures\n- Pipeline runs successfully every night at 2 AM',
    'bulletPoints', jsonb_build_array(
      'Zero hard downtime - degraded service only during refresh',
      '45-minute refresh window with transparent maintenance banner',
      'Atomic updates preserve previous state on failure',
      'Automatic recovery from transient failures'
    ),
    'keyTalkingPoints', jsonb_build_array(
      'Degraded service is better than outage for mission-critical systems',
      'Atomic updates and rollback capability are essential',
      'Transparency with users (maintenance banner) builds trust'
    ),
    'deliveryTips', jsonb_build_array(
      'Emphasize mission-critical nature - no outages allowed',
      'Walk through the pipeline steps',
      'Highlight the user experience: banner, continues working'
    ),
    'followUpQA', jsonb_build_array(
      jsonb_build_object('question', 'How do you handle failures mid-pipeline?', 'likelihood', 'high', 'suggestedAnswer', 'Each step is idempotent with checkpoint tracking. If failure occurs, resume from last checkpoint. Atomic updates mean partial completion doesn''t corrupt state. After 3 retries, alert the team and keep previous data live.', 'keyPoints', jsonb_build_array('Checkpoints', 'Idempotent steps', 'Atomic updates'))
    ),
    'sources', jsonb_build_object('storyIds', jsonb_build_array(), 'profileSections', jsonb_build_array('activeProjects'), 'synthesized', false)
  )
  WHERE user_id = v_user_id AND profile_id = v_profile_id
  AND title = 'Designed Zero-Downtime Daily Refresh Pipeline';
  GET DIAGNOSTICS v_row_count = ROW_COUNT;
  v_stories_updated := v_stories_updated + v_row_count;

  -- Story 7: Optimized LLM Costs
  UPDATE stories SET generated_answer_metadata = jsonb_build_object(
    'detectedQuestionType', 'behavioral-technical',
    'answerFormat', 'STAR',
    'sections', jsonb_build_array(
      jsonb_build_object('label', 'Situation', 'content', 'Daily API costs of $2,000 (~$60K/month) were unsustainable. Leadership flagged as blocker.'),
      jsonb_build_object('label', 'Task', 'content', 'Reduce costs to sustainable levels without impacting quality or analyst productivity.'),
      jsonb_build_object('label', 'Action', 'content', 'Implemented Redis caching (60% savings), model selection (GPT-4 for complex, GPT-4o Mini for simple), rate limiting, cost monitoring dashboards.'),
      jsonb_build_object('label', 'Result', 'content', 'Reduced from $2,000/day to $1,200/day (40% reduction). Project approved for production.')
    ),
    'narrative', E'I **reduced LLM API costs by 40%** through a multi-pronged optimization strategy.\n\n**The Problem**: Our AI system was burning through $2,000 in API costs daily - roughly $60,000 per month. Leadership flagged this as unsustainable and a potential project blocker.\n\n**My Optimization Strategy**:\n\n1. **Response Caching (60% savings)**\n   - Redis cache with hashed prompts as keys\n   - Entity extraction cached for 30 days\n   - Only new/modified documents trigger LLM calls\n\n2. **Smart Model Selection (20% savings)**\n   - GPT-4 for complex reasoning:\n     - Entity extraction\n     - Relationship detection\n   - GPT-4o Mini for simpler tasks:\n     - Summarization\n     - Theme descriptions\n\n3. **Cost Controls**\n   - Per-user rate limiting during development\n   - Real-time cost monitoring dashboards\n   - Alerts at 80% daily budget\n\n**The Results**:\n- **$2,000/day → $1,200/day** (40% reduction)\n- **Caching alone saved 60%** on redundant processing\n- Monthly: **$36K vs projected $60K+**\n- Project greenlit for production launch',
    'bulletPoints', jsonb_build_array(
      '40% cost reduction: $2,000/day to $1,200/day',
      'Response caching saved 60% on redundant processing',
      'Model selection (GPT-4 vs Mini) saved additional 20%',
      'Monthly costs: $36K vs projected $60K+',
      'Project approved for production'
    ),
    'keyTalkingPoints', jsonb_build_array(
      'Cost optimization is a feature, not an afterthought',
      'Different LLM tasks have different quality requirements - right-size the model',
      'Caching is the biggest lever for cost reduction'
    ),
    'deliveryTips', jsonb_build_array(
      'Lead with the business impact: $60K/month projected, unsustainable',
      'Break down the savings by strategy: 60% caching, 20% model selection',
      'End with project approval - cost was blocking production launch'
    ),
    'followUpQA', jsonb_build_array(
      jsonb_build_object('question', 'How did you decide which tasks use GPT-4 vs GPT-4o Mini?', 'likelihood', 'high', 'suggestedAnswer', 'Evaluated task complexity and tested quality. Entity extraction needs nuanced reasoning (GPT-4), while summarization works fine with GPT-4o Mini. Validated with side-by-side quality tests before switching.', 'keyPoints', jsonb_build_array('Task complexity', 'Quality testing', 'Side-by-side validation'))
    ),
    'sources', jsonb_build_object('storyIds', jsonb_build_array(), 'profileSections', jsonb_build_array('activeProjects'), 'synthesized', false)
  )
  WHERE user_id = v_user_id AND profile_id = v_profile_id
  AND title = 'Optimized LLM Costs by 40% ($2,000/day to $1,200/day)';
  GET DIAGNOSTICS v_row_count = ROW_COUNT;
  v_stories_updated := v_stories_updated + v_row_count;

  -- Story 8: Achieved 99.8% API Uptime
  UPDATE stories SET generated_answer_metadata = jsonb_build_object(
    'detectedQuestionType', 'behavioral-technical',
    'answerFormat', 'STAR',
    'sections', jsonb_build_array(
      jsonb_build_object('label', 'Situation', 'content', 'Single-region deployment vulnerable to Azure outages. Mission-critical intelligence work required near-100% availability.'),
      jsonb_build_object('label', 'Task', 'content', 'Achieve production-grade reliability for threat intelligence analysis.'),
      jsonb_build_object('label', 'Action', 'content', 'Deployed across multiple Azure regions, health check endpoints, automatic failover, Application Insights monitoring, graceful degradation.'),
      jsonb_build_object('label', 'Result', 'content', '99.8% uptime. Automatic failover handled issues without analyst impact. No single point of failure.')
    ),
    'narrative', E'I achieved **99.8% API uptime** through multi-region deployment and automatic failover.\n\n**The Problem**: Intel Copilot was mission-critical for MTAC analysts. A single-region deployment was vulnerable to Azure outages - and even brief downtime could impact time-sensitive intelligence work.\n\n**My Reliability Architecture**:\n\n1. **Multi-Region Deployment**\n   - Azure OpenAI: East US, West US, Central US\n   - API: Active-active across regions\n   - Data: Cosmos DB global distribution\n\n2. **Health Monitoring**\n   - Endpoint health checks every 30 seconds\n   - Verify all dependencies: OpenAI, Cosmos, Cognitive Search\n   - Application Insights dashboards\n\n3. **Automatic Failover**\n   - Mark unhealthy after 5 consecutive failures\n   - Redistribute load to healthy endpoints\n   - Recovery scheduler retests every 5 minutes\n\n4. **Graceful Degradation**\n   - If all endpoints down, return cached responses\n   - "Degraded mode" banner in UI\n\n**The Results**:\n- **99.8% uptime** achieved\n- Multiple Azure incidents handled transparently\n- No single point of failure\n- Analysts trust system for time-critical work',
    'bulletPoints', jsonb_build_array(
      '99.8% API uptime achieved',
      'Multi-region deployment eliminates single point of failure',
      'Automatic failover - analysts never notice outages',
      'Graceful degradation with cached responses as backup'
    ),
    'keyTalkingPoints', jsonb_build_array(
      'Mission-critical systems need automatic failover',
      'Health checks every 30 seconds catch issues quickly',
      'Graceful degradation is better than hard failure'
    ),
    'deliveryTips', jsonb_build_array(
      'Emphasize mission-critical nature',
      'Explain the failover logic: 5 failures → unhealthy → redistribute',
      'Mention that analysts never noticed Azure incidents'
    ),
    'followUpQA', jsonb_build_array(
      jsonb_build_object('question', 'How do you test failover?', 'likelihood', 'high', 'suggestedAnswer', 'Chaos engineering: scheduled tests that disable endpoints, verify redistribution, check recovery. Also game day exercises where we manually trigger failures and time our response.', 'keyPoints', jsonb_build_array('Chaos testing', 'Game days', 'Recovery timing'))
    ),
    'sources', jsonb_build_object('storyIds', jsonb_build_array(), 'profileSections', jsonb_build_array('activeProjects'), 'synthesized', false)
  )
  WHERE user_id = v_user_id AND profile_id = v_profile_id
  AND title = 'Achieved 99.8% API Uptime with Multi-Region Deployment';
  GET DIAGNOSTICS v_row_count = ROW_COUNT;
  v_stories_updated := v_stories_updated + v_row_count;

  -- Story 9: MSR Collaboration
  UPDATE stories SET generated_answer_metadata = jsonb_build_object(
    'detectedQuestionType', 'experience',
    'answerFormat', 'STAR',
    'sections', jsonb_build_array(
      jsonb_build_object('label', 'Situation', 'content', 'MSR''s IRE engine was a research prototype lacking error handling, monitoring, and scalability.'),
      jsonb_build_object('label', 'Task', 'content', 'Collaborate with MSR to adapt prototype for production while providing feedback.'),
      jsonb_build_object('label', 'Action', 'content', 'Established bi-weekly syncs, identified gaps, built production wrapper, documented issues, created feedback loop.'),
      jsonb_build_object('label', 'Result', 'content', 'Successfully shipped to production. Several improvements incorporated into MSR. Established collaboration pattern.')
    ),
    'narrative', E'I navigated a challenging collaboration with **Microsoft Research** to ship their GraphRAG prototype to production.\n\n**The Challenge**: MSR had built an impressive GraphRAG engine (IRE) for research purposes. But research code and production code have very different requirements:\n- No error handling (fails fast for experiments)\n- No monitoring hooks\n- No retry logic for transient failures\n- Not designed for scale\n\n**My Collaboration Approach**:\n\n1. **Structured Communication**\n   - Bi-weekly syncs with MSR team\n   - Shared Kanban board for tracking issues\n   - Clear ownership: MSR = core algorithm, Us = production wrapper\n\n2. **Gap Analysis**\n   - Documented all gaps between research and production needs\n   - Prioritized by impact\n   - Proposed solutions for each\n\n3. **Production Wrapper**\n   - Error handling with circuit breakers\n   - Retry logic with exponential backoff\n   - Monitoring and logging integration\n   - Didn''t modify core engine - wrapped it\n\n4. **Feedback Loop**\n   - Production metrics informed MSR priorities\n   - Several suggestions incorporated into next release\n\n**The Outcomes**:\n- **99.8% uptime** for adapted prototype\n- **Reusable collaboration pattern** for MSR partnerships\n- Intel Copilot became **GraphRAG showcase**',
    'bulletPoints', jsonb_build_array(
      'Successfully shipped MSR research prototype to production',
      'Established structured collaboration: bi-weekly syncs, shared board',
      'Built production wrapper without modifying core engine',
      'Several improvements contributed back to MSR',
      '99.8% uptime for adapted prototype'
    ),
    'keyTalkingPoints', jsonb_build_array(
      'Research code and production code have different requirements',
      'Don''t modify the research code - wrap it with production features',
      'Two-way feedback: production insights improve research'
    ),
    'deliveryTips', jsonb_build_array(
      'Frame as bridging research and production worlds',
      'Emphasize the structured collaboration approach',
      'Highlight the mutual benefit: research gets real-world feedback'
    ),
    'followUpQA', jsonb_build_array(
      jsonb_build_object('question', 'What were the biggest gaps between research and production?', 'likelihood', 'high', 'suggestedAnswer', 'Three main gaps: (1) Error handling - research fails fast, production needs graceful degradation; (2) Monitoring - research uses notebooks, production needs observability; (3) Edge cases - research uses clean data, production sees everything.', 'keyPoints', jsonb_build_array('Error handling', 'Monitoring', 'Edge cases'))
    ),
    'sources', jsonb_build_object('storyIds', jsonb_build_array(), 'profileSections', jsonb_build_array('activeProjects'), 'synthesized', false)
  )
  WHERE user_id = v_user_id AND profile_id = v_profile_id
  AND title = 'Collaborated with Microsoft Research on Production Adaptation';
  GET DIAGNOSTICS v_row_count = ROW_COUNT;
  v_stories_updated := v_stories_updated + v_row_count;

  -- Story 10: Entity Merge UI
  UPDATE stories SET generated_answer_metadata = jsonb_build_object(
    'detectedQuestionType', 'experience',
    'answerFormat', 'STAR',
    'sections', jsonb_build_array(
      jsonb_build_object('label', 'Situation', 'content', 'Entity extraction produced duplicates - "APT28", "Fancy Bear", "Sofacy" were separate entities fragmenting relationship data.'),
      jsonb_build_object('label', 'Task', 'content', 'Enable analysts to improve data quality by merging duplicate entities.'),
      jsonb_build_object('label', 'Action', 'content', 'Designed entity merge UI for selecting primary entity and duplicates, backend logic combining relationships, audit storage, automatic mapping for future queries.'),
      jsonb_build_object('label', 'Result', 'content', 'Analysts curate data quality without engineering. Comprehensive entity views. Continuous knowledge graph improvement.')
    ),
    'narrative', E'I built an **entity merge UI** that lets analysts curate knowledge graph quality themselves.\n\n**The Problem**: Our entity extraction worked well, but it couldn''t recognize that "APT28", "Fancy Bear", and "Sofacy" are all the same threat actor. This fragmented our relationship data - instead of one entity with 26 connections, we had three entities with partial data each.\n\n**My Solution - Human-in-the-Loop Curation**:\n\n1. **Merge Interface**\n   - Search and select entities to merge\n   - Choose primary entity (canonical name)\n   - Add merge reason for audit trail\n\n2. **Backend Logic**\n   - Combine all relationships onto primary entity\n   - Update all document references\n   - Preserve merge history in Cosmos DB\n\n3. **Automatic Mapping**\n   - Future queries for merged names redirect to primary\n   - "Fancy Bear" automatically resolves to "APT28"\n\n**The Results**:\n- Analysts curate data quality **without engineering intervention**\n- Entity with 15+8+3 relationships now shows all 26\n- Comprehensive threat actor views\n- **Continuous improvement** of knowledge graph',
    'bulletPoints', jsonb_build_array(
      'Human-in-the-loop data quality curation',
      'Entity merge combines fragmented relationships',
      'Automatic alias resolution for future queries',
      'Full audit trail for compliance'
    ),
    'keyTalkingPoints', jsonb_build_array(
      'AI isn''t perfect - need human-in-the-loop corrections',
      'Empowering users to improve data quality is powerful',
      'Merge decisions persist and improve future queries'
    ),
    'deliveryTips', jsonb_build_array(
      'Use concrete example: APT28 = Fancy Bear = Sofacy',
      'Show the math: 15+8+3 = 26 relationships consolidated',
      'Emphasize analyst empowerment'
    ),
    'followUpQA', jsonb_build_array(
      jsonb_build_object('question', 'How do you prevent incorrect merges?', 'likelihood', 'medium', 'suggestedAnswer', 'Three safeguards: (1) Require merge reason for audit; (2) Show preview of combined relationships before confirming; (3) Admin-only undo capability. Also analyst training on when to merge.', 'keyPoints', jsonb_build_array('Merge reason', 'Preview', 'Undo capability'))
    ),
    'sources', jsonb_build_object('storyIds', jsonb_build_array(), 'profileSections', jsonb_build_array('activeProjects'), 'synthesized', false)
  )
  WHERE user_id = v_user_id AND profile_id = v_profile_id
  AND title = 'Built Entity Merge UI for Analyst-Driven Data Curation';
  GET DIAGNOSTICS v_row_count = ROW_COUNT;
  v_stories_updated := v_stories_updated + v_row_count;

  -- Story 11: Compliance Certification
  UPDATE stories SET generated_answer_metadata = jsonb_build_object(
    'detectedQuestionType', 'experience',
    'answerFormat', 'STAR',
    'sections', jsonb_build_array(
      jsonb_build_object('label', 'Situation', 'content', 'Intel Copilot handled sensitive threat intelligence requiring full security certification before launch.'),
      jsonb_build_object('label', 'Task', 'content', 'Lead the system through SFI, SDL, and Responsible AI certification.'),
      jsonb_build_object('label', 'Action', 'content', 'Conducted threat modeling, implemented network isolation, VPN requirement, encryption, audit logging, static analysis, penetration testing, bias testing, hallucination monitoring.'),
      jsonb_build_object('label', 'Result', 'content', 'Achieved full certification. Launched to production with compliance. Established patterns for other AI systems.')
    ),
    'narrative', E'I led **Intel Copilot through full security and AI compliance certification** - SFI, SDL, and Responsible AI.\n\n**The Context**: Intel Copilot handled sensitive threat intelligence data. Before production launch, we needed full compliance with Microsoft''s security and AI standards. This wasn''t optional - no certification, no launch.\n\n**Security Requirements (SFI/SDL)**:\n\n1. **Network Isolation**\n   - Azure Managed Environment (AME)\n   - VPN required for access\n   - No public endpoints\n\n2. **Data Protection**\n   - Encryption at rest and in transit\n   - No data leaves Azure boundary\n   - Audit logging for all access\n\n3. **Code Security**\n   - Static analysis (CodeQL)\n   - Dependency vulnerability scanning\n   - Penetration testing by red team\n\n**Responsible AI Requirements**:\n\n1. **Bias Testing**\n   - Entity extraction accuracy across threat types\n   - No systematic bias in summarization\n\n2. **Hallucination Prevention**\n   - Citation tracking for verification\n   - "I don''t know" for gaps\n   - Human-in-the-loop for high-stakes decisions\n\n3. **Transparency**\n   - Clear limitations documentation\n   - Analyst training on appropriate use\n\n**The Results**:\n- **Full certification achieved**\n- Launched to production\n- Established patterns for other AI systems in the division',
    'bulletPoints', jsonb_build_array(
      'Full SFI, SDL, and Responsible AI certification',
      'Network isolation with VPN access only',
      'Encryption at rest and in transit',
      'Bias testing and hallucination prevention',
      'Established compliance patterns for other AI systems'
    ),
    'keyTalkingPoints', jsonb_build_array(
      'Security and AI compliance are enablers, not blockers',
      'Built compliance into design from day one',
      'Responsible AI means transparency about limitations'
    ),
    'deliveryTips', jsonb_build_array(
      'Frame compliance as enabling production launch',
      'Be specific about what each certification requires',
      'Highlight the Responsible AI practices'
    ),
    'followUpQA', jsonb_build_array(
      jsonb_build_object('question', 'What was the hardest compliance requirement?', 'likelihood', 'medium', 'suggestedAnswer', 'Hallucination prevention for Responsible AI. We had to prove our citation system actually works - involved extensive testing, regular audits, and building the "I don''t know" fallback behavior.', 'keyPoints', jsonb_build_array('Hallucination prevention', 'Citation verification', 'Fallback behavior'))
    ),
    'sources', jsonb_build_object('storyIds', jsonb_build_array(), 'profileSections', jsonb_build_array('activeProjects'), 'synthesized', false)
  )
  WHERE user_id = v_user_id AND profile_id = v_profile_id
  AND title = 'Led Full Compliance Certification (SFI, SDL, Responsible AI)';
  GET DIAGNOSTICS v_row_count = ROW_COUNT;
  v_stories_updated := v_stories_updated + v_row_count;

  -- Story 12: User Satisfaction
  UPDATE stories SET generated_answer_metadata = jsonb_build_object(
    'detectedQuestionType', 'experience',
    'answerFormat', 'STAR',
    'sections', jsonb_build_array(
      jsonb_build_object('label', 'Situation', 'content', 'AI systems often fail user adoption due to trust issues. Needed to ensure MTAC analysts would actually use the system.'),
      jsonb_build_object('label', 'Task', 'content', 'Achieve high user satisfaction and adoption among threat intelligence analysts.'),
      jsonb_build_object('label', 'Action', 'content', 'Ran pilot with 5 analysts, collected detailed feedback, implemented citations, entity merge, reports, transparent limitations, iterative improvements.'),
      jsonb_build_object('label', 'Result', 'content', '87% satisfaction. Daily adoption by all teams. 50% time savings on weekly roundups.')
    ),
    'narrative', E'I achieved **87% user satisfaction** through iterative development and trust-building.\n\n**The Challenge**: AI tools often get enthusiastic demos but low actual adoption. Analysts are skeptical - and rightfully so. They need to trust the tool before using it for important work.\n\n**My User-Centric Approach**:\n\n1. **Pilot Program**\n   - Started with 5 trusted analysts\n   - Weekly feedback sessions\n   - Addressed issues before wider rollout\n\n2. **Trust-Building Features**\n   - **Citations** - every claim verifiable\n   - **Entity merge** - analysts control data quality\n   - **Transparent limitations** - "I don''t know" instead of hallucinating\n\n3. **Iterative Improvement**\n   - Downloadable intelligence reports (analyst request)\n   - Improved prompts based on real query feedback\n   - Fixed edge cases as analysts found them\n\n4. **Training & Support**\n   - Best practices documentation\n   - What the tool is (and isn''t) good for\n   - Office hours for questions\n\n**The Results**:\n- **87% user satisfaction** in post-launch survey\n- **Daily adoption** across all MTAC teams\n- **50% time savings** on weekly roundups\n- Model for AI system rollouts in the organization',
    'bulletPoints', jsonb_build_array(
      '87% user satisfaction rating',
      'Daily adoption across all MTAC teams',
      '50% time savings on weekly roundups',
      'Pilot program before wide rollout',
      'Iterative improvement based on real feedback'
    ),
    'keyTalkingPoints', jsonb_build_array(
      'Start small with pilot users who give honest feedback',
      'Trust is earned through transparency and user control',
      'Iterative improvement based on real usage is essential'
    ),
    'deliveryTips', jsonb_build_array(
      'Lead with the challenge: AI tools often have low adoption',
      'Walk through the trust-building features',
      'End with the satisfaction number and daily usage'
    ),
    'followUpQA', jsonb_build_array(
      jsonb_build_object('question', 'What was the biggest user complaint you addressed?', 'likelihood', 'high', 'suggestedAnswer', 'Duplicate entities fragmenting the knowledge graph. Analysts saw "APT28" and "Fancy Bear" as separate. Built the entity merge UI so they could fix this themselves. Became one of the most-used features.', 'keyPoints', jsonb_build_array('Entity duplicates', 'User-driven fix', 'High feature usage'))
    ),
    'sources', jsonb_build_object('storyIds', jsonb_build_array(), 'profileSections', jsonb_build_array('activeProjects'), 'synthesized', false)
  )
  WHERE user_id = v_user_id AND profile_id = v_profile_id
  AND title = 'Achieved 87% User Satisfaction with Iterative Improvement';
  GET DIAGNOSTICS v_row_count = ROW_COUNT;
  v_stories_updated := v_stories_updated + v_row_count;

  RAISE NOTICE 'Updated % stories with generated_answer_metadata', v_stories_updated;

  -- ============================================
  -- 3. FIX: Add targetCompany to MTAC technical answers
  -- ============================================

  -- Update all MTAC-related answers to include targetCompany in metadata
  UPDATE technical_answers
  SET metadata = metadata || jsonb_build_object('targetCompany', 'Microsoft (MTAC)')
  WHERE user_id = v_user_id
  AND profile_id = v_profile_id
  AND (
    metadata->'tags' @> '["microsoft"]'::jsonb
    OR metadata->'tags' @> '["graphrag"]'::jsonb
    OR question ILIKE '%MTAC%'
    OR question ILIKE '%GraphRAG%'
    OR question ILIKE '%Microsoft%'
  );
  GET DIAGNOSTICS v_answers_updated = ROW_COUNT;

  RAISE NOTICE 'Updated % technical answers with targetCompany', v_answers_updated;

  RAISE NOTICE 'MTAC import fixes complete!';
END $$;
