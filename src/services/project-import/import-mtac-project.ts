/**
 * MTAC Intelligence Copilot Project Import Service
 *
 * This service imports the MTAC project documentation into the user's profile,
 * generates STAR stories, and creates technical interview answers.
 *
 * Usage:
 * 1. Import this module in browser console or a component
 * 2. Call importMTACProject() with the profile ID
 * 3. Or call importMTACProjectToFullStack() to auto-find the Full Stack Focus profile
 */

import { useProfileStore } from '@/src/stores/profile';
import { useStoriesStore } from '@/src/stores/stories';
import { useTechnicalAnswersStore } from '@/src/stores/technical-answers';
import { generateId } from '@/src/lib/utils';
import type {
  Project,
  ProjectDocumentation,
  TechnicalDecision,
  ProjectChallenge,
  ProjectMetric,
  Experience,
  TechnicalAnswer,
  AnswerSection,
  FollowUpQA,
} from '@/src/types';

// ============================================
// PROJECT DATA
// ============================================

const MTAC_PROJECT: Project = {
  id: generateId(),
  name: 'MTAC Intelligence Copilot',
  description: "Microsoft's first production GraphRAG-based AI system for threat intelligence analysis at MTAC. Enables analysts to query across entire document corpus, extract entity relationships, and generate comprehensive summaries with citations.",
  techStack: [
    'C#', '.NET Core', 'Python', 'FastAPI', 'React 18', 'FluentUI', 'D3.js',
    'GPT-4', 'GPT-4o Mini', 'Azure OpenAI', 'Cosmos DB', 'Azure Cognitive Search',
    'Azure Functions', 'Databricks', 'Azure Data Factory', 'Kubernetes'
  ],
  status: 'launched',
  traction: 'Production system with 50% analyst productivity improvement, 99.8% uptime',
  hasDocumentation: true,
};

const MTAC_DOCUMENTATION: ProjectDocumentation = {
  screenshots: [],
  architectureDiagrams: [],
  documentFiles: [],

  technicalDecisions: [
    {
      id: generateId(),
      decision: 'GraphRAG over Traditional RAG',
      context: 'Analysts needed to understand patterns and relationships across thousands of documents, not just retrieve individual documents',
      alternatives: ['Traditional vector search RAG', 'Keyword-based search', 'Manual document analysis'],
      rationale: 'GraphRAG builds a knowledge graph of entities and relationships, enabling queries like "What are all known associates of threat actor X?" that span multiple documents',
      outcome: 'Enabled comprehensive threat actor network analysis and theme-based retrieval across entire corpus',
      tags: ['architecture', 'ai', 'innovation'],
    },
    {
      id: generateId(),
      decision: 'Hybrid Search (Vector + Keyword + Graph)',
      context: 'Single search method was insufficient for complex intelligence queries',
      alternatives: ['Vector-only search', 'Keyword-only search', 'Graph-only traversal'],
      rationale: 'Combined the semantic understanding of vectors, precision of keywords, and relationship awareness of graph traversal',
      outcome: 'Better retrieval quality, reduced noise in LLM context, 94% citation accuracy',
      tags: ['search', 'performance', 'quality'],
    },
    {
      id: generateId(),
      decision: 'GPT-4o Mini for Theme Retrieval',
      context: 'Need to balance cost vs quality for different AI tasks',
      alternatives: ['GPT-4 for all tasks', 'Open source models', 'Fine-tuned smaller models'],
      rationale: 'GPT-4o Mini provides sufficient quality for summarization while being 80% cheaper than GPT-4',
      outcome: '80% cost reduction for theme retrieval workload while maintaining quality',
      tags: ['cost-optimization', 'ai', 'efficiency'],
    },
    {
      id: generateId(),
      decision: 'Custom Load Balancer for GPT-4 Endpoints',
      context: 'Single Azure OpenAI endpoint rate limited at 240 req/min, causing throttling during peak hours',
      alternatives: ['Azure built-in load balancing', 'Third-party API gateway', 'Queue-based processing'],
      rationale: 'Built-in solutions didn\'t handle LLM-specific rate limits well; needed custom logic for endpoint health, rate tracking, and failover',
      outcome: '960 req/min combined capacity (4x increase), 50% faster processing, <1% throttling',
      tags: ['scalability', 'performance', 'reliability'],
    },
    {
      id: generateId(),
      decision: 'LLM Response Caching with Redis',
      context: 'Daily document processing was re-extracting entities from unchanged documents',
      alternatives: ['No caching', 'File-based caching', 'Database caching'],
      rationale: 'Redis provides fast key-value lookups with TTL support; hash prompts to detect cache hits',
      outcome: '60% reduction in API costs, only new documents trigger LLM calls',
      tags: ['cost-optimization', 'performance', 'caching'],
    },
  ],

  challenges: [
    {
      id: generateId(),
      challenge: 'Adapting MSR Research Prototype for Production',
      approach: 'Wrapped IRE engine with production-grade error handling, retry logic, monitoring hooks, and edge case handling',
      technicalDetails: 'Implemented circuit breakers for LLM calls, exponential backoff for retries, structured logging with Application Insights, and graceful degradation for edge cases like empty documents or malformed PDFs',
      lessonsLearned: 'Research prototypes are great starting points but production requires 10x more operational code. Established patterns for future MSR-to-production collaborations.',
    },
    {
      id: generateId(),
      challenge: 'Entity Extraction Accuracy at 70%',
      approach: 'Developed domain-specific prompts with threat intelligence entity types and few-shot examples from real MTAC reports',
      technicalDetails: 'Custom entity types: threat_actor, malware, vulnerability, target_organization, infrastructure, technique. Added confidence scoring and explicit instructions to ignore generic mentions.',
      lessonsLearned: 'Generic prompts don\'t work for specialized domains. Few-shot examples from real data dramatically improve accuracy.',
    },
    {
      id: generateId(),
      challenge: 'LLM Rate Limits During Peak Hours',
      approach: 'Designed multi-region deployment with custom load balancer distributing requests across 4 Azure OpenAI endpoints',
      technicalDetails: 'Load balancer tracks per-endpoint request counts, rate limit status, and health. Implements least-loaded-first routing with automatic failover when endpoints become unhealthy.',
      lessonsLearned: 'For LLM-heavy workloads, plan for rate limits from day one. Multi-region deployment provides both capacity and reliability.',
    },
    {
      id: generateId(),
      challenge: 'Unsustainable API Costs ($2,000/day)',
      approach: 'Implemented multi-pronged cost optimization: caching, model selection, and rate limiting',
      technicalDetails: 'Redis caching for LLM responses (60% savings), GPT-4o Mini for non-critical tasks (20% savings), monitoring dashboards to catch inefficient queries.',
      lessonsLearned: 'Cost optimization is critical at scale. Model selection strategy based on task complexity pays dividends.',
    },
    {
      id: generateId(),
      challenge: 'Analyst Trust in AI-Generated Intelligence',
      approach: 'Built comprehensive citation tracking, entity merge UI, and transparent limitations',
      technicalDetails: 'Every generated statement links to source documents with [Source N] format. Analysts can merge duplicate entities. System says "I don\'t know" when uncertain.',
      lessonsLearned: 'Trust is earned through transparency. Human-in-the-loop features are essential for AI systems in critical domains.',
    },
  ],

  metrics: [
    { id: generateId(), metric: 'Analyst Productivity', before: 'Hours on weekly roundups', after: '50% reduction', improvement: '50%', context: 'Time spent on report summaries and weekly roundups' },
    { id: generateId(), metric: 'Theme-Based Retrieval', before: '20+ seconds', after: '<10 seconds', improvement: '50% faster', context: 'Complex intelligence queries across corpus' },
    { id: generateId(), metric: 'API Uptime', after: '99.8%', context: 'Multi-region deployment with automatic failover' },
    { id: generateId(), metric: 'Citation Accuracy', after: '94%', context: 'AI-generated statements traceable to sources' },
    { id: generateId(), metric: 'User Satisfaction', after: '87%', context: 'MTAC analyst feedback rating' },
    { id: generateId(), metric: 'API Costs', before: '$2,000/day', after: '$1,200/day', improvement: '40% reduction', context: 'Through caching and model optimization' },
    { id: generateId(), metric: 'Entity Extraction Accuracy', before: '70%', after: '92%', improvement: '22% improvement', context: 'Domain-specific prompt engineering' },
    { id: generateId(), metric: 'Request Capacity', before: '240 req/min', after: '960 req/min', improvement: '4x increase', context: 'Multi-endpoint load balancing' },
    { id: generateId(), metric: 'Throttling Errors', before: '15%', after: '<1%', improvement: '93% reduction', context: 'Load balancing eliminated bottlenecks' },
  ],

  systemContext: 'Threat intelligence analysis platform for Microsoft Threat Analysis Center (MTAC). Processes thousands of documents daily from internal teams, external feeds, and geopolitical reports.',
  integrations: ['SharePoint', 'Azure OpenAI (GPT-4, GPT-4o Mini)', 'Cosmos DB', 'Azure Cognitive Search', 'Azure AD', 'Azure Data Factory', 'Application Insights'],
  duration: 'August 2023 - March 2025',
  myRole: 'Software Design Engineer 3, CST-E Division. Led technical design and implementation of GraphRAG architecture, load balancing system, and production deployment.',

  talkingPoints: [
    "Built Microsoft's first production GraphRAG system",
    'Designed load balancing across 4 GPT-4 endpoints (960 req/min)',
    'Achieved 50% reduction in analyst time for report summaries',
    'Optimized costs from $2,000/day to $1,200/day (40% reduction)',
    '99.8% API uptime with multi-region deployment',
    'Collaborated with Microsoft Research to adapt IRE engine for production',
  ],

  interviewQuestions: [
    'Explain the GraphRAG architecture and why it was needed over traditional RAG',
    'How did you handle entity extraction accuracy at scale?',
    'Describe your load balancing strategy for LLM endpoints',
    'How did you optimize costs for LLM API calls?',
    'How did you ensure high availability for a critical AI service?',
    'What was your approach to prompt engineering for domain-specific tasks?',
    'How did you collaborate with Microsoft Research?',
    'How did you build trust with skeptical users?',
  ],
};

// ============================================
// STAR STORIES
// ============================================

