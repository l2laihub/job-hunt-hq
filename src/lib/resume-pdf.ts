/**
 * Resume PDF Generation Utilities
 *
 * Generates professional PDF resumes using browser print functionality.
 * Creates a styled HTML document and triggers print-to-PDF.
 */

import type { EnhancedProfile, EnhancedRole, ResumeAnalysis, UserProfile, SkillGroup } from '@/src/types';

/**
 * Parse a duration string and extract the end date for sorting
 * Handles formats like:
 * - "2023 - February 2025"
 * - "March 2025 - Present"
 * - "2018 - 2023"
 * - "January 2020 - December 2022"
 */
function parseDurationEndDate(duration: string): Date {
  const now = new Date();
  const normalizedDuration = duration.toLowerCase();

  // Check for "present" or "current" - this is the most recent
  if (normalizedDuration.includes('present') || normalizedDuration.includes('current')) {
    return now;
  }

  // Split by " - " or "-" to get end date portion
  const parts = duration.split(/\s*[-–]\s*/);
  const endPart = parts.length > 1 ? parts[1].trim() : parts[0].trim();

  // Month name mapping
  const months: Record<string, number> = {
    january: 0, jan: 0,
    february: 1, feb: 1,
    march: 2, mar: 2,
    april: 3, apr: 3,
    may: 4,
    june: 5, jun: 5,
    july: 6, jul: 6,
    august: 7, aug: 7,
    september: 8, sep: 8, sept: 8,
    october: 9, oct: 9,
    november: 10, nov: 10,
    december: 11, dec: 11,
  };

  // Try to parse "Month Year" format (e.g., "February 2025")
  const monthYearMatch = endPart.match(/([a-zA-Z]+)\s+(\d{4})/);
  if (monthYearMatch) {
    const month = months[monthYearMatch[1].toLowerCase()];
    const year = parseInt(monthYearMatch[2], 10);
    if (month !== undefined && !isNaN(year)) {
      return new Date(year, month, 1);
    }
  }

  // Try to parse just year (e.g., "2023")
  const yearMatch = endPart.match(/(\d{4})/);
  if (yearMatch) {
    const year = parseInt(yearMatch[1], 10);
    return new Date(year, 11, 31); // End of year
  }

  // Fallback to very old date for unparseable durations
  return new Date(1970, 0, 1);
}

/**
 * Sort roles by end date (most recent first)
 */
function sortRolesByDate<T extends { duration: string }>(roles: T[]): T[] {
  return [...roles].sort((a, b) => {
    const dateA = parseDurationEndDate(a.duration);
    const dateB = parseDurationEndDate(b.duration);
    // Sort descending (most recent first)
    return dateB.getTime() - dateA.getTime();
  });
}

interface ResumePDFOptions {
  enhanced: EnhancedProfile;
  profile: UserProfile;
  analysis?: ResumeAnalysis;
  jobInfo?: {
    company?: string;
    role?: string;
  };
  template?: 'professional' | 'modern' | 'minimal' | 'executive';
  includeScores?: boolean;
  /** Job-specific skill groups for PDF export (overrides profile.skillGroups) */
  jobSkillGroups?: SkillGroup[];
}

// Professional color schemes for different templates
const templates = {
  professional: {
    primary: '#1a365d',
    secondary: '#2d3748',
    accent: '#3182ce',
    background: '#ffffff',
    text: '#1a202c',
    muted: '#718096',
    border: '#e2e8f0',
  },
  modern: {
    primary: '#0d9488',
    secondary: '#115e59',
    accent: '#14b8a6',
    background: '#ffffff',
    text: '#1f2937',
    muted: '#6b7280',
    border: '#e5e7eb',
  },
  minimal: {
    primary: '#18181b',
    secondary: '#3f3f46',
    accent: '#52525b',
    background: '#ffffff',
    text: '#18181b',
    muted: '#71717a',
    border: '#e4e4e7',
  },
  executive: {
    primary: '#0f172a',
    secondary: '#334155',
    accent: '#0369a1',
    background: '#ffffff',
    text: '#1e293b',
    muted: '#64748b',
    border: '#cbd5e1',
    headerBg: '#f8fafc',
  },
};

/**
 * Generate executive template HTML - premium layout with improved visual hierarchy
 */