function createStories(profileId: string): Experience[] {
  const now = new Date().toISOString();

  return [
    // Story 1: First Production GraphRAG
    {
      id: generateId(),
      title: "Built Microsoft's First Production GraphRAG System",
      rawInput: 'Auto-generated from MTAC Intelligence Copilot documentation',
      inputMethod: 'import' as const,
      star: {
        situation: "Microsoft Threat Analysis Center (MTAC) analysts were spending hours manually reading through thousands of threat intelligence documents daily. Traditional SharePoint search returned individual documents, missing critical patterns and connections across the entire corpus. Analysts needed a way to synthesize insights from the complete document collection to identify threat actor networks and campaign patterns.",
        task: "As the lead engineer, I was tasked with designing and building Microsoft's first production GraphRAG-based AI system that would enable analysts to query across the entire threat intelligence corpus, automatically extract entities and relationships, and generate comprehensive summaries with full citation tracking for compliance.",
        action: "I designed the end-to-end architecture including: (1) Azure Functions for document ingestion from SharePoint, (2) Databricks pipeline for document conversion and semantic chunking, (3) Integration with Microsoft Research's IRE engine for entity extraction using GPT-4 with custom threat-intelligence prompts, (4) Cosmos DB for knowledge graph storage with entities and relationships, (5) Azure Cognitive Search for hybrid vector+keyword search, (6) C# .NET Core API layer with custom load balancing across 4 GPT-4 endpoints, and (7) React frontend with D3.js graph visualization. I personally wrote the load balancing logic, designed the entity extraction prompts that achieved 92% accuracy, and collaborated with MSR to adapt their research prototype for production workloads.",
        result: "The system launched successfully in production and is actively used by MTAC analysts daily. Key outcomes: 50% reduction in time spent on report summaries and weekly roundups, 50% reduction in theme-based retrieval processing time, 99.8% API uptime with multi-region deployment, 94% citation accuracy, and 87% user satisfaction. This became Microsoft's first production GraphRAG system, and the architecture patterns were adopted by other teams across the CST-E division.",
      },
      metrics: {
        primary: '50% reduction in analyst productivity time for report summaries',
        secondary: [
          '50% faster theme-based retrieval',
          '99.8% API uptime',
          '94% citation accuracy',
          '87% user satisfaction',
          "First production GraphRAG at Microsoft",
        ],
      },
      tags: ['system-design', 'graphrag', 'llm', 'microsoft', 'production', 'leadership', 'ai', 'azure'],
      variations: {
        leadership: "Focus on leading the technical design, coordinating with Microsoft Research, and driving production launch with full compliance certification.",
        technical: "Deep-dive into GraphRAG architecture: entity extraction prompts, relationship mapping, community detection, and hybrid search implementation.",
        challenge: "Emphasize adapting MSR's research prototype for production: adding error handling, monitoring, caching, and handling edge cases.",
      },
      followUpQuestions: [
        'How did you handle entity extraction accuracy at scale?',
        'What was your approach to load balancing?',
        'How did you collaborate with Microsoft Research?',
        'What were the biggest challenges in going to production?',
        'How did you measure success?',
      ],
      coachingNotes: "This is your flagship project story. Emphasize innovation (first production GraphRAG), scale (thousands of documents daily), and measurable impact (50% productivity improvement). Be ready to go deep on any technical component - entity extraction, load balancing, hybrid search, or frontend visualization.",
      usedInInterviews: [],
      timesUsed: 0,
      createdAt: now,
      updatedAt: now,
      profileId,
    },

    // Story 2: Load Balancing
    {
      id: generateId(),
      title: 'Designed GPT-4 Load Balancing for 960 req/min Capacity',
      rawInput: 'Auto-generated from MTAC Intelligence Copilot documentation',
      inputMethod: 'import' as const,
      star: {
        situation: "The Intel Copilot system was hitting rate limits on our single GPT-4 endpoint, which was capped at 240 requests per minute. During peak hours, analysts were waiting 30-60 seconds for responses, and we were seeing approximately 15% of requests fail due to throttling errors. This was impacting analyst productivity and trust in the system.",
        task: "Design and implement a load balancing solution that would eliminate throttling, improve response times, and maintain high availability across multiple Azure OpenAI deployments.",
        action: "I designed a custom load balancer in C# that distributed requests across 4 Azure OpenAI deployments (2 in East US, 1 in West US, 1 in Central US). The implementation included: (1) Per-endpoint request counting with automatic rate limit reset tracking, (2) Health check integration that marked endpoints unhealthy after 5 consecutive failures, (3) Automatic failover with endpoint recovery scheduling, (4) Least-loaded-first routing algorithm with geographic proximity optimization for latency, and (5) Distributed caching via Redis to share endpoint state across API instances. I also built monitoring dashboards in Application Insights to track per-endpoint utilization and alert on degradation.",
        result: "Combined capacity increased to 960 requests per minute (4x improvement). Response time dropped to under 10 seconds for complex queries. Throttling errors decreased from 15% to less than 1%. The load balancing directly contributed to the 50% reduction in theme-based retrieval processing time. The system automatically handled endpoint failures without analyst-visible impact.",
      },
      metrics: {
        primary: '50% reduction in theme-based retrieval processing time',
        secondary: [
          '960 req/min capacity (4x increase)',
          '<1% throttling errors (from 15%)',
          '<10 second response time',
          'Zero-impact automatic failover',
        ],
      },
      tags: ['system-design', 'performance', 'azure', 'scalability', 'reliability', 'load-balancing'],
      variations: {
        technical: "Deep-dive into the load balancing algorithm: rate limit tracking, health checks, failover logic, and distributed state management.",
        challenge: "Emphasize solving the 15% throttling problem and the iterative process of tuning the algorithm.",
      },
      followUpQuestions: [
        'How did you decide on the load balancing algorithm?',
        'How do you handle endpoint failures?',
        'What monitoring did you put in place?',
        'How did you test the failover scenarios?',
      ],
      coachingNotes: "Great story for performance/scalability questions. Quantify the before/after clearly. Be ready to whiteboard the load balancing architecture.",
      usedInInterviews: [],
      timesUsed: 0,
      createdAt: now,
      updatedAt: now,
      profileId,
    },

    // Story 3: Entity Extraction Accuracy
    {
      id: generateId(),
      title: 'Improved Entity Extraction Accuracy from 70% to 92%',
      rawInput: 'Auto-generated from MTAC Intelligence Copilot documentation',
      inputMethod: 'import' as const,
      star: {
        situation: "Our initial entity extraction implementation used generic prompts from LangChain examples and achieved only about 70% accuracy. The system was missing critical threat intelligence entities like specific APT groups and malware variants, while extracting irrelevant generic entities. This was undermining the knowledge graph quality and analyst trust.",
        task: "Improve entity extraction accuracy to production-grade quality (>90%) for the threat intelligence domain, enabling reliable threat actor network visualization and relationship analysis.",
        action: "I developed a custom prompt engineering approach: (1) Defined threat-intelligence-specific entity types: threat_actor, malware, vulnerability, target_organization, infrastructure, and technique, (2) Created few-shot examples from 20 real MTAC reports covering diverse scenarios, (3) Added explicit instructions to ignore generic mentions and focus on specific named entities, (4) Implemented confidence scoring (High/Medium/Low) to filter uncertain extractions, (5) Built relationship extraction prompts with evidence requirements - each relationship must cite supporting text. I also created an evaluation dataset of 500 manually labeled entities and ran systematic A/B tests of prompt variations.",
        result: "Entity extraction accuracy improved from 70% to 92%. Analysts could now trust the extracted threat actor networks for intelligence analysis. The improved accuracy became the foundation for knowledge graph quality, enabling features like theme-based retrieval and comprehensive threat actor views. The prompt engineering approach was documented and reused by other teams.",
      },
      metrics: {
        primary: '92% entity extraction accuracy (22% improvement from 70%)',
        secondary: [
          'Enabled reliable threat actor network visualization',
          'Foundation for GraphRAG knowledge graph quality',
          'Approach reused by other teams',
        ],
      },
      tags: ['prompt-engineering', 'ai', 'nlp', 'quality', 'llm', 'machine-learning'],
      variations: {
        technical: "Focus on prompt engineering methodology: few-shot examples, entity type definitions, confidence scoring, and systematic evaluation.",
      },
      followUpQuestions: [
        'How did you evaluate extraction accuracy?',
        'What were the most common failure modes?',
        'How did few-shot examples help?',
        'How do you handle new entity types?',
      ],
      coachingNotes: "Good story for AI/ML questions. Emphasize the systematic approach: baseline measurement, hypothesis testing, and quantified improvement.",
      usedInInterviews: [],
      timesUsed: 0,
      createdAt: now,
      updatedAt: now,
      profileId,
    },

    // Story 4: Hybrid Search
    {
      id: generateId(),
      title: 'Created Hybrid Search System (Vector + Keyword + Graph)',
      rawInput: 'Auto-generated from MTAC Intelligence Copilot documentation',
      inputMethod: 'import' as const,
      star: {
        situation: "Our initial vector-only search was missing results that matched keywords but not semantic embeddings. For example, searching for 'APT28' sometimes missed documents that used the alias 'Fancy Bear' without explicitly connecting them. Additionally, the knowledge graph relationships weren't being leveraged during retrieval, missing opportunities to find related entities.",
        task: "Design a multi-pronged search system that combines the semantic understanding of vector search, the precision of keyword matching, and the relationship awareness of graph traversal to provide comprehensive retrieval for intelligence queries.",
        action: "I implemented a hybrid search architecture: (1) Azure Cognitive Search with HNSW vector index for semantic similarity using text-embedding-ada-002, (2) BM25 keyword matching for precise term lookups especially for acronyms and entity names, (3) Semantic ranking layer to rerank results by query intent, (4) Cosmos DB graph queries for 1-hop entity relationship traversal, (5) Query orchestration layer that executes all three search strategies in parallel and merges results with weighted scoring, (6) Context assembly that includes related entities and their relationships before LLM generation. I also added metadata filters for date ranges, document types, and classification levels.",
        result: "Dramatically improved retrieval quality. Queries like 'Russian election interference' now find semantically relevant documents AND keyword matches AND traverse threat actor relationships to surface connected campaigns. Reduced noise in LLM context led to better answer quality and 94% citation accuracy. Analysts reported finding connections they would have missed with traditional search.",
      },
      metrics: {
        primary: 'Enabled comprehensive corpus-wide analysis with 94% citation accuracy',
        secondary: [
          'Multi-pronged retrieval (vector + keyword + graph)',
          'Reduced noise in LLM context',
          'Semantic ranking for query intent',
        ],
      },
      tags: ['search', 'system-design', 'azure', 'retrieval', 'ai', 'information-retrieval'],
      variations: {
        technical: "Deep-dive into the three search strategies, scoring weights, and result merging logic.",
      },
      followUpQuestions: [
        'How did you weight the different search strategies?',
        'How do you handle conflicting results?',
        'What were the latency implications?',
        'How did you evaluate search quality?',
      ],
      coachingNotes: "Good for system design questions about search. Be ready to explain the trade-offs between different search approaches.",
      usedInInterviews: [],
      timesUsed: 0,
      createdAt: now,
      updatedAt: now,
      profileId,
    },

    // Story 5: Citation Tracking
    {
      id: generateId(),
      title: 'Built Citation Tracking System with 94% Accuracy',
      rawInput: 'Auto-generated from MTAC Intelligence Copilot documentation',
      inputMethod: 'import' as const,
      star: {
        situation: "MTAC analysts were initially skeptical of AI-generated intelligence. They needed to verify every statement before including it in official reports. Without citation tracking, they had to manually search for source documents, which negated much of the time savings. There were also compliance requirements for audit trails.",
        task: "Implement a citation tracking system that links every AI-generated statement back to source documents, enabling analysts to verify claims and meet compliance requirements.",
        action: "I designed a comprehensive citation system: (1) Prompt templates requiring the LLM to use numbered [Source N] citations for every claim, (2) Citation parsing logic to extract indices from generated text and map to source chunks, (3) Metadata layer linking citations to SharePoint URLs for one-click access to original documents, (4) UI components with clickable citations and hover tooltips showing source quotes, (5) Citation validation logic to detect and flag unsupported claims, (6) Audit logging capturing every generated response with full citation provenance. I also added citation quality metrics to our monitoring dashboard.",
        result: "Achieved 94% citation accuracy - every claim in generated responses was traceable to source documents. Analysts could verify AI-generated intelligence with one click. Built trust leading to 87% user satisfaction. Met SFI and Responsible AI compliance requirements. Citation tracking became a key differentiator that drove adoption.",
      },
      metrics: {
        primary: '94% citation accuracy',
        secondary: [
          'One-click source verification',
          '87% user satisfaction',
          'Full compliance with SFI and Responsible AI',
          'Complete audit trail for compliance',
        ],
      },
      tags: ['quality', 'compliance', 'responsible-ai', 'trust', 'ux', 'ai'],
      variations: {
        challenge: "Emphasize building trust with skeptical users through transparency and verification.",
      },
      followUpQuestions: [
        'How did you handle cases where citations were incorrect?',
        'What about hallucinated citations?',
        'How did you meet compliance requirements?',
        'How did citation tracking affect user adoption?',
      ],
      coachingNotes: "Great story for questions about Responsible AI, compliance, and building trust. Emphasize the connection between transparency and user adoption.",
      usedInInterviews: [],
      timesUsed: 0,
      createdAt: now,
      updatedAt: now,
      profileId,
    },

    // Story 6: Zero-Downtime Pipeline
    {
      id: generateId(),
      title: 'Designed Zero-Downtime Daily Refresh Pipeline',
      rawInput: 'Auto-generated from MTAC Intelligence Copilot documentation',
      inputMethod: 'import' as const,
      star: {
        situation: "The Intel Copilot system needed to ingest new threat intelligence documents daily to stay current. However, the data refresh process required restarting services, which would have caused downtime during business hours. For mission-critical intelligence work, even brief outages were unacceptable.",
        task: "Design a data refresh pipeline that processes thousands of new documents daily without any service interruption for analysts.",
        action: "I built an Azure Data Factory pipeline with graceful degradation: (1) Health check verification before starting the refresh, (2) Maintenance mode toggle that notifies the frontend without stopping queries, (3) Document ingestion from SharePoint running in parallel with live queries, (4) IRE indexing for new documents only (incremental processing), (5) Atomic updates to Cosmos DB and Azure Cognitive Search, (6) Rolling restart of web app instances to pick up new data, (7) Post-refresh health verification, (8) Automatic maintenance mode disable. On the frontend, I implemented a polling health check that displays an orange banner when maintenance mode is active, informing analysts that queries may be slower but the system remains functional.",
        result: "Zero hard downtime achieved. Analysts can continue working during the daily refresh (~45 minutes). The transparent maintenance banner keeps analysts informed. Health checks ensure automatic recovery. Graceful degradation means degraded service instead of complete outage. Pipeline runs successfully every night with no analyst complaints.",
      },
      metrics: {
        primary: 'Zero-downtime daily data refresh',
        secondary: [
          '45-minute refresh window with degraded service only',
          'Automatic health check recovery',
          'Transparent maintenance communication',
        ],
      },
      tags: ['devops', 'reliability', 'azure', 'pipelines', 'data-engineering', 'sre'],
      variations: {
        technical: "Focus on the pipeline architecture, incremental processing, and atomic updates.",
      },
      followUpQuestions: [
        'How do you handle failures mid-pipeline?',
        'What about rollback scenarios?',
        'How do you test the pipeline?',
        'What monitoring is in place?',
      ],
      coachingNotes: "Good for DevOps and reliability questions. Emphasize the user-centric design (degraded service vs outage) and operational considerations.",
      usedInInterviews: [],
      timesUsed: 0,
      createdAt: now,
      updatedAt: now,
      profileId,
    },

    // Story 7: Cost Optimization
    {
      id: generateId(),
      title: 'Optimized LLM Costs by 40% ($2,000/day to $1,200/day)',
      rawInput: 'Auto-generated from MTAC Intelligence Copilot documentation',
      inputMethod: 'import' as const,
      star: {
        situation: "Initial daily API costs were approximately $2,000 - about $60,000 per month - which was unsustainable at scale. Leadership flagged this as a blocker for continued development. We needed to dramatically reduce costs while maintaining system quality and analyst productivity.",
        task: "Reduce LLM API costs to sustainable levels without impacting system quality, response time, or analyst productivity.",
        action: "I implemented a multi-pronged cost optimization strategy: (1) LLM Response Caching with Redis - hash prompts to detect identical requests, cache entity extraction results for 30 days, only process new or modified documents; (2) Model Selection Strategy - GPT-4 for complex reasoning (entity extraction, relationship detection) where quality is critical, GPT-4o Mini for simpler tasks (theme summarization, community descriptions) where speed matters more; (3) Rate Limiting - prevent runaway costs from inefficient queries, implement per-user quotas during testing; (4) Monitoring Dashboards - track per-query costs, identify expensive patterns, alert on anomalies. I also documented the cost allocation model for leadership visibility.",
        result: "Reduced costs from $2,000/day to $1,200/day - a 40% reduction. Caching alone saved 60% by eliminating redundant processing. Model selection saved an additional 20% on appropriate workloads. Monthly costs now ~$36,000 vs initial projection of $60,000+. System became sustainable at production scale. Leadership approved continued development.",
      },
      metrics: {
        primary: '40% cost reduction ($800/day savings)',
        secondary: [
          'Caching saved 60% on redundant processing',
          'Model selection saved 20% on appropriate tasks',
          'Monthly costs: $36K vs projected $60K+',
          'Sustainable at production scale',
        ],
      },
      tags: ['cost-optimization', 'cloud', 'efficiency', 'azure', 'llm', 'caching'],
      variations: {
        technical: "Deep-dive into caching strategy, cache key design, and TTL decisions.",
      },
      followUpQuestions: [
        'How did you decide which tasks to use GPT-4o Mini for?',
        'What about cache invalidation?',
        'How do you monitor costs in real-time?',
        'What was the impact on quality?',
      ],
      coachingNotes: "Excellent for questions about cost optimization, cloud economics, or making technical decisions with business impact.",
      usedInInterviews: [],
      timesUsed: 0,
      createdAt: now,
      updatedAt: now,
      profileId,
    },

    // Story 8: High Availability
    {
      id: generateId(),
      title: 'Achieved 99.8% API Uptime with Multi-Region Deployment',
      rawInput: 'Auto-generated from MTAC Intelligence Copilot documentation',
      inputMethod: 'import' as const,
      star: {
        situation: "Intel Copilot was supporting mission-critical threat intelligence work. A single-region deployment was vulnerable to regional Azure outages, which had occurred multiple times in the past year. Analysts needed near-100% availability to rely on the system for time-sensitive intelligence work.",
        task: "Achieve production-grade reliability (99.8%+ uptime) for a critical AI system that analysts depend on for time-sensitive threat intelligence.",
        action: "I designed a multi-region high availability architecture: (1) Deployed Azure OpenAI endpoints across East US, West US, and Central US regions, (2) Implemented health check endpoints (/api/health) that verify connectivity to all dependencies, (3) Built automatic failover in the load balancer - if an endpoint fails health checks 5 times, traffic routes to healthy endpoints, (4) Created Application Insights monitoring with alerts for error rates (>10 in 5 min), latency spikes (p95 >30s), and endpoint failures, (5) Designed graceful degradation - if one endpoint fails, others absorb load with slightly higher latency rather than returning errors, (6) Built a recovery scheduler that retests unhealthy endpoints every 5 minutes.",
        result: "Achieved 99.8% API uptime over the production period. Automatic failover handled endpoint issues without analyst-visible impact. No single point of failure in the architecture. Analysts can rely on the system for time-critical intelligence work. The architecture has handled multiple Azure incidents transparently.",
      },
      metrics: {
        primary: '99.8% API uptime',
        secondary: [
          'Multi-region deployment (East, West, Central US)',
          'Automatic failover with no user impact',
          'Graceful degradation instead of errors',
        ],
      },
      tags: ['reliability', 'sre', 'azure', 'high-availability', 'monitoring', 'devops'],
      followUpQuestions: [
        'How do you handle partial failures?',
        'What monitoring alerts do you have?',
        'How do you test failover scenarios?',
        'What was the most challenging incident?',
      ],
      coachingNotes: "Great for SRE and reliability questions. Emphasize the user-centric design (no visible impact) and operational excellence.",
      usedInInterviews: [],
      timesUsed: 0,
      createdAt: now,
      updatedAt: now,
      profileId,
    },

    // Story 9: MSR Collaboration
    {
      id: generateId(),
      title: 'Collaborated with Microsoft Research on Production Adaptation',
      rawInput: 'Auto-generated from MTAC Intelligence Copilot documentation',
      inputMethod: 'import' as const,
      star: {
        situation: "Microsoft Research had developed the IRE (Information Retrieval Engine) for GraphRAG as a research prototype. While the core algorithms were sound, the implementation was optimized for experiments, not production workloads. It lacked error handling, monitoring hooks, and scalability features needed for a production deployment.",
        task: "Collaborate with the MSR team to adapt their research prototype for production use while providing feedback that would improve the engine for future users.",
        action: "I established a bi-weekly sync with the MSR team to: (1) Identify gaps between research and production requirements - error handling, retry logic, monitoring, edge cases, (2) Implement a production wrapper around IRE that added robustness without modifying the core engine, (3) Document and report real-world issues we encountered - entity extraction quality, performance bottlenecks, scaling challenges, (4) Propose and test improvements that MSR could incorporate back into the engine, (5) Create a feedback loop where production metrics informed research direction. I also wrote internal documentation on the MSR-to-production collaboration pattern.",
        result: "Successfully adapted the research prototype for production with 99.8% uptime. Real-world feedback improved the IRE engine for all users - several of our suggestions were incorporated into the next release. Established a reusable pattern for MSR-to-production collaboration that other teams have since followed. Intel Copilot became a showcase for GraphRAG capabilities.",
      },
      metrics: {
        primary: 'Successfully shipped MSR research to production',
        secondary: [
          'Established MSR-to-production collaboration pattern',
          'Multiple improvements incorporated into IRE engine',
          'Model for future research-to-production projects',
        ],
      },
      tags: ['collaboration', 'cross-team', 'research', 'communication', 'leadership'],
      variations: {
        leadership: "Emphasize establishing the collaboration process and creating reusable patterns for the organization.",
      },
      followUpQuestions: [
        'What were the biggest gaps between research and production?',
        'How did you manage different priorities?',
        'What improvements did you contribute back?',
        'How would you advise others on similar collaborations?',
      ],
      coachingNotes: "Good for behavioral questions about collaboration, working with researchers, and bridging organizational boundaries.",
      usedInInterviews: [],
      timesUsed: 0,
      createdAt: now,
      updatedAt: now,
      profileId,
    },

    // Story 10: Entity Merge UI
    {
      id: generateId(),
      title: 'Built Entity Merge UI for Analyst-Driven Data Curation',
      rawInput: 'Auto-generated from MTAC Intelligence Copilot documentation',
      inputMethod: 'import' as const,
      star: {
        situation: "Despite 92% entity extraction accuracy, duplicate entities were fragmenting the knowledge graph. The same threat actor 'APT28' appeared as separate entities: 'APT28', 'Fancy Bear', and 'Sofacy'. Each had partial relationship data, so analysts couldn't see the complete threat actor network. There was no way for analysts to correct these issues without engineering intervention.",
        task: "Enable analysts to improve data quality by merging duplicate entities while preserving all relationship information and creating an audit trail for future reference.",
        action: "I designed and built an entity merge feature: (1) Entity merge UI in React/FluentUI where analysts select a primary entity and duplicates to merge, (2) Reason field for analysts to document why entities should be merged (e.g., 'Same threat actor, different naming conventions'), (3) Backend merge logic that combines all relationships from duplicate entities into the primary, (4) Reference updates across all document chunks and queries, (5) Merge history stored in Cosmos DB for audit, (6) Future query logic that automatically applies merge mappings. I also added analytics to track merge frequency and patterns to improve extraction prompts.",
        result: "Analysts can curate data quality without engineering intervention. An entity with 15+8+3 separate relationships now shows all 26 relationships together. Comprehensive threat actor views enabled better intelligence analysis. Knowledge graph quality continuously improves through human-in-the-loop corrections. Merge patterns informed improvements to entity extraction prompts.",
      },
      metrics: {
        primary: 'Enabled comprehensive entity views through user curation',
        secondary: [
          'Human-in-the-loop for AI corrections',
          'Full audit trail for merges',
          'Continuous knowledge graph improvement',
        ],
      },
      tags: ['product', 'ux', 'data-quality', 'user-research', 'frontend', 'react'],
      variations: {
        technical: "Focus on the merge logic, referential integrity, and preventing data corruption.",
      },
      followUpQuestions: [
        'How do you handle merge conflicts?',
        'What about reversing a merge?',
        'How did analysts discover duplicate entities?',
        'How did this improve extraction over time?',
      ],
      coachingNotes: "Good for product/UX questions and human-in-the-loop AI patterns.",
      usedInInterviews: [],
      timesUsed: 0,
      createdAt: now,
      updatedAt: now,
      profileId,
    },

    // Story 11: Compliance Certification
    {
      id: generateId(),
      title: 'Led Full Compliance Certification (SFI, SDL, Responsible AI)',
      rawInput: 'Auto-generated from MTAC Intelligence Copilot documentation',
      inputMethod: 'import' as const,
      star: {
        situation: "Intel Copilot handled sensitive threat intelligence that required full security and compliance certification before production launch. The system needed to meet SFI (Sensitive Flight Information), SDL (Security Development Lifecycle), and Responsible AI standards. This was the first production AI system in MTAC, so there was no precedent to follow.",
        task: "Lead the system through all required compliance certifications while maintaining development velocity and not delaying the production launch.",
        action: "I coordinated the compliance effort across multiple workstreams: (1) Threat modeling sessions to identify attack vectors and mitigations, (2) Network isolation via AME (Azure Managed Environment) with VPN-only access, (3) Encryption at rest (Azure Storage) and in transit (TLS 1.2+), (4) Comprehensive audit logging for all queries, generations, and entity merges, (5) Static analysis and dependency vulnerability scanning in CI/CD, (6) Penetration testing with Microsoft's security team, (7) Responsible AI review including bias testing for entity extraction, hallucination monitoring via citation verification, and human-in-the-loop for high-stakes decisions. I documented all decisions and created runbooks for incident response.",
        result: "Achieved full SFI, SDL, and Responsible AI certification. Launched to production with zero security findings. Established security patterns that other AI systems in the division now follow. Created documentation and runbooks that reduced certification time for subsequent projects.",
      },
      metrics: {
        primary: 'Full compliance certification achieved',
        secondary: [
          'Zero security findings at launch',
          'Established security patterns for division',
          'Reduced certification time for future projects',
        ],
      },
      tags: ['compliance', 'security', 'leadership', 'responsible-ai', 'governance'],
      variations: {
        leadership: "Emphasize coordinating across security, legal, and engineering teams.",
      },
      followUpQuestions: [
        'What was the most challenging compliance requirement?',
        'How did you handle Responsible AI concerns?',
        'What about ongoing compliance monitoring?',
        'How did you balance compliance with velocity?',
      ],
      coachingNotes: "Important for questions about security, compliance, and Responsible AI. Shows leadership and organizational skills.",
      usedInInterviews: [],
      timesUsed: 0,
      createdAt: now,
      updatedAt: now,
      profileId,
    },

    // Story 12: User Satisfaction
    {
      id: generateId(),
      title: 'Achieved 87% User Satisfaction with Iterative Improvement',
      rawInput: 'Auto-generated from MTAC Intelligence Copilot documentation',
      inputMethod: 'import' as const,
      star: {
        situation: "AI systems often fail user adoption due to trust issues and usability problems. MTAC analysts were skeptical of AI-generated intelligence and needed to trust the system before incorporating it into their workflow. We needed to ensure high adoption and satisfaction to justify continued investment.",
        task: "Achieve high user satisfaction and daily adoption among MTAC threat intelligence analysts who were initially skeptical of AI-generated content.",
        action: "I led a user-centric development approach: (1) Pilot program with 5 analysts before wide rollout - gathered detailed feedback on query quality, response time, and UI usability, (2) Implemented citation tracking specifically because analysts requested source verification, (3) Added entity merge UI based on analyst feedback about duplicate entities, (4) Created downloadable intelligence reports in analyst-preferred formats, (5) Improved prompts iteratively based on analyst feedback about answer quality, (6) Made the system transparent about limitations - explicitly says 'I don\'t have information on this' rather than hallucinating. I also established regular feedback sessions and a feature request tracking system.",
        result: "87% user satisfaction rating in post-launch survey. Analysts use the system daily for intelligence work. 50% reduction in time spent on weekly roundups. Successful adoption across all MTAC teams. The iterative approach and user focus became a model for AI system rollouts in the organization.",
      },
      metrics: {
        primary: '87% user satisfaction',
        secondary: [
          'Daily usage by all MTAC teams',
          '50% time reduction on weekly roundups',
          'Model for AI system rollouts',
        ],
      },
      tags: ['customer-success', 'user-research', 'iteration', 'feedback', 'product', 'adoption'],
      variations: {
        leadership: "Focus on establishing feedback processes and driving adoption across teams.",
      },
      followUpQuestions: [
        'How did you gather feedback?',
        'What was the biggest complaint and how did you address it?',
        'How did you prioritize feature requests?',
        'What would you do differently?',
      ],
      coachingNotes: "Excellent for questions about user adoption, product thinking, and iterative development. Shows customer focus.",
      usedInInterviews: [],
      timesUsed: 0,
      createdAt: now,
      updatedAt: now,
      profileId,
    },
  ];
}

// ============================================
// TECHNICAL ANSWERS
// ============================================

function createTechnicalAnswers(profileId: string, storyIds: string[]): TechnicalAnswer[] {
  const now = new Date().toISOString();

  return [
    // Answer 1: Most Impactful Project (STAR)
    {
      id: generateId(),
      question: 'Tell me about your most impactful project',
      questionType: 'experience',
      format: {
        type: 'STAR',
        sections: [
          { label: 'Situation', content: 'MTAC analysts spent hours reading thousands of threat intelligence documents daily, missing patterns across the corpus.' },
          { label: 'Task', content: "Build Microsoft's first production GraphRAG system for corpus-wide threat intelligence analysis." },
          { label: 'Action', content: 'Designed end-to-end architecture: Azure Functions ingestion, Databricks processing, IRE GraphRAG engine, hybrid search, C# API with load balancing, React frontend.' },
          { label: 'Result', content: '50% reduction in analyst time, 99.8% uptime, 94% citation accuracy, 87% satisfaction. First production GraphRAG at Microsoft.' },
        ],
      },
      sources: { storyIds: storyIds.slice(0, 1), profileSections: ['activeProjects'], synthesized: false },
      answer: {
        structured: [
          { label: 'Situation', content: "Microsoft Threat Analysis Center analysts were spending hours manually reading through thousands of threat intelligence documents daily. Traditional SharePoint search returned individual documents, missing critical patterns and connections across the entire corpus." },
          { label: 'Task', content: "As the lead engineer, I was tasked with designing and building Microsoft's first production GraphRAG-based AI system that would enable analysts to query across the entire threat intelligence corpus, automatically extract entities and relationships, and generate comprehensive summaries with full citation tracking." },
          { label: 'Action', content: "I designed the end-to-end architecture: Azure Functions for document ingestion, Databricks for processing, integrated Microsoft Research's IRE engine for entity extraction using GPT-4, built hybrid search combining Azure Cognitive Search vectors with Cosmos DB graph traversal, created a C# API layer with custom load balancing across 4 GPT-4 endpoints, and built a React frontend with D3.js graph visualization. I personally wrote the load balancing logic, designed entity extraction prompts achieving 92% accuracy, and collaborated with MSR to adapt their research prototype for production." },
          { label: 'Result', content: "The system launched successfully in production. Key outcomes: 50% reduction in time spent on report summaries, 50% faster theme-based retrieval, 99.8% API uptime, 94% citation accuracy, and 87% user satisfaction. This became Microsoft's first production GraphRAG system, and the architecture patterns were adopted by other teams across the CST-E division." },
        ],
        narrative: "My most impactful project was building **MTAC Intelligence Copilot** - Microsoft's first production GraphRAG system for threat intelligence analysis.\n\n**The Challenge**: MTAC analysts were spending hours daily manually reading through thousands of threat intelligence documents. Traditional SharePoint search only returned individual documents, completely missing the patterns and connections across the corpus that are critical for threat analysis.\n\n**My Role**: As the lead engineer, I designed and built the complete system from scratch. The key innovation was using **GraphRAG** - instead of just searching documents, we automatically extract entities (threat actors, malware, vulnerabilities) and their relationships to build a knowledge graph.\n\n**The Technical Solution**: I architected the end-to-end pipeline:\n- Azure Functions for document ingestion from SharePoint\n- Databricks for document processing and chunking\n- Microsoft Research's IRE engine for entity extraction using GPT-4\n- Hybrid search combining vector embeddings, keyword matching, AND graph traversal\n- Custom load balancing across 4 GPT-4 endpoints to handle scale\n- React frontend with interactive graph visualization\n\nI personally wrote the load balancing algorithm, designed the entity extraction prompts (improved accuracy from 70% to 92%), and collaborated with Microsoft Research to adapt their prototype for production.\n\n**The Impact**: The numbers speak for themselves:\n- **50% reduction** in time spent on weekly roundups and report summaries\n- **99.8% API uptime** with multi-region deployment\n- **94% citation accuracy** - every claim traceable to sources\n- **87% user satisfaction** among analysts\n\nThis was Microsoft's first production GraphRAG system, and the architecture patterns we established are now being adopted by other teams across the division.",
        bulletPoints: [
          "First production GraphRAG system at Microsoft",
          "50% reduction in analyst time on reports",
          "Custom load balancing for 960 req/min capacity",
          "92% entity extraction accuracy through prompt engineering",
          "99.8% uptime with multi-region deployment",
        ],
      },
      followUps: [
        {
          question: 'How did you handle the entity extraction accuracy challenges?',
          likelihood: 'high',
          suggestedAnswer: "Initial accuracy was 70% using generic prompts. I developed domain-specific prompts with threat intelligence entity types and few-shot examples from real MTAC reports, improving to 92%.",
          keyPoints: ['Domain-specific prompts', 'Few-shot examples', 'Confidence scoring'],
        },
        {
          question: 'What was your load balancing strategy?',
          likelihood: 'high',
          suggestedAnswer: 'Custom C# load balancer distributing across 4 Azure OpenAI endpoints with least-loaded-first routing, health checks, and automatic failover. Achieved 960 req/min capacity.',
          keyPoints: ['4 regional endpoints', 'Health checks', 'Automatic failover'],
        },
      ],
      metadata: { difficulty: 'staff', tags: ['graphrag', 'microsoft', 'llm', 'azure', 'system-design'] },
      usedInInterviews: [],
      timesUsed: 0,
      practiceCount: 0,
      createdAt: now,
      updatedAt: now,
      profileId,
    },

    // Answer 2: System Performance Improvement (STAR)
    {
      id: generateId(),
      question: 'Describe a time you improved system performance significantly',
      questionType: 'behavioral-technical',
      format: {
        type: 'STAR',
        sections: [
          { label: 'Situation', content: 'Single GPT-4 endpoint was rate limited, causing 15% throttling and 30-60 second wait times.' },
          { label: 'Task', content: 'Eliminate throttling and improve response times while maintaining high availability.' },
          { label: 'Action', content: 'Designed custom load balancer across 4 Azure OpenAI endpoints with health checks and automatic failover.' },
          { label: 'Result', content: '4x capacity increase to 960 req/min, <1% throttling, 50% faster processing.' },
        ],
      },
      sources: { storyIds: storyIds.slice(1, 2), profileSections: ['activeProjects'], synthesized: false },
      answer: {
        structured: [
          { label: 'Situation', content: 'Our Intel Copilot system was hitting rate limits on our single GPT-4 endpoint (240 req/min). During peak hours, analysts waited 30-60 seconds and 15% of requests failed due to throttling.' },
          { label: 'Task', content: 'Design a load balancing solution to eliminate throttling, improve response times, and maintain high availability.' },
          { label: 'Action', content: 'Designed custom load balancer in C# distributing across 4 Azure OpenAI endpoints (2 East US, 1 West US, 1 Central US). Implemented per-endpoint rate tracking, health checks with automatic failover, least-loaded-first routing, and distributed state via Redis.' },
          { label: 'Result', content: 'Combined capacity increased to 960 req/min (4x). Response time under 10 seconds. Throttling dropped from 15% to <1%. Contributed to 50% faster theme-based retrieval.' },
        ],
        narrative: "I significantly improved system performance by designing a **custom load balancer** for our LLM-based threat intelligence system.\n\n**The Problem**: Our single GPT-4 endpoint was capped at 240 requests per minute. During peak hours, analysts were waiting 30-60 seconds for responses, and about 15% of requests were failing due to throttling. This was destroying user trust in the system.\n\n**My Solution**: I designed and implemented a custom load balancer in C# that distributed requests across 4 Azure OpenAI deployments across different regions:\n\n- **Per-endpoint tracking**: Each endpoint tracks its own request count and rate limit status\n- **Health checks**: Endpoints marked unhealthy after 5 consecutive failures, with automatic recovery testing every 5 minutes\n- **Smart routing**: Least-loaded-first algorithm with geographic proximity for latency optimization\n- **Distributed state**: Redis for sharing endpoint status across API instances\n\n**The Results** were dramatic:\n- **4x capacity increase** to 960 requests/minute\n- **Response time under 10 seconds** for complex queries\n- **Throttling dropped from 15% to <1%**\n- Contributed to **50% faster overall processing**\n\nThe best part: when endpoints have issues, the system fails over automatically with zero visible impact to analysts.",
        bulletPoints: [
          '4x capacity increase (240 to 960 req/min)',
          'Response time under 10 seconds',
          'Throttling reduced from 15% to <1%',
          'Automatic failover with no user impact',
        ],
      },
      followUps: [
        {
          question: 'How did you test the failover scenarios?',
          likelihood: 'high',
          suggestedAnswer: 'Created chaos engineering tests that intentionally disabled endpoints. Verified traffic rerouted within seconds and recovered when endpoints came back online.',
          keyPoints: ['Chaos testing', 'Automated verification', 'Recovery testing'],
        },
      ],
      metadata: { difficulty: 'senior', tags: ['performance', 'load-balancing', 'azure', 'scalability'] },
      usedInInterviews: [],
      timesUsed: 0,
      practiceCount: 0,
      createdAt: now,
      updatedAt: now,
      profileId,
    },

    // Answer 3: Cost Optimization (STAR)
    {
      id: generateId(),
      question: 'Tell me about a time you had to optimize costs',
      questionType: 'behavioral-technical',
      format: {
        type: 'STAR',
        sections: [
          { label: 'Situation', content: 'LLM API costs were $2,000/day (~$60K/month), flagged as unsustainable by leadership.' },
          { label: 'Task', content: 'Reduce costs to sustainable levels without impacting quality or analyst productivity.' },
          { label: 'Action', content: 'Implemented Redis caching (60% savings), model selection strategy (20% savings), and cost monitoring.' },
          { label: 'Result', content: 'Reduced from $2,000/day to $1,200/day - 40% reduction. Project continued to production.' },
        ],
      },
      sources: { storyIds: storyIds.slice(6, 7), profileSections: ['activeProjects'], synthesized: false },
      answer: {
        structured: [
          { label: 'Situation', content: 'Our AI system was costing approximately $2,000 per day in LLM API costs - about $60,000 monthly. Leadership flagged this as unsustainable and a potential blocker for continued development.' },
          { label: 'Task', content: 'Reduce LLM API costs to sustainable levels without impacting system quality, response time, or analyst productivity.' },
          { label: 'Action', content: "Implemented multi-pronged optimization: (1) Redis caching for LLM responses - hash prompts to detect identical requests, cache entity extraction for 30 days; (2) Model selection - GPT-4 for complex reasoning, GPT-4o Mini for simpler summarization tasks; (3) Rate limiting and per-user quotas during testing; (4) Cost monitoring dashboards to identify expensive patterns." },
          { label: 'Result', content: 'Reduced costs from $2,000/day to $1,200/day - 40% reduction. Caching alone saved 60% by eliminating redundant processing. Model selection saved additional 20%. Monthly costs now ~$36K vs projected $60K+. Project approved for production launch.' },
        ],
        narrative: "I led a cost optimization effort that **reduced LLM API costs by 40%** - from $2,000/day to $1,200/day.\n\n**The Problem**: Our AI-powered threat intelligence system was burning through about $2,000 in API costs daily - roughly $60,000 per month. Leadership flagged this as unsustainable and it was becoming a blocker for production launch.\n\n**My Approach**: I implemented a multi-pronged strategy:\n\n1. **LLM Response Caching (60% savings)**\n   - Redis cache with hashed prompts as keys\n   - Entity extraction results cached for 30 days\n   - Only new or modified documents trigger LLM calls\n\n2. **Smart Model Selection (20% savings)**\n   - GPT-4 for complex reasoning (entity extraction, relationship detection)\n   - GPT-4o Mini for simpler tasks (summarization, theme descriptions)\n   - Quality remained high because we matched model to task complexity\n\n3. **Monitoring & Guardrails**\n   - Cost tracking dashboards by query type\n   - Rate limiting during testing\n   - Alerts on anomalous spending\n\n**The Impact**: Costs dropped from **$2,000/day to $1,200/day** - a 40% reduction that saved about $24,000 monthly. More importantly, the project was approved for production launch. We proved that AI systems can be cost-effective at scale.",
        bulletPoints: [
          '40% cost reduction ($2K to $1.2K/day)',
          'Caching saved 60% on redundant processing',
          'Model selection saved 20% on appropriate tasks',
          'Enabled production launch approval',
        ],
      },
      followUps: [
        {
          question: 'How did you decide which tasks to use GPT-4o Mini for?',
          likelihood: 'high',
          suggestedAnswer: 'Evaluated task complexity: entity extraction needs nuanced reasoning (GPT-4), while summarization and theme descriptions work well with GPT-4o Mini. Validated with quality metrics before switching.',
          keyPoints: ['Task complexity analysis', 'Quality validation', 'A/B testing'],
        },
      ],
      metadata: { difficulty: 'senior', tags: ['cost-optimization', 'cloud', 'llm', 'caching', 'efficiency'] },
      usedInInterviews: [],
      timesUsed: 0,
      practiceCount: 0,
      createdAt: now,
      updatedAt: now,
      profileId,
    },

    // Answer 4: Cross-Team Collaboration (STAR)
    {
      id: generateId(),
      question: 'Describe a challenging collaboration with another team',
      questionType: 'experience',
      format: {
        type: 'STAR',
        sections: [
          { label: 'Situation', content: "MSR's GraphRAG engine was a research prototype lacking production features." },
          { label: 'Task', content: 'Adapt the prototype for production while providing feedback to improve the engine.' },
          { label: 'Action', content: 'Established bi-weekly syncs, implemented production wrapper, documented real-world issues, contributed improvements back.' },
          { label: 'Result', content: 'Successfully shipped to production. Improvements incorporated into MSR engine. Established collaboration pattern for org.' },
        ],
      },
      sources: { storyIds: storyIds.slice(8, 9), profileSections: ['activeProjects'], synthesized: false },
      answer: {
        structured: [
          { label: 'Situation', content: "Microsoft Research had developed the IRE GraphRAG engine as a research prototype. While the core algorithms were excellent, it was optimized for experiments, not production - lacking error handling, monitoring, and scalability features we needed." },
          { label: 'Task', content: 'Collaborate with MSR to adapt their prototype for production use while providing feedback that would improve the engine for future users.' },
          { label: 'Action', content: "Established bi-weekly syncs with MSR. Identified gaps between research and production (error handling, retry logic, monitoring). Built a production wrapper adding robustness without modifying core engine. Documented real-world issues and proposed improvements. Created feedback loop where production metrics informed research priorities." },
          { label: 'Result', content: 'Successfully adapted prototype for production with 99.8% uptime. Several suggestions incorporated into next IRE release. Established reusable MSR-to-production collaboration pattern. Intel Copilot became a showcase for GraphRAG capabilities.' },
        ],
        narrative: "I navigated a challenging collaboration between my product team and **Microsoft Research** to ship their GraphRAG prototype to production.\n\n**The Challenge**: MSR had built an impressive GraphRAG engine for research purposes. But research code and production code have very different requirements - the prototype lacked error handling, monitoring hooks, retry logic, and scalability features. We couldn't just deploy it as-is.\n\n**My Approach**: I established a structured collaboration:\n\n1. **Bi-weekly syncs** with the MSR team to align on priorities and share learnings\n2. **Gap analysis** documenting research vs production requirements\n3. **Production wrapper** that added robustness without modifying the core engine\n4. **Feedback loop** where our production metrics informed their research direction\n5. **Documentation** of patterns for future MSR-to-production projects\n\n**The Challenges** included different incentive structures (research values novelty, production values stability), different timelines (research moves in months, production in sprints), and different definitions of \"done.\" We navigated these by being transparent about our constraints and finding mutual wins.\n\n**The Outcome**: We successfully shipped to production with 99.8% uptime. Several of our suggested improvements were incorporated into the next IRE release. Most importantly, we established a **reusable collaboration pattern** that other teams have since followed for MSR partnerships.",
        bulletPoints: [
          'Established structured MSR-to-production collaboration',
          '99.8% uptime for adapted research prototype',
          'Improvements contributed back to MSR engine',
          'Created reusable pattern for future projects',
        ],
      },
      followUps: [
        {
          question: 'What were the biggest gaps between research and production?',
          likelihood: 'high',
          suggestedAnswer: 'Error handling (research fails fast, production needs graceful degradation), monitoring (research uses notebooks, production needs observability), and edge cases (research uses clean data, production sees everything).',
          keyPoints: ['Error handling', 'Monitoring', 'Edge cases', 'Scale'],
        },
      ],
      metadata: { difficulty: 'senior', tags: ['collaboration', 'cross-team', 'research', 'communication'] },
      usedInInterviews: [],
      timesUsed: 0,
      practiceCount: 0,
      createdAt: now,
      updatedAt: now,
      profileId,
    },

    // Answer 5: Building Trust (STAR)
    {
      id: generateId(),
      question: 'Tell me about a time you had to build trust with skeptical users',
      questionType: 'experience',
      format: {
        type: 'STAR',
        sections: [
          { label: 'Situation', content: 'MTAC analysts were skeptical of AI-generated intelligence and needed to verify every statement.' },
          { label: 'Task', content: 'Build trust to achieve adoption for a mission-critical AI system.' },
          { label: 'Action', content: 'Implemented citation tracking, entity merge UI, transparent limitations, pilot program with feedback loops.' },
          { label: 'Result', content: '94% citation accuracy, 87% satisfaction, daily adoption by all teams.' },
        ],
      },
      sources: { storyIds: [storyIds[4], storyIds[11]], profileSections: ['activeProjects'], synthesized: true },
      answer: {
        structured: [
          { label: 'Situation', content: "MTAC analysts were initially skeptical of AI-generated intelligence. They needed to verify every statement before including it in official reports, which negated the time savings. For a mission-critical system, trust was essential." },
          { label: 'Task', content: 'Build trust with skeptical users to achieve adoption of the AI system for daily intelligence work.' },
          { label: 'Action', content: "Implemented multiple trust-building features: (1) Citation tracking linking every AI statement to source documents with one-click verification; (2) Entity merge UI giving analysts control over data quality; (3) Transparent limitations - system explicitly says 'I don't have information' rather than hallucinating; (4) Pilot program with 5 analysts for detailed feedback; (5) Regular feedback sessions and iterative improvements." },
          { label: 'Result', content: '94% citation accuracy achieved. 87% user satisfaction in post-launch survey. Daily adoption across all MTAC teams. The trust-building approach became a model for AI system rollouts in the organization.' },
        ],
        narrative: "I built trust with initially skeptical users to drive adoption of our **AI-powered threat intelligence system**.\n\n**The Challenge**: MTAC analysts were rightfully skeptical of AI-generated intelligence. For their work, every claim must be verifiable - they can't include unverified AI statements in official reports. Initial reaction was \"interesting demo, but I'll stick to manual analysis.\"\n\n**My Trust-Building Strategy**:\n\n1. **Citation Tracking (94% accuracy)**\n   - Every AI-generated statement links to source documents\n   - One-click access to verify any claim\n   - Hover tooltips show the exact source quote\n\n2. **Human-in-the-Loop Controls**\n   - Entity merge UI lets analysts correct AI mistakes\n   - Corrections improve future results\n   - Analysts feel ownership over data quality\n\n3. **Transparent Limitations**\n   - System explicitly says \"I don't have information on this\"\n   - No hallucination - silence is better than fabrication\n   - Clear about confidence levels\n\n4. **Iterative Rollout**\n   - Pilot with 5 power users first\n   - Weekly feedback sessions\n   - Shipped improvements based on real usage\n\n**The Outcome**: **87% user satisfaction** in our post-launch survey. Analysts now use the system daily for intelligence work. The transparent, user-centric approach became a model for AI system rollouts across the organization.",
        bulletPoints: [
          'Citation tracking with 94% accuracy',
          'Human-in-the-loop corrections',
          'Transparent about limitations',
          '87% satisfaction, daily adoption',
        ],
      },
      followUps: [
        {
          question: 'What was the biggest complaint and how did you address it?',
          likelihood: 'high',
          suggestedAnswer: 'Duplicate entities fragmenting the knowledge graph. Addressed with entity merge UI that let analysts combine duplicates themselves, improving both immediate usability and long-term data quality.',
          keyPoints: ['User feedback', 'Entity merge UI', 'Continuous improvement'],
        },
      ],
      metadata: { difficulty: 'senior', tags: ['trust', 'user-research', 'adoption', 'ai', 'responsible-ai'] },
      usedInInterviews: [],
      timesUsed: 0,
      practiceCount: 0,
      createdAt: now,
      updatedAt: now,
      profileId,
    },

    // Answer 6: System Design - Document Search with Relationships
    {
      id: generateId(),
      question: 'Design a document search system that understands relationships between entities',
      questionType: 'system-design',
      format: {
        type: 'Requirements-Design-Tradeoffs',
        sections: [
          { label: 'Requirements', content: 'Entity extraction, relationship mapping, hybrid search, scalability, accuracy.' },
          { label: 'Design', content: 'GraphRAG architecture with document ingestion, entity extraction pipeline, knowledge graph storage, hybrid retrieval.' },
          { label: 'Tradeoffs', content: 'Accuracy vs cost, real-time vs batch processing, graph complexity vs query performance.' },
        ],
      },
      sources: { storyIds: storyIds.slice(0, 4), profileSections: ['activeProjects'], synthesized: true },
      answer: {
        structured: [
          { label: 'Requirements', content: 'Entity extraction from documents, relationship mapping between entities, hybrid search (semantic + keyword + graph), scalability to thousands of documents, high accuracy for production use.' },
          { label: 'High-Level Architecture', content: 'Document Ingestion (Azure Functions) → Processing Pipeline (Databricks) → Entity Extraction (GPT-4) → Knowledge Graph (Cosmos DB) → Vector Index (Azure Cognitive Search) → Query Layer (C# API) → Frontend.' },
          { label: 'Key Components', content: '1) Entity extraction with domain-specific prompts and few-shot examples; 2) Relationship extraction with evidence requirements; 3) Hybrid search combining vectors, keywords, and graph traversal; 4) Load balancing across LLM endpoints.' },
          { label: 'Tradeoffs', content: 'GPT-4 vs smaller models (accuracy vs cost), real-time vs batch extraction (freshness vs cost), graph depth vs query latency.' },
        ],
        narrative: "I'll design a **GraphRAG-based document search system** that understands entity relationships - similar to what I built for Microsoft's threat intelligence platform.\n\n## Requirements Clarification\n\n- **Scale**: How many documents? (I'll design for thousands/day)\n- **Latency**: Query response time requirements? (<10 seconds)\n- **Entity types**: Domain-specific or general? (I'll assume domain-specific)\n- **Update frequency**: Real-time or batch? (Daily batch is typical)\n\n## High-Level Architecture\n\n```\nDocuments → Ingestion → Processing → Entity Extraction → Knowledge Graph\n                                              ↓\n                                    Vector Index ← Hybrid Search ← Query API ← Users\n```\n\n## Key Components\n\n### 1. Document Ingestion\n- Azure Functions triggered by new documents\n- Format conversion (PDF, DOCX → text)\n- Semantic chunking (800-1200 tokens with overlap)\n\n### 2. Entity Extraction Pipeline\n- **GPT-4** with domain-specific prompts\n- Custom entity types (e.g., threat_actor, malware, vulnerability)\n- Few-shot examples from real documents\n- Confidence scoring to filter uncertain extractions\n\n### 3. Relationship Extraction\n- Same LLM identifies relationships between entities\n- Evidence requirements - each relationship cites source text\n- Relationship types (exploits, targets, distributes, etc.)\n\n### 4. Knowledge Graph Storage (Cosmos DB)\n- Entities as nodes with properties\n- Relationships as edges with metadata\n- Community detection for theme clustering\n\n### 5. Vector Index (Azure Cognitive Search)\n- Embeddings using text-embedding-ada-002\n- HNSW index for approximate nearest neighbor\n- Hybrid search combining vectors + keywords\n\n### 6. Query Layer\n- Parallel execution of vector search, keyword search, graph traversal\n- Result merging with weighted scoring\n- Context assembly for LLM generation\n- **Load balancing** across multiple LLM endpoints\n\n## Key Tradeoffs\n\n| Tradeoff | Option A | Option B | My Recommendation |\n|----------|----------|----------|-------------------|\n| Model | GPT-4 | Smaller/cheaper | GPT-4 for extraction, smaller for generation |\n| Processing | Real-time | Batch | Batch (cost-effective, acceptable freshness) |\n| Graph depth | Deep traversal | 1-hop only | 1-hop (performance vs completeness) |\n\n## Scaling Considerations\n\n- **Caching** LLM responses for unchanged documents\n- **Rate limiting** with load balancing across endpoints\n- **Incremental processing** - only new/modified documents",
        bulletPoints: [
          'GraphRAG architecture for entity relationship understanding',
          'Hybrid search: vector + keyword + graph traversal',
          'Domain-specific entity extraction with GPT-4',
          'Load balancing for LLM scalability',
          'Caching for cost optimization',
        ],
      },
      followUps: [
        {
          question: 'How would you handle entity deduplication?',
          likelihood: 'high',
          suggestedAnswer: 'Combine automated clustering (similar names/embeddings) with user-driven merge UI. Store merge history for audit. Apply mappings at query time.',
          keyPoints: ['Automated detection', 'User confirmation', 'Audit trail'],
        },
        {
          question: 'How would you evaluate search quality?',
          likelihood: 'medium',
          suggestedAnswer: 'Create golden dataset with labeled queries and expected results. Measure precision/recall. Track user feedback (thumbs up/down). A/B test ranking changes.',
          keyPoints: ['Golden dataset', 'Precision/recall', 'User feedback'],
        },
      ],
      metadata: { difficulty: 'staff', tags: ['system-design', 'graphrag', 'search', 'azure', 'llm'] },
      usedInInterviews: [],
      timesUsed: 0,
      practiceCount: 0,
      createdAt: now,
      updatedAt: now,
      profileId,
    },

    // Answer 7: Design for LLM Rate Limits
    {
      id: generateId(),
      question: 'How would you design a system to handle LLM rate limits?',
      questionType: 'system-design',
      format: {
        type: 'Requirements-Design-Tradeoffs',
        sections: [
          { label: 'Requirements', content: 'Handle rate limits gracefully, maximize throughput, maintain availability.' },
          { label: 'Design', content: 'Multi-endpoint deployment with custom load balancer, health checks, caching layer.' },
          { label: 'Tradeoffs', content: 'Cost (more endpoints) vs capacity, complexity vs reliability.' },
        ],
      },
      sources: { storyIds: storyIds.slice(1, 2), profileSections: ['activeProjects'], synthesized: false },
      answer: {
        structured: [
          { label: 'Requirements', content: 'Handle rate limits without user-visible errors, maximize throughput, maintain high availability, control costs.' },
          { label: 'Architecture', content: 'Multi-endpoint deployment (4 regions) → Custom Load Balancer → Request Queue → Rate Tracking → Health Checks → Failover Logic.' },
          { label: 'Key Mechanisms', content: '1) Per-endpoint rate tracking with automatic reset; 2) Least-loaded-first routing; 3) Health checks with automatic failover; 4) Response caching to reduce LLM calls; 5) Circuit breakers for degraded mode.' },
          { label: 'Tradeoffs', content: 'More endpoints = higher cost but better capacity. Caching adds complexity but reduces load. Queue-based adds latency but handles bursts.' },
        ],
        narrative: "I'll walk through designing a system to handle **LLM rate limits** - something I've built for production at Microsoft.\n\n## The Challenge\n\nLLM APIs (like Azure OpenAI) have rate limits - typically around 240 requests/minute. When you hit limits, you get 429 errors and degraded user experience. Simply retrying makes things worse.\n\n## My Design\n\n### 1. Multi-Endpoint Deployment\nDeploy the same model across **multiple regional endpoints**:\n- East US (primary)\n- West US\n- Central US\n- Europe (if applicable)\n\nEach endpoint has its own rate limit, so 4 endpoints = 4x capacity.\n\n### 2. Custom Load Balancer\n\n```\n┌─────────────────────────────────────┐\n│           Load Balancer             │\n│  ┌─────────────────────────────┐   │\n│  │ Per-Endpoint Rate Tracking  │   │\n│  │ [East: 180/240] [West: 90/240] │\n│  └─────────────────────────────┘   │\n│  ┌─────────────────────────────┐   │\n│  │ Health Check Status         │   │\n│  │ [East: ✓] [West: ✓] [Cen: ⚠]│   │\n│  └─────────────────────────────┘   │\n│  ┌─────────────────────────────┐   │\n│  │ Routing: Least-loaded-first │   │\n│  └─────────────────────────────┘   │\n└─────────────────────────────────────┘\n```\n\n**Key features:**\n- Track requests per endpoint per minute\n- Automatic reset at minute boundaries\n- Route to least-loaded healthy endpoint\n- Failover if endpoint becomes unhealthy\n\n### 3. Caching Layer\nReduce LLM calls by caching:\n- Identical prompts → same response\n- Hash prompts as cache keys\n- 30-day TTL for entity extraction\n- Skip cache for user-facing queries (freshness matters)\n\n### 4. Circuit Breakers\nWhen all endpoints are overloaded:\n- Queue requests with timeout\n- Return degraded response (\"try again later\")\n- Prevent cascade failures\n\n## Results from Production\n- **4x capacity** (240 → 960 req/min)\n- **<1% throttling** (down from 15%)\n- **<10 second** response time\n- **Automatic failover** with no user impact",
        bulletPoints: [
          'Multi-region deployment for 4x capacity',
          'Custom load balancer with rate tracking',
          'Health checks and automatic failover',
          'Caching to reduce LLM calls',
          'Circuit breakers for graceful degradation',
        ],
      },
      followUps: [
        {
          question: 'How do you handle the cold start problem when endpoints come back online?',
          likelihood: 'medium',
          suggestedAnswer: 'Gradual ramp-up: when endpoint recovers, start with 10% traffic and increase over 5 minutes. Monitor error rates before full traffic restoration.',
          keyPoints: ['Gradual ramp-up', 'Error monitoring', 'Traffic percentage'],
        },
      ],
      metadata: { difficulty: 'senior', tags: ['system-design', 'rate-limiting', 'load-balancing', 'llm'] },
      usedInInterviews: [],
      timesUsed: 0,
      practiceCount: 0,
      createdAt: now,
      updatedAt: now,
      profileId,
    },

    // Answer 8: Explain GraphRAG
    {
      id: generateId(),
      question: 'Explain GraphRAG and how it differs from traditional RAG',
      questionType: 'conceptual',
      format: {
        type: 'Explain-Example-Tradeoffs',
        sections: [
          { label: 'Explain', content: 'GraphRAG builds a knowledge graph from documents, enabling relationship-aware retrieval.' },
          { label: 'Example', content: 'Query about threat actor networks retrieves connected entities, not just similar documents.' },
          { label: 'Tradeoffs', content: 'Higher accuracy for relationship queries, but more expensive and complex to build.' },
        ],
      },
      sources: { storyIds: storyIds.slice(0, 1), profileSections: ['activeProjects'], synthesized: false },
      answer: {
        structured: [
          { label: 'What is GraphRAG?', content: 'GraphRAG extends traditional RAG by building a knowledge graph from documents. Instead of just storing document chunks as vectors, it extracts entities and relationships, enabling queries that understand connections across the entire corpus.' },
          { label: 'How it Differs', content: 'Traditional RAG: Query → Vector search → Similar chunks → LLM generation. GraphRAG: Query → Vector search + Graph traversal → Chunks + Related entities + Relationships → LLM generation with full context.' },
          { label: 'Example', content: "Query: 'What organizations has APT28 targeted?' Traditional RAG might miss documents using alias 'Fancy Bear'. GraphRAG finds APT28, traverses 'targets' relationships, returns all connected organizations regardless of naming." },
          { label: 'Tradeoffs', content: 'Pros: Better for relationship queries, theme analysis, corpus-wide patterns. Cons: Higher cost (entity extraction), more complex pipeline, requires domain expertise for entity types.' },
        ],
        narrative: "**GraphRAG** is an evolution of traditional RAG that builds a **knowledge graph** from your documents, enabling queries that understand relationships across the entire corpus.\n\n## Traditional RAG\n\n```\nQuery → Vector Search → Top-K Similar Chunks → LLM Generation\n```\n\nLimitations:\n- Only finds documents similar to the query\n- Misses related information in dissimilar documents\n- Can't answer \"who is connected to whom?\"\n\n## GraphRAG\n\n```\nQuery → Vector Search + Graph Traversal → Chunks + Entities + Relationships → LLM Generation\n```\n\n**Key difference**: Before query time, GraphRAG:\n1. **Extracts entities** (people, organizations, concepts) from all documents\n2. **Maps relationships** between entities\n3. **Clusters into communities** (themes, topics)\n\n## Concrete Example\n\n**Query**: \"What organizations has APT28 targeted?\"\n\n**Traditional RAG**: Searches for chunks containing \"APT28\" and \"targeted.\" Might miss documents that use the alias \"Fancy Bear.\"\n\n**GraphRAG**: \n1. Finds \"APT28\" entity (knows it's the same as \"Fancy Bear\")\n2. Traverses all \"targets\" relationships\n3. Returns connected organization entities with evidence\n4. Synthesizes comprehensive answer across multiple sources\n\n## Tradeoffs\n\n| Aspect | Traditional RAG | GraphRAG |\n|--------|-----------------|----------|\n| Setup cost | Low | High (entity extraction) |\n| Query types | Similarity-based | Similarity + Relationships |\n| Best for | Q&A on single topics | Cross-document analysis |\n| Maintenance | Simple | Complex (graph updates) |",
        bulletPoints: [
          'Builds knowledge graph from documents',
          'Extracts entities and relationships before query time',
          'Enables relationship-aware queries across corpus',
          'Best for cross-document analysis and theme-based retrieval',
        ],
      },
      followUps: [
        {
          question: 'When would you choose traditional RAG over GraphRAG?',
          likelihood: 'high',
          suggestedAnswer: 'When relationships between entities aren\'t important, when documents are independent, when budget is limited, or when real-time indexing is required. GraphRAG adds value for corpus-wide analysis.',
          keyPoints: ['Independent documents', 'Budget constraints', 'Real-time requirements'],
        },
      ],
      metadata: { difficulty: 'senior', tags: ['graphrag', 'rag', 'ai', 'architecture', 'conceptual'] },
      usedInInterviews: [],
      timesUsed: 0,
      practiceCount: 0,
      createdAt: now,
      updatedAt: now,
      profileId,
    },

    // Answer 9: Prompt Engineering Approach
    {
      id: generateId(),
      question: 'How do you approach prompt engineering for domain-specific tasks?',
      questionType: 'conceptual',
      format: {
        type: 'Explain-Example-Tradeoffs',
        sections: [
          { label: 'Explain', content: 'Systematic approach: baseline, domain analysis, few-shot examples, iteration with evaluation.' },
          { label: 'Example', content: 'Entity extraction improved from 70% to 92% through domain-specific types, few-shot examples, and confidence scoring.' },
          { label: 'Tradeoffs', content: 'More examples = better accuracy but higher token cost. Domain-specific = better quality but less generalizable.' },
        ],
      },
      sources: { storyIds: storyIds.slice(2, 3), profileSections: ['activeProjects'], synthesized: false },
      answer: {
        structured: [
          { label: 'My Approach', content: '1) Establish baseline with generic prompts, 2) Analyze failure modes, 3) Define domain-specific constraints, 4) Add few-shot examples from real data, 5) Iterate with quantitative evaluation, 6) Add confidence scoring for production.' },
          { label: 'Key Principles', content: 'Be explicit about output format. Use domain terminology. Provide examples of edge cases. Tell the model what NOT to do. Include confidence/certainty indicators.' },
          { label: 'Example: Entity Extraction', content: 'Started at 70% accuracy with generic prompts. Defined 6 domain-specific entity types. Added 20 few-shot examples from real reports. Explicit instructions to ignore generic mentions. Result: 92% accuracy.' },
          { label: 'Evaluation', content: 'Create labeled evaluation dataset. Measure precision/recall. Track common failure modes. A/B test prompt variations systematically.' },
        ],
        narrative: "I take a **systematic, evidence-based approach** to prompt engineering for domain-specific tasks.\n\n## My Framework\n\n### 1. Establish Baseline\n- Start with a generic prompt\n- Measure performance quantitatively\n- Creates comparison point for improvements\n\n### 2. Analyze Failure Modes\n- What's the model getting wrong?\n- Categories: wrong type, missed entity, hallucination, format errors\n- Prioritize by frequency and impact\n\n### 3. Define Domain Constraints\n- What entity types matter for this domain?\n- What should be ignored?\n- What format is required?\n\n### 4. Add Few-Shot Examples\n- Select examples that cover:\n  - Common cases\n  - Edge cases\n  - What NOT to extract\n- 5-20 examples is typically optimal\n\n### 5. Iterate with Evaluation\n- Create labeled test dataset (500+ examples)\n- Measure precision/recall after each change\n- A/B test prompt variations\n\n### 6. Add Confidence Scoring\n- Model indicates certainty (High/Medium/Low)\n- Filter uncertain extractions in production\n- Enables precision/recall tradeoff\n\n## Concrete Example: Threat Intelligence Entity Extraction\n\n**Before** (generic prompt): 70% accuracy\n\n**Changes made**:\n- Defined 6 entity types: threat_actor, malware, vulnerability, target_organization, infrastructure, technique\n- Added 20 few-shot examples from real MTAC reports\n- Explicit instruction: \"Ignore generic mentions like 'hackers' or 'the company'\"\n- Added confidence scoring: High/Medium/Low\n\n**After**: 92% accuracy (22-point improvement)\n\n## Key Learnings\n\n1. **Generic prompts rarely work** for specialized domains\n2. **Few-shot examples** are more valuable than lengthy instructions\n3. **Evaluation datasets** are essential - you can't improve what you don't measure\n4. **Negative examples** (what not to do) are often more valuable than positive ones",
        bulletPoints: [
          'Systematic: baseline → analysis → iteration → evaluation',
          'Domain-specific entity types and terminology',
          'Few-shot examples from real data (5-20)',
          'Explicit about what NOT to do',
          'Quantitative evaluation with labeled dataset',
        ],
      },
      followUps: [
        {
          question: 'How do you handle prompt drift as the model updates?',
          likelihood: 'medium',
          suggestedAnswer: 'Version-control prompts alongside code. Run evaluation suite after model updates. Monitor production accuracy metrics. Have rollback plan for prompt versions.',
          keyPoints: ['Version control', 'Automated evaluation', 'Production monitoring'],
        },
      ],
      metadata: { difficulty: 'senior', tags: ['prompt-engineering', 'ai', 'llm', 'methodology'] },
      usedInInterviews: [],
      timesUsed: 0,
      practiceCount: 0,
      createdAt: now,
      updatedAt: now,
      profileId,
    },

    // Answer 10: Measuring AI System Success
    {
      id: generateId(),
      question: 'How do you measure success for AI/ML systems in production?',
      questionType: 'conceptual',
      format: {
        type: 'Explain-Example-Tradeoffs',
        sections: [
          { label: 'Explain', content: 'Multi-dimensional: accuracy metrics, user satisfaction, business impact, operational health.' },
          { label: 'Example', content: 'MTAC: 94% citation accuracy (quality), 87% satisfaction (user), 50% time savings (business), 99.8% uptime (ops).' },
          { label: 'Tradeoffs', content: 'More metrics = better understanding but harder to optimize. Leading vs lagging indicators.' },
        ],
      },
      sources: { storyIds: [storyIds[0], storyIds[11]], profileSections: ['activeProjects'], synthesized: true },
      answer: {
        structured: [
          { label: 'Metric Categories', content: '1) Quality Metrics: accuracy, precision/recall, citation accuracy; 2) User Metrics: satisfaction, adoption, time savings; 3) Business Metrics: productivity gain, cost reduction; 4) Operational Metrics: uptime, latency, error rates.' },
          { label: 'Leading vs Lagging', content: 'Leading (predict success): query quality scores, time-to-first-value. Lagging (confirm success): user satisfaction surveys, adoption rates.' },
          { label: 'Example from MTAC', content: 'Quality: 94% citation accuracy, 92% entity extraction. User: 87% satisfaction, daily adoption. Business: 50% reduction in report time. Ops: 99.8% uptime, <10s latency.' },
          { label: 'Implementation', content: 'Dashboards with real-time metrics. Weekly reviews of trends. Alerts for degradation. Quarterly user surveys.' },
        ],
        narrative: "I measure AI system success across **four dimensions**: quality, user, business, and operational metrics.\n\n## 1. Quality Metrics (Is the AI accurate?)\n\n- **Accuracy/Precision/Recall**: Core ML metrics\n- **Citation accuracy**: % of claims traceable to sources\n- **Hallucination rate**: % of false information\n- **Format compliance**: Does output match expected schema?\n\n**Example from MTAC**:\n- 94% citation accuracy\n- 92% entity extraction accuracy\n- <5% hallucination rate (detected via citation validation)\n\n## 2. User Metrics (Do users like it?)\n\n- **Satisfaction surveys**: Post-launch NPS or CSAT\n- **Adoption rate**: Daily/weekly active users\n- **Feature usage**: Which features get used?\n- **Support tickets**: Problems users encounter\n\n**Example from MTAC**:\n- 87% user satisfaction\n- Daily usage by all MTAC teams\n- Entity merge UI used 50+ times/week\n\n## 3. Business Metrics (Does it create value?)\n\n- **Time savings**: Hours saved per task\n- **Productivity gain**: Tasks completed per period\n- **Cost impact**: Revenue generated or costs avoided\n- **Competitive advantage**: Market differentiation\n\n**Example from MTAC**:\n- 50% reduction in time spent on weekly roundups\n- Analysts can cover 2x more documents\n\n## 4. Operational Metrics (Is it reliable?)\n\n- **Uptime/availability**: % of time system is accessible\n- **Latency**: Response time percentiles (p50, p95, p99)\n- **Error rates**: Failed requests\n- **Cost efficiency**: Cost per query\n\n**Example from MTAC**:\n- 99.8% API uptime\n- <10 second response time\n- $1,200/day API costs (40% optimized)\n\n## Implementation\n\n- **Dashboards**: Real-time visibility into all metrics\n- **Alerts**: Automated notification when metrics degrade\n- **Weekly reviews**: Trend analysis with team\n- **Quarterly surveys**: User satisfaction checks",
        bulletPoints: [
          'Quality: accuracy, precision/recall, hallucination rate',
          'User: satisfaction, adoption, feature usage',
          'Business: time savings, productivity, cost impact',
          'Operational: uptime, latency, error rates',
        ],
      },
      followUps: [
        {
          question: 'How do you handle conflicting metrics?',
          likelihood: 'medium',
          suggestedAnswer: 'Prioritize based on business goals. Often quality → user → business → ops. Example: improving accuracy might slow response time - acceptable if accuracy is the priority.',
          keyPoints: ['Goal-based prioritization', 'Explicit tradeoffs', 'Stakeholder alignment'],
        },
      ],
      metadata: { difficulty: 'senior', tags: ['metrics', 'ai', 'production', 'measurement'] },
      usedInInterviews: [],
      timesUsed: 0,
      practiceCount: 0,
      createdAt: now,
      updatedAt: now,
      profileId,
    },
  ];
}