function generateExecutiveHTML(options: ResumePDFOptions): string {
  const { enhanced, profile, analysis, jobInfo, includeScores = false, jobSkillGroups } = options;
  const colors = templates.executive;

  const sanitize = (str: string) => str.replace(/[^a-zA-Z0-9\s-]/g, '').trim();
  const datePart = new Date().toISOString().split('T')[0];
  const namePart = sanitize(profile.name || 'Resume');

  let pdfTitle: string;
  if (jobInfo?.company && jobInfo?.role) {
    pdfTitle = `${namePart} - ${sanitize(jobInfo.company)} ${sanitize(jobInfo.role)} - ${datePart}`;
  } else if (jobInfo?.company) {
    pdfTitle = `${namePart} - ${sanitize(jobInfo.company)} - ${datePart}`;
  } else {
    pdfTitle = `${namePart} - Resume - ${datePart}`;
  }

  // Group technical skills by category for better organization
  // Uses dynamic categorization based on actual skill content
  const categorizeSkills = (skills: string[]): Record<string, string[]> => {
    // Define patterns for various professional domains
    const allPatterns: Record<string, { pattern: RegExp; priority: number }> = {
      // Software Engineering / Tech
      'Languages & Frameworks': {
        pattern: /^(react|angular|vue|next\.?js|node\.?js|python|typescript|javascript|java|c#|c\+\+|go|golang|rust|ruby|php|swift|kotlin|flutter|\.net|express|fastapi|flask|django|spring|laravel|rails|svelte|nuxt)$/i,
        priority: 1
      },
      'Cloud & Infrastructure': {
        pattern: /aws|azure|gcp|google cloud|docker|kubernetes|k8s|terraform|jenkins|ci\/cd|github actions|vercel|netlify|heroku|microservices|api gateway|serverless|devops|linux|unix/i,
        priority: 2
      },
      'AI & Machine Learning': {
        pattern: /\b(ai|ml|machine learning|deep learning|llm|gpt|gemini|claude|langchain|tensorflow|pytorch|openai|anthropic|rag|graphrag|nlp|computer vision|mediapipe|neural network|data science)\b/i,
        priority: 2
      },
      'Databases': {
        pattern: /\b(sql|postgres|mysql|mongodb|redis|dynamodb|cosmos|supabase|firebase|elasticsearch|neo4j|graphql|oracle|sqlite|mariadb|cassandra)\b/i,
        priority: 2
      },

      // Property Management / Real Estate
      'Property Management': {
        pattern: /property|tenant|lease|landlord|hoa|maintenance|housing|apartment|residential|commercial property|real estate|occupancy|eviction|rent collection|move-in|move-out/i,
        priority: 1
      },
      'Compliance & Regulations': {
        pattern: /compliance|hud|fair housing|regulatory|ada|osha|building code|inspection|audit|certification|licensing|legal|policy|standards|guidelines/i,
        priority: 2
      },
      'Property Software': {
        pattern: /appfolio|yardi|buildium|propertyware|rentmanager|mri software|realpage|costar|zillow|redfin/i,
        priority: 1
      },

      // Administrative / Office
      'Office Administration': {
        pattern: /administrative|office management|clerical|receptionist|front desk|scheduling|calendar|correspondence|filing|data entry|typing|transcription/i,
        priority: 2
      },
      'Document Management': {
        pattern: /document|records management|file management|archiving|documentation|paperwork|forms|templates|digital filing|scanning/i,
        priority: 2
      },

      // Finance / Accounting
      'Financial Management': {
        pattern: /budget|accounting|financial|bookkeeping|payroll|invoicing|billing|accounts payable|accounts receivable|fiscal|revenue|expenses|forecasting|p&l/i,
        priority: 2
      },

      // Healthcare
      'Healthcare & Medical': {
        pattern: /healthcare|medical|clinical|patient|hipaa|ehr|emr|nursing|pharmacy|diagnosis|treatment|hospital|clinic/i,
        priority: 1
      },

      // Sales / Marketing
      'Sales & Marketing': {
        pattern: /sales|marketing|crm|lead generation|pipeline|prospecting|cold calling|negotiation|closing|b2b|b2c|advertising|branding|seo|sem|social media marketing/i,
        priority: 2
      },

      // Project Management
      'Project Management': {
        pattern: /project management|agile|scrum|kanban|waterfall|pmp|prince2|stakeholder|milestone|deliverable|sprint|backlog|jira|asana|trello|monday\.com/i,
        priority: 2
      },

      // Communication & Leadership
      'Communication': {
        pattern: /communication|presentation|public speaking|writing|negotiation|conflict resolution|interpersonal|collaboration|teamwork/i,
        priority: 3
      },
      'Leadership & Management': {
        pattern: /leadership|management|supervision|team lead|mentoring|coaching|performance review|hiring|training|delegation|strategic planning/i,
        priority: 3
      },

      // Software Tools (General)
      'Software & Tools': {
        pattern: /microsoft office|excel|word|powerpoint|outlook|google workspace|google docs|google sheets|slack|zoom|teams|salesforce|hubspot|quickbooks|sap|erp/i,
        priority: 3
      },

      // Operations
      'Operations': {
        pattern: /operations|logistics|supply chain|inventory|procurement|vendor|workflow|process improvement|efficiency|quality control|kpi|metrics/i,
        priority: 2
      },

      // Customer Service
      'Customer Service': {
        pattern: /customer service|client relations|support|help desk|satisfaction|retention|complaint|resolution|service delivery/i,
        priority: 2
      },
    };

    // First pass: categorize skills and track which categories are used
    const skillAssignments: { skill: string; category: string; priority: number }[] = [];
    const uncategorized: string[] = [];

    skills.forEach(skill => {
      let bestMatch: { category: string; priority: number } | null = null;

      for (const [category, { pattern, priority }] of Object.entries(allPatterns)) {
        if (pattern.test(skill)) {
          if (!bestMatch || priority < bestMatch.priority) {
            bestMatch = { category, priority };
          }
        }
      }

      if (bestMatch) {
        skillAssignments.push({ skill, category: bestMatch.category, priority: bestMatch.priority });
      } else {
        uncategorized.push(skill);
      }
    });

    // Build the result with only categories that have skills
    const result: Record<string, string[]> = {};

    // Group assigned skills by category
    skillAssignments.forEach(({ skill, category }) => {
      if (!result[category]) {
        result[category] = [];
      }
      result[category].push(skill);
    });

    // Handle uncategorized skills
    if (uncategorized.length > 0) {
      // If we have very few categorized skills, just use "Core Skills" for everything
      const totalCategorized = Object.values(result).flat().length;
      if (totalCategorized < 3 && uncategorized.length > totalCategorized) {
        // Most skills are uncategorized - use a simple flat structure
        result['Core Competencies'] = [...Object.values(result).flat(), ...uncategorized];
        // Clear other categories
        for (const key of Object.keys(result)) {
          if (key !== 'Core Competencies') {
            delete result[key];
          }
        }
      } else {
        // Add uncategorized to "Additional Skills" or similar
        result['Additional Skills'] = uncategorized;
      }
    }

    // Sort categories by number of skills (descending) for better visual presentation
    const sortedEntries = Object.entries(result)
      .filter(([_, categorySkills]) => categorySkills.length > 0)
      .sort((a, b) => b[1].length - a[1].length);

    return Object.fromEntries(sortedEntries);
  };

  // Convert user-defined SkillGroups to the format used for rendering
  const userGroupsToCategories = (groups: SkillGroup[]): Record<string, string[]> => {
    if (!groups || groups.length === 0) return {};

    // Sort by order and convert to Record format
    const sorted = [...groups].sort((a, b) => a.order - b.order);
    return Object.fromEntries(
      sorted.map(g => [g.name, g.skills]).filter(([_, skills]) => skills.length > 0)
    );
  };

  // Priority: jobSkillGroups > profile.skillGroups > auto-categorize
  // jobSkillGroups are job-specific skill arrangements that don't modify the profile
  const skillGroupsToUse = jobSkillGroups && jobSkillGroups.length > 0
    ? jobSkillGroups
    : profile.skillGroups;

  const userDefinedCategories = skillGroupsToUse && skillGroupsToUse.length > 0
    ? userGroupsToCategories(skillGroupsToUse)
    : null;

  // If user has defined groups, use them. Otherwise fall back to auto-categorization.
  // Also include any uncategorized skills in an "Additional Skills" group
  let technicalCategories: Record<string, string[]>;

  if (userDefinedCategories && Object.keys(userDefinedCategories).length > 0) {
    technicalCategories = userDefinedCategories;

    // Find skills not in any user group and add them as "Additional Skills"
    const categorizedSkills = new Set(Object.values(userDefinedCategories).flat());
    const uncategorized = enhanced.technicalSkills.filter(s => !categorizedSkills.has(s));

    if (uncategorized.length > 0) {
      technicalCategories['Additional Skills'] = uncategorized;
    }
  } else {
    // Fall back to auto-categorization
    technicalCategories = categorizeSkills(enhanced.technicalSkills);
  }

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${pdfTitle}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Merriweather:wght@700&display=swap');

    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    @page {
      size: letter;
      margin: 0.4in 0.5in;
    }

    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      font-size: 10.5pt;
      line-height: 1.55;
      color: ${colors.text};
      background: ${colors.background};
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
      font-feature-settings: 'kern' 1, 'liga' 1;
      -webkit-font-smoothing: antialiased;
    }

    .container {
      max-width: 8.5in;
      margin: 0 auto;
    }

    /* Executive Header */
    .header {
      text-align: center;
      padding: 0 0 14px 0;
      margin-bottom: 14px;
    }

    .name {
      font-family: 'Merriweather', Georgia, serif;
      font-size: 26pt;
      font-weight: 700;
      color: ${colors.primary};
      letter-spacing: -0.5px;
      margin-bottom: 6px;
    }

    .headline-container {
      background: linear-gradient(90deg, ${colors.accent}15, ${colors.accent}08);
      border-left: 3px solid ${colors.accent};
      padding: 8px 16px;
      margin: 10px auto;
      max-width: 90%;
    }

    .headline {
      font-size: 11.5pt;
      font-weight: 500;
      color: ${colors.secondary};
      line-height: 1.45;
      letter-spacing: -0.1px;
    }

    .contact-row {
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 20px;
      margin-top: 10px;
      font-size: 10pt;
      color: ${colors.muted};
    }

    .contact-item {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .contact-icon {
      width: 16px;
      height: 16px;
      fill: ${colors.accent};
      flex-shrink: 0;
    }

    .contact-link,
    .contact-link:link,
    .contact-link:visited,
    .contact-link:hover,
    .contact-link:active {
      color: ${colors.accent} !important;
      text-decoration: none !important;
      background: transparent !important;
      border: none !important;
    }

    /* Score badges */
    .scores-row {
      display: flex;
      justify-content: center;
      gap: 24px;
      margin-top: 12px;
      padding-top: 10px;
      border-top: 1px solid ${colors.border};
    }

    .score-badge {
      display: flex;
      align-items: center;
      gap: 6px;
      background: ${colors.accent}10;
      padding: 4px 12px;
      border-radius: 20px;
    }

    .score-value {
      font-size: 14pt;
      font-weight: 700;
      color: ${colors.accent};
    }

    .score-label {
      font-size: 9pt;
      color: ${colors.muted};
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }

    /* Summary */
    .summary {
      background: ${colors.headerBg};
      padding: 12px 16px;
      border-radius: 4px;
      margin-bottom: 16px;
      border: 1px solid ${colors.border};
    }

    .summary p {
      font-size: 10.5pt;
      color: ${colors.secondary};
      line-height: 1.6;
      font-style: italic;
    }

    /* Section styling */
    .section {
      margin-bottom: 14px;
    }

    .section-header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 10px;
      padding-bottom: 6px;
      border-bottom: 2px solid ${colors.primary};
    }

    .section-icon {
      width: 16px;
      height: 16px;
      fill: ${colors.accent};
    }

    .section-title {
      font-size: 11pt;
      font-weight: 700;
      color: ${colors.primary};
      text-transform: uppercase;
      letter-spacing: 1.2px;
    }

    /* Skills - Ultra-compact multi-column inline layout */
    .skills-container {
      column-count: 2;
      column-gap: 24px;
      column-fill: balance;
    }

    .skill-category {
      break-inside: avoid;
      page-break-inside: avoid;
      margin-bottom: 5px;
      line-height: 1.4;
    }

    .skill-category-name {
      font-size: 9pt;
      font-weight: 600;
      color: ${colors.accent};
      display: inline;
    }

    .skill-category-name::after {
      content: ": ";
    }

    .skill-list {
      display: inline;
    }

    .skill-tag {
      display: inline;
      font-size: 9pt;
      color: ${colors.secondary};
    }

    .skill-tag:not(:last-child)::after {
      content: " • ";
      color: ${colors.muted};
      font-size: 8pt;
    }

    .soft-skills-section {
      break-inside: avoid;
      page-break-inside: avoid;
      margin-top: 6px;
      padding-top: 6px;
      border-top: 1px solid ${colors.border};
    }

    .soft-skills-title {
      font-size: 9pt;
      font-weight: 600;
      color: ${colors.secondary};
      display: inline;
    }

    .soft-skills-title::after {
      content: ": ";
    }

    .soft-skill-list {
      display: inline;
    }

    .soft-skill-tag {
      display: inline;
      color: ${colors.muted};
      font-size: 9pt;
    }

    .soft-skill-tag:not(:last-child)::after {
      content: " • ";
      color: ${colors.border};
      font-size: 8pt;
    }

    /* Experience */
    .experience-item {
      margin-bottom: 12px;
      page-break-inside: auto;
    }

    .experience-header {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      margin-bottom: 2px;
      page-break-after: avoid;
    }

    .experience-title-row {
      display: flex;
      align-items: baseline;
      gap: 8px;
    }

    .experience-title {
      font-size: 11.5pt;
      font-weight: 600;
      color: ${colors.primary};
    }

    .experience-company {
      font-size: 10.5pt;
      color: ${colors.accent};
      font-weight: 500;
    }

    .experience-duration {
      font-size: 9.5pt;
      color: ${colors.muted};
      font-style: italic;
    }

    .experience-highlights {
      margin-top: 5px;
      padding-left: 16px;
      page-break-before: avoid;
    }

    .experience-highlights li {
      font-size: 10pt;
      color: ${colors.text};
      margin-bottom: 3px;
      line-height: 1.5;
    }

    .experience-highlights li::marker {
      color: ${colors.accent};
      font-size: 9pt;
    }

    /* Achievements */
    .achievements-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
    }

    .achievement-card {
      background: ${colors.headerBg};
      padding: 8px 10px;
      border-radius: 4px;
      border-left: 3px solid ${colors.accent};
    }

    .achievement-text {
      font-size: 9.5pt;
      color: ${colors.text};
      font-weight: 500;
      line-height: 1.45;
    }

    .achievement-metric {
      font-size: 9pt;
      color: ${colors.accent};
      font-weight: 600;
      margin-top: 2px;
    }

    /* Print optimizations */
    @media print {
      html, body {
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }

      /* Force link styling in print */
      a, a:link, a:visited, a:hover, a:active,
      .contact-link, .contact-link:link, .contact-link:visited {
        color: ${colors.accent} !important;
        text-decoration: none !important;
        background: transparent !important;
        -webkit-text-decoration: none !important;
      }

      .section {
        page-break-inside: auto;
      }

      .section-header {
        page-break-after: avoid;
      }

      .experience-item {
        page-break-inside: auto;
      }

      .achievement-card {
        page-break-inside: avoid;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <!-- Executive Header -->
    <header class="header">
      <h1 class="name">${profile.name}</h1>

      <div class="headline-container">
        <p class="headline">${enhanced.headline}</p>
      </div>

      ${profile.email || profile.phone ? `
      <div class="contact-row">
        ${profile.email ? `
        <div class="contact-item">
          <svg class="contact-icon" viewBox="0 0 24 24">
            <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
          </svg>
          <a href="mailto:${profile.email}" class="contact-link">${profile.email}</a>
        </div>
        ` : ''}
        ${profile.phone ? `
        <div class="contact-item">
          <svg class="contact-icon" viewBox="0 0 24 24">
            <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/>
          </svg>
          <span>${profile.phone}</span>
        </div>
        ` : ''}
      </div>
      ` : ''}

      ${includeScores && analysis ? `
      <div class="scores-row">
        <div class="score-badge">
          <span class="score-value">${analysis.overallScore}</span>
          <span class="score-label">Match</span>
        </div>
        <div class="score-badge">
          <span class="score-value">${analysis.atsScore}</span>
          <span class="score-label">ATS</span>
        </div>
      </div>
      ` : ''}
    </header>

    ${enhanced.summary ? `
    <!-- Summary -->
    <div class="summary">
      <p>${enhanced.summary}</p>
    </div>
    ` : ''}

    <!-- Skills -->
    <section class="section">
      <div class="section-header">
        <svg class="section-icon" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
        </svg>
        <h2 class="section-title">Skills & Expertise</h2>
      </div>
      <div class="skills-container">
        ${Object.entries(technicalCategories).map(([category, skills]) => `
        <div class="skill-category">
          <span class="skill-category-name">${category}</span><span class="skill-list">${skills.map(skill => `<span class="skill-tag">${skill}</span>`).join('')}</span>
        </div>
        `).join('')}
        ${enhanced.softSkills.length > 0 ? `
        <div class="soft-skills-section">
          <span class="soft-skills-title">Professional Skills</span><span class="soft-skill-list">${enhanced.softSkills.map(skill => `<span class="soft-skill-tag">${skill}</span>`).join('')}</span>
        </div>
        ` : ''}
      </div>
    </section>

    <!-- Experience -->
    <section class="section">
      <div class="section-header">
        <svg class="section-icon" viewBox="0 0 24 24" fill="currentColor">
          <path d="M20 6h-4V4c0-1.11-.89-2-2-2h-4c-1.11 0-2 .89-2 2v2H4c-1.11 0-1.99.89-1.99 2L2 19c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2zm-6 0h-4V4h4v2z"/>
        </svg>
        <h2 class="section-title">Professional Experience</h2>
      </div>
      ${sortRolesByDate(enhanced.recentRoles).map(role => `
      <div class="experience-item">
        <div class="experience-header">
          <div class="experience-title-row">
            <span class="experience-title">${role.title}</span>
            <span class="experience-company">${role.company}</span>
          </div>
          <span class="experience-duration">${role.duration}</span>
        </div>
        <ul class="experience-highlights">
          ${role.enhancedHighlights.map(h => `<li>${h}</li>`).join('')}
        </ul>
      </div>
      `).join('')}
    </section>

    ${enhanced.keyAchievements && enhanced.keyAchievements.length > 0 ? `
    <!-- Key Achievements -->
    <section class="section">
      <div class="section-header">
        <svg class="section-icon" viewBox="0 0 24 24" fill="currentColor">
          <path d="M19 5h-2V3H7v2H5c-1.1 0-2 .9-2 2v1c0 2.55 1.92 4.63 4.39 4.94.63 1.5 1.98 2.63 3.61 2.96V19H7v2h10v-2h-4v-3.1c1.63-.33 2.98-1.46 3.61-2.96C19.08 12.63 21 10.55 21 8V7c0-1.1-.9-2-2-2zM5 8V7h2v3.82C5.84 10.4 5 9.3 5 8zm14 0c0 1.3-.84 2.4-2 2.82V7h2v1z"/>
        </svg>
        <h2 class="section-title">Key Achievements</h2>
      </div>
      <div class="achievements-grid">
        ${enhanced.keyAchievements.map(a => `
        <div class="achievement-card">
          <div class="achievement-text">${a.description}</div>
          ${a.metrics ? `<div class="achievement-metric">${a.metrics}</div>` : ''}
        </div>
        `).join('')}
      </div>
    </section>
    ` : ''}

  </div>
</body>
</html>
`;
}

/**
 * Convert user-defined SkillGroups to Record format for rendering
 */
function skillGroupsToRecord(
  groups: SkillGroup[] | undefined,
  technicalSkills: string[]
): Record<string, string[]> | null {
  if (!groups || groups.length === 0) return null;

  // Sort by order and convert to Record format
  const sorted = [...groups].sort((a, b) => a.order - b.order);
  const result: Record<string, string[]> = {};

  for (const group of sorted) {
    if (group.skills.length > 0) {
      result[group.name] = group.skills;
    }
  }

  // Find skills not in any user group and add them as "Additional Skills"
  const categorizedSkills = new Set(Object.values(result).flat());
  const uncategorized = technicalSkills.filter(s => !categorizedSkills.has(s));

  if (uncategorized.length > 0) {
    result['Additional Skills'] = uncategorized;
  }

  return Object.keys(result).length > 0 ? result : null;
}

/**
 * Generate professional resume HTML for PDF export
 */
export function generateResumeHTML(options: ResumePDFOptions): string {
  const {
    enhanced,
    profile,
    analysis,
    jobInfo,
    template = 'professional',
    includeScores = false,
    jobSkillGroups,
  } = options;

  // Use executive template if selected
  if (template === 'executive') {
    return generateExecutiveHTML(options);
  }

  const colors = templates[template];

  // Build descriptive title for PDF filename
  const sanitize = (str: string) => str.replace(/[^a-zA-Z0-9\s-]/g, '').trim();
  const datePart = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  const namePart = sanitize(profile.name || 'Resume');

  let pdfTitle: string;
  if (jobInfo?.company && jobInfo?.role) {
    pdfTitle = `${namePart} - ${sanitize(jobInfo.company)} ${sanitize(jobInfo.role)} - ${datePart}`;
  } else if (jobInfo?.company) {
    pdfTitle = `${namePart} - ${sanitize(jobInfo.company)} - ${datePart}`;
  } else {
    pdfTitle = `${namePart} - Resume - ${datePart}`;
  }

  // Priority: jobSkillGroups > profile.skillGroups
  const skillGroupsToUse = jobSkillGroups && jobSkillGroups.length > 0
    ? jobSkillGroups
    : profile.skillGroups;

  // Get skill groups - use user-defined if available
  const skillCategories = skillGroupsToRecord(skillGroupsToUse, enhanced.technicalSkills);

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${pdfTitle}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    @page {
      size: letter;
      margin: 0.5in 0.6in;
      /* Remove browser headers/footers */
      margin-top: 0.5in;
      margin-bottom: 0.5in;
    }

    /* Hide browser-generated headers and footers */
    @page :first {
      margin-top: 0.5in;
    }

    @page :left {
      margin-left: 0.6in;
    }

    @page :right {
      margin-right: 0.6in;
    }

    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 10pt;
      line-height: 1.5;
      color: ${colors.text};
      background: ${colors.background};
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    .container {
      max-width: 8.5in;
      margin: 0 auto;
      padding: 0;
    }

    /* Header */
    .header {
      text-align: center;
      padding-bottom: 16px;
      margin-bottom: 16px;
      border-bottom: 2px solid ${colors.primary};
    }

    .name {
      font-size: 24pt;
      font-weight: 700;
      color: ${colors.primary};
      letter-spacing: -0.5px;
      margin-bottom: 4px;
    }

    .headline {
      font-size: 12pt;
      font-weight: 500;
      color: ${colors.secondary};
      margin-bottom: 8px;
    }

    .contact-row {
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 16px;
      margin-top: 6px;
      font-size: 9pt;
      color: ${colors.muted};
    }

    .contact-item {
      display: flex;
      align-items: center;
      gap: 5px;
    }

    .contact-icon {
      width: 16px;
      height: 16px;
      fill: ${colors.accent};
      flex-shrink: 0;
    }

    .contact-link,
    .contact-link:link,
    .contact-link:visited,
    .contact-link:hover,
    .contact-link:active {
      color: ${colors.accent} !important;
      text-decoration: none !important;
      background: transparent !important;
      border: none !important;
    }

    /* Score Badge */
    .score-section {
      display: flex;
      justify-content: center;
      gap: 24px;
      margin-top: 12px;
      padding-top: 12px;
      border-top: 1px solid ${colors.border};
    }

    .score-item {
      text-align: center;
    }

    .score-value {
      font-size: 16pt;
      font-weight: 700;
      color: ${colors.accent};
    }

    .score-label {
      font-size: 8pt;
      color: ${colors.muted};
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    /* Summary */
    .summary {
      background: ${colors.primary}08;
      padding: 12px 16px;
      border-radius: 6px;
      margin-bottom: 16px;
      border-left: 3px solid ${colors.primary};
    }

    .summary p {
      font-size: 10pt;
      color: ${colors.secondary};
      line-height: 1.6;
    }

    /* Sections */
    .section {
      margin-bottom: 16px;
    }

    .section-title {
      font-size: 11pt;
      font-weight: 700;
      color: ${colors.primary};
      text-transform: uppercase;
      letter-spacing: 1px;
      padding-bottom: 6px;
      border-bottom: 1px solid ${colors.border};
      margin-bottom: 10px;
    }

    /* Skills - Ultra-compact multi-column inline layout */
    .skills-compact {
      column-count: 2;
      column-gap: 20px;
      column-fill: balance;
    }

    .skills-category {
      break-inside: avoid;
      page-break-inside: avoid;
      margin-bottom: 4px;
      line-height: 1.4;
    }

    .skills-category-title {
      font-size: 8.5pt;
      font-weight: 600;
      color: ${colors.accent};
      display: inline;
    }

    .skills-category-title::after {
      content: ": ";
    }

    .skills-grid {
      display: inline;
    }

    .skill-tag {
      display: inline;
      font-size: 8.5pt;
      color: ${colors.secondary};
    }

    .skill-tag:not(:last-child)::after {
      content: " • ";
      color: ${colors.muted};
      font-size: 7pt;
    }

    /* Experience */
    .experience-item {
      margin-bottom: 14px;
      page-break-inside: auto;
      break-inside: auto;
    }

    /* Keep header and first bullet together, allow rest to break */
    .experience-header {
      page-break-after: avoid;
      break-after: avoid;
    }

    .experience-highlights {
      page-break-before: avoid;
      break-before: avoid;
    }

    .experience-highlights li:first-child {
      page-break-before: avoid;
      break-before: avoid;
    }

    .experience-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 4px;
    }

    .experience-title {
      font-size: 11pt;
      font-weight: 600;
      color: ${colors.text};
    }

    .experience-company {
      font-size: 10pt;
      color: ${colors.accent};
      font-weight: 500;
    }

    .experience-duration {
      font-size: 9pt;
      color: ${colors.muted};
      white-space: nowrap;
    }

    .experience-highlights {
      margin-top: 6px;
      padding-left: 16px;
    }

    .experience-highlights li {
      font-size: 9.5pt;
      color: ${colors.secondary};
      margin-bottom: 3px;
      position: relative;
    }

    .experience-highlights li::marker {
      color: ${colors.accent};
    }

    /* Achievements */
    .achievement-item {
      margin-bottom: 8px;
      padding-left: 16px;
      position: relative;
    }

    .achievement-item::before {
      content: "\\2022";
      color: ${colors.accent};
      font-weight: bold;
      position: absolute;
      left: 0;
    }

    .achievement-description {
      font-size: 9.5pt;
      font-weight: 500;
      color: ${colors.text};
    }

    .achievement-metrics {
      font-size: 9pt;
      color: ${colors.accent};
      font-weight: 500;
    }

    /* Two column layout for skills */
    .two-column {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
    }

    /* Footer */
    .footer {
      margin-top: 20px;
      padding-top: 12px;
      border-top: 1px solid ${colors.border};
      text-align: center;
      font-size: 8pt;
      color: ${colors.muted};
    }

    /* Print optimizations */
    @media print {
      html, body {
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }

      /* Force link styling in print */
      a, a:link, a:visited, a:hover, a:active,
      .contact-link, .contact-link:link, .contact-link:visited {
        color: ${colors.accent} !important;
        text-decoration: none !important;
        background: transparent !important;
        -webkit-text-decoration: none !important;
      }

      .container {
        padding: 0;
      }

      /* Allow sections to break across pages - only keep section titles with first item */
      .section {
        page-break-inside: auto;
        break-inside: auto;
      }

      .section-title {
        page-break-after: avoid;
        break-after: avoid;
      }

      /* Keep achievements together when small, allow break when many */
      .achievement-item {
        page-break-inside: avoid;
        break-inside: avoid;
      }

      /* Remove browser headers and footers */
      @page {
        margin: 0.5in;
      }

      /* Ensure no title/URL shows */
      title {
        display: none;
      }
    }

    /* Modern Template - Teal accent with clean cards */
    ${template === 'modern' ? `
    .header {
      background: linear-gradient(135deg, ${colors.primary}08, ${colors.accent}05);
      padding: 16px 20px;
      border-radius: 8px;
      border-bottom: none;
      margin-bottom: 16px;
    }

    .section-title {
      color: ${colors.primary};
      border-bottom-color: ${colors.accent};
      position: relative;
    }

    .section-title::after {
      content: "";
      position: absolute;
      bottom: -2px;
      left: 0;
      width: 40px;
      height: 2px;
      background: ${colors.accent};
    }

    .skill-tag {
      color: ${colors.primary};
    }

    .skill-tag:not(:last-child)::after {
      color: ${colors.accent};
    }

    .skills-category-title {
      color: ${colors.primary};
    }

    .experience-item {
      border-left: 2px solid ${colors.accent}30;
      padding-left: 12px;
      margin-left: 4px;
    }

    .summary {
      background: ${colors.accent}08;
      border-left-color: ${colors.accent};
      border-radius: 8px;
    }
    ` : ''}

    /* Minimal Template - Clean and basic */
    ${template === 'minimal' ? `
    .header {
      border-bottom: 1px solid ${colors.border};
      padding-bottom: 12px;
      margin-bottom: 14px;
    }

    .name {
      font-size: 20pt;
      font-weight: 600;
      letter-spacing: 0;
    }

    .headline {
      font-size: 10pt;
      font-weight: 400;
      color: ${colors.muted};
    }

    .contact-row {
      margin-top: 8px;
    }

    .contact-icon {
      display: none;
    }

    .contact-item {
      font-size: 9pt;
    }

    .contact-item::before {
      content: "•";
      margin-right: 6px;
      color: ${colors.muted};
    }

    .contact-item:first-child::before {
      display: none;
    }

    .summary {
      background: none;
      border-left: none;
      padding: 0;
      margin-bottom: 14px;
    }

    .summary p {
      font-style: normal;
      color: ${colors.text};
    }

    .section {
      margin-bottom: 12px;
    }

    .section-title {
      font-size: 10pt;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 1.5px;
      border-bottom: 1px solid ${colors.text};
      padding-bottom: 4px;
      margin-bottom: 8px;
    }

    .skills-compact {
      column-count: 2;
      column-gap: 16px;
    }

    .skills-category {
      margin-bottom: 3px;
      break-inside: avoid;
    }

    .skills-category-title {
      font-size: 8.5pt;
      font-weight: 600;
      color: ${colors.text};
      display: inline;
    }

    .skills-category-title::after {
      content: ": ";
    }

    .skills-grid {
      display: inline;
    }

    .skill-tag {
      display: inline;
      background: none;
      border: none;
      padding: 0;
      font-size: 8.5pt;
      color: ${colors.text};
      font-weight: 400;
    }

    .skill-tag:not(:last-child)::after {
      content: ", ";
    }

    .experience-header {
      margin-bottom: 2px;
    }

    .experience-title {
      font-size: 10pt;
    }

    .experience-company {
      font-size: 9pt;
      color: ${colors.muted};
      font-weight: 400;
    }

    .experience-company::before {
      content: "| ";
      color: ${colors.border};
    }

    .experience-duration {
      font-size: 8.5pt;
    }

    .experience-highlights {
      margin-top: 4px;
      padding-left: 14px;
    }

    .experience-highlights li {
      font-size: 9pt;
      margin-bottom: 2px;
    }

    .experience-highlights li::marker {
      color: ${colors.muted};
      font-size: 6pt;
    }

    .achievement-item {
      margin-bottom: 4px;
      padding-left: 14px;
    }

    .achievement-item::before {
      color: ${colors.muted};
    }

    .achievement-description {
      font-size: 9pt;
      font-weight: 400;
    }

    .achievement-metrics {
      color: ${colors.muted};
    }
    ` : ''}
  </style>
</head>
<body class="template-${template}">
  <div class="container">
    <!-- Header -->
    <header class="header">
      <h1 class="name">${profile.name}</h1>
      <p class="headline">${enhanced.headline}</p>
      ${
        profile.email || profile.phone
          ? `
      <div class="contact-row">
        ${profile.email ? `
        <div class="contact-item">
          <svg class="contact-icon" viewBox="0 0 24 24">
            <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
          </svg>
          <a href="mailto:${profile.email}" class="contact-link">${profile.email}</a>
        </div>
        ` : ''}
        ${profile.phone ? `
        <div class="contact-item">
          <svg class="contact-icon" viewBox="0 0 24 24">
            <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/>
          </svg>
          <span>${profile.phone}</span>
        </div>
        ` : ''}
      </div>
      `
          : ''
      }
      ${
        includeScores && analysis
          ? `
        <div class="score-section">
          <div class="score-item">
            <div class="score-value">${analysis.overallScore}</div>
            <div class="score-label">Overall Score</div>
          </div>
          <div class="score-item">
            <div class="score-value">${analysis.atsScore}</div>
            <div class="score-label">ATS Score</div>
          </div>
        </div>
      `
          : ''
      }
    </header>

    ${
      enhanced.summary
        ? `
    <!-- Summary -->
    <div class="summary">
      <p>${enhanced.summary}</p>
    </div>
    `
        : ''
    }

    <!-- Skills -->
    <section class="section">
      <h2 class="section-title">Skills</h2>
      ${
        skillCategories
          ? `
      <div class="skills-compact">
        ${Object.entries(skillCategories).map(([category, skills]) => `
        <div class="skills-category">
          <span class="skills-category-title">${category}</span><span class="skills-grid">${skills.map((skill) => `<span class="skill-tag">${skill}</span>`).join('')}</span>
        </div>
        `).join('')}
        ${
          enhanced.softSkills.length > 0
            ? `
          <div class="skills-category">
            <span class="skills-category-title">Professional Skills</span><span class="skills-grid">${enhanced.softSkills.map((skill) => `<span class="skill-tag">${skill}</span>`).join('')}</span>
          </div>
        `
            : ''
        }
      </div>
      `
          : `
      <div class="skills-compact">
        <div class="skills-category">
          <span class="skills-category-title">Technical Skills</span><span class="skills-grid">${enhanced.technicalSkills.map((skill) => `<span class="skill-tag">${skill}</span>`).join('')}</span>
        </div>
        ${
          enhanced.softSkills.length > 0
            ? `
          <div class="skills-category">
            <span class="skills-category-title">Professional Skills</span><span class="skills-grid">${enhanced.softSkills.map((skill) => `<span class="skill-tag">${skill}</span>`).join('')}</span>
          </div>
        `
            : ''
        }
      </div>
      `
      }
    </section>

    <!-- Experience -->
    <section class="section">
      <h2 class="section-title">Professional Experience</h2>
      ${sortRolesByDate(enhanced.recentRoles)
        .map(
          (role) => `
        <div class="experience-item">
          <div class="experience-header">
            <div>
              <div class="experience-title">${role.title}</div>
              <div class="experience-company">${role.company}</div>
            </div>
            <div class="experience-duration">${role.duration}</div>
          </div>
          <ul class="experience-highlights">
            ${role.enhancedHighlights.map((h) => `<li>${h}</li>`).join('')}
          </ul>
        </div>
      `
        )
        .join('')}
    </section>

    ${
      enhanced.keyAchievements && enhanced.keyAchievements.length > 0
        ? `
    <!-- Key Achievements -->
    <section class="section">
      <h2 class="section-title">Key Achievements</h2>
      ${enhanced.keyAchievements
        .map(
          (a) => `
        <div class="achievement-item">
          <span class="achievement-description">${a.description}</span>
          ${a.metrics ? `<span class="achievement-metrics"> (${a.metrics})</span>` : ''}
        </div>
      `
        )
        .join('')}
    </section>
    `
        : ''
    }

  </div>
</body>
</html>
`;
}

/**
 * Download resume as PDF by opening print dialog
 */
export function downloadResumePDF(options: ResumePDFOptions, filename?: string): void {
  const html = generateResumeHTML(options);

  // Create a new window for printing
  const printWindow = window.open('', '_blank', 'width=800,height=1100');

  if (!printWindow) {
    // Fallback: use iframe
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = 'none';
    document.body.appendChild(iframe);

    const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
    if (iframeDoc) {
      iframeDoc.open();
      iframeDoc.write(html);
      iframeDoc.close();

      setTimeout(() => {
        iframe.contentWindow?.print();
        setTimeout(() => {
          document.body.removeChild(iframe);
        }, 1000);
      }, 500);
    }
    return;
  }

  printWindow.document.write(html);
  printWindow.document.close();

  // Wait for content to load then trigger print
  printWindow.onload = () => {
    setTimeout(() => {
      printWindow.print();
      // Close after print dialog (user can cancel)
      printWindow.onafterprint = () => {
        printWindow.close();
      };
    }, 250);
  };
}

/**
 * Preview resume HTML in a new window
 */
export function previewResumeHTML(options: ResumePDFOptions): void {
  const html = generateResumeHTML(options);
  const previewWindow = window.open('', '_blank', 'width=850,height=1100');

  if (previewWindow) {
    previewWindow.document.write(html);
    previewWindow.document.close();
  }
}