// ============================================
// IMPORT FUNCTIONS
// ============================================

export interface ImportResult {
  success: boolean;
  profileId: string;
  project: Project;
  storiesCount: number;
  answersCount: number;
  storyIds: string[];
  answerIds: string[];
  error?: string;
}

/**
 * Find the "Full Stack Focus" profile or create one if it doesn't exist.
 */
export function findOrCreateFullStackProfile(): string {
  const profileStore = useProfileStore.getState();
  const profiles = profileStore.profiles;

  // Find existing "Full Stack Focus" profile
  const fullStackProfile = profiles.find(
    p => p.metadata.name.toLowerCase().includes('full stack')
  );

  if (fullStackProfile) {
    return fullStackProfile.metadata.id;
  }

  // Fall back to active profile
  const activeProfile = profileStore.getActiveProfile();
  if (activeProfile) {
    return activeProfile.metadata.id;
  }

  // Create new profile if none exists
  return profileStore.createProfile('Full Stack Focus');
}

/**
 * Import the MTAC project, stories, and answers to a specific profile.
 */
export function importMTACProject(profileId: string): ImportResult {
  try {
    const profileStore = useProfileStore.getState();
    const storiesStore = useStoriesStore.getState();
    const answersStore = useTechnicalAnswersStore.getState();

    // 1. Switch to the target profile
    profileStore.switchProfile(profileId);

    // 2. Add the project
    const projectWithDocs = {
      ...MTAC_PROJECT,
      documentation: MTAC_DOCUMENTATION,
    };
    profileStore.addProject(projectWithDocs);

    // 3. Create and import stories
    const stories = createStories(profileId);
    storiesStore.importStories(stories);
    const storyIds = stories.map(s => s.id);

    // 4. Create and import technical answers
    const answers = createTechnicalAnswers(profileId, storyIds);
    answersStore.importAnswers(answers);
    const answerIds = answers.map(a => a.id);

    return {
      success: true,
      profileId,
      project: projectWithDocs,
      storiesCount: stories.length,
      answersCount: answers.length,
      storyIds,
      answerIds,
    };
  } catch (error) {
    return {
      success: false,
      profileId,
      project: MTAC_PROJECT,
      storiesCount: 0,
      answersCount: 0,
      storyIds: [],
      answerIds: [],
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Import MTAC project to the "Full Stack Focus" profile (or active profile).
 */
export function importMTACProjectToFullStack(): ImportResult {
  const profileId = findOrCreateFullStackProfile();
  return importMTACProject(profileId);
}

const MTAC_MIGRATION_KEY = 'jhq_mtac_project_imported';

/**
 * Migration function - runs once on app startup to import MTAC project.
 * Checks localStorage to avoid duplicate imports.
 */
export function migrateMTACProject(): void {
  // Check if already migrated
  if (typeof window === 'undefined') return;

  const alreadyMigrated = localStorage.getItem(MTAC_MIGRATION_KEY);
  if (alreadyMigrated) {
    console.log('[MTAC Migration] Already imported, skipping');
    return;
  }

  // Check if MTAC project already exists in any profile
  const profileStore = useProfileStore.getState();
  const profiles = profileStore.profiles;

  const mtacExists = profiles.some(profile =>
    profile.activeProjects.some(p =>
      p.name.toLowerCase().includes('mtac') ||
      p.name.toLowerCase().includes('intelligence copilot')
    )
  );

  if (mtacExists) {
    console.log('[MTAC Migration] Project already exists in a profile, marking as migrated');
    localStorage.setItem(MTAC_MIGRATION_KEY, new Date().toISOString());
    return;
  }

  // Run the import
  console.log('[MTAC Migration] Importing MTAC Intelligence Copilot project...');
  const result = importMTACProjectToFullStack();

  if (result.success) {
    localStorage.setItem(MTAC_MIGRATION_KEY, new Date().toISOString());
    console.log('[MTAC Migration] Success!', {
      profileId: result.profileId,
      storiesCount: result.storiesCount,
      answersCount: result.answersCount,
    });
  } else {
    console.error('[MTAC Migration] Failed:', result.error);
  }
}

// Export for browser console usage
if (typeof window !== 'undefined') {
  (window as unknown as Record<string, unknown>).importMTACProject = importMTACProject;
  (window as unknown as Record<string, unknown>).importMTACProjectToFullStack = importMTACProjectToFullStack;
  (window as unknown as Record<string, unknown>).findOrCreateFullStackProfile = findOrCreateFullStackProfile;
  (window as unknown as Record<string, unknown>).migrateMTACProject = migrateMTACProject;
}
