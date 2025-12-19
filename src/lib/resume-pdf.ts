/**
 * Resume PDF Generation Utilities
 *
 * Generates professional PDF resumes using browser print functionality.
 * Creates a styled HTML document and triggers print-to-PDF.
 */

import type { EnhancedProfile, EnhancedRole, ResumeAnalysis, UserProfile } from '@/src/types';

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
    primary: '#7c3aed',
    secondary: '#4c1d95',
    accent: '#8b5cf6',
    background: '#ffffff',
    text: '#1f2937',
    muted: '#6b7280',
    border: '#e5e7eb',
  },
  minimal: {
    primary: '#111827',
    secondary: '#374151',
    accent: '#111827',
    background: '#ffffff',
    text: '#111827',
    muted: '#6b7280',
    border: '#d1d5db',
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
  const { enhanced, profile, analysis, jobInfo, includeScores = false } = options;
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
  const categorizeSkills = (skills: string[]): Record<string, string[]> => {
    const categories: Record<string, string[]> = {
      'Languages & Frameworks': [],
      'Cloud & Infrastructure': [],
      'AI & ML': [],
      'Databases': [],
      'Tools & Practices': [],
      'Other': [],
    };

    const patterns: Record<string, RegExp> = {
      'Languages & Frameworks': /react|angular|vue|next|node|python|typescript|javascript|java|c#|c\+\+|go|rust|ruby|php|swift|kotlin|flutter|\.net|express|fastapi|flask|django|spring/i,
      'Cloud & Infrastructure': /aws|azure|gcp|google cloud|docker|kubernetes|k8s|terraform|jenkins|ci\/cd|github actions|vercel|netlify|heroku|microservices|api gateway|serverless/i,
      'AI & ML': /ai|ml|machine learning|deep learning|llm|gpt|gemini|claude|langchain|tensorflow|pytorch|openai|anthropic|rag|graphrag|nlp|computer vision|mediapipe/i,
      'Databases': /sql|postgres|mysql|mongodb|redis|dynamodb|cosmos|supabase|firebase|elasticsearch|neo4j|graphql/i,
    };

    skills.forEach(skill => {
      let placed = false;
      for (const [category, pattern] of Object.entries(patterns)) {
        if (pattern.test(skill)) {
          categories[category].push(skill);
          placed = true;
          break;
        }
      }
      if (!placed) {
        categories['Tools & Practices'].push(skill);
      }
    });

    // Remove empty categories
    return Object.fromEntries(
      Object.entries(categories).filter(([_, skills]) => skills.length > 0)
    );
  };

  const technicalCategories = categorizeSkills(enhanced.technicalSkills);

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${pdfTitle}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Source+Sans+Pro:wght@400;600;700&family=Merriweather:wght@700&display=swap');

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
      font-family: 'Source Sans Pro', -apple-system, BlinkMacSystemFont, sans-serif;
      font-size: 10pt;
      line-height: 1.45;
      color: ${colors.text};
      background: ${colors.background};
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
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
      font-size: 11pt;
      font-weight: 600;
      color: ${colors.secondary};
      line-height: 1.4;
    }

    .contact-row {
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 20px;
      margin-top: 10px;
      font-size: 9.5pt;
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

    .contact-link {
      color: ${colors.accent};
      text-decoration: none;
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
      font-size: 8pt;
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
      font-size: 10pt;
      color: ${colors.secondary};
      line-height: 1.55;
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
      letter-spacing: 1.5px;
    }

    /* Skills - Compact categorized layout */
    .skills-container {
      display: grid;
      grid-template-columns: 3fr 2fr;
      gap: 16px;
    }

    .skills-column {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .skill-category {
      margin-bottom: 6px;
    }

    .skill-category-name {
      font-size: 9pt;
      font-weight: 600;
      color: ${colors.accent};
      margin-bottom: 4px;
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .skill-category-name::before {
      content: "";
      width: 4px;
      height: 4px;
      background: ${colors.accent};
      border-radius: 50%;
    }

    .skill-list {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
    }

    .skill-tag {
      display: inline-block;
      background: ${colors.primary}08;
      color: ${colors.secondary};
      font-size: 8.5pt;
      padding: 2px 8px;
      border-radius: 3px;
      border: 1px solid ${colors.border};
    }

    .soft-skills-section {
      background: ${colors.headerBg};
      padding: 10px 12px;
      border-radius: 4px;
    }

    .soft-skills-title {
      font-size: 9pt;
      font-weight: 600;
      color: ${colors.secondary};
      margin-bottom: 6px;
    }

    .soft-skill-tag {
      display: inline-block;
      color: ${colors.muted};
      font-size: 8.5pt;
      padding: 2px 6px;
      margin: 2px;
    }

    .soft-skill-tag::before {
      content: "•";
      margin-right: 4px;
      color: ${colors.accent};
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
      font-size: 11pt;
      font-weight: 700;
      color: ${colors.primary};
    }

    .experience-company {
      font-size: 10pt;
      color: ${colors.accent};
      font-weight: 600;
    }

    .experience-duration {
      font-size: 9pt;
      color: ${colors.muted};
      font-style: italic;
    }

    .experience-highlights {
      margin-top: 4px;
      padding-left: 14px;
      page-break-before: avoid;
    }

    .experience-highlights li {
      font-size: 9.5pt;
      color: ${colors.text};
      margin-bottom: 2px;
      line-height: 1.4;
    }

    .experience-highlights li::marker {
      color: ${colors.accent};
      font-size: 8pt;
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
      font-size: 9pt;
      color: ${colors.text};
      font-weight: 500;
    }

    .achievement-metric {
      font-size: 8.5pt;
      color: ${colors.accent};
      font-weight: 600;
      margin-top: 2px;
    }

    /* Tailored badge */
    .tailored-badge {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      background: linear-gradient(90deg, ${colors.accent}20, ${colors.accent}10);
      color: ${colors.accent};
      font-size: 8pt;
      font-weight: 600;
      padding: 4px 12px;
      border-radius: 12px;
      margin-top: 8px;
    }

    /* Print optimizations */
    @media print {
      html, body {
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
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

      ${jobInfo?.role && jobInfo?.company ? `
      <span class="tailored-badge">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
        </svg>
        Tailored for ${jobInfo.role} at ${jobInfo.company}
      </span>
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
        <div class="skills-column">
          ${Object.entries(technicalCategories).map(([category, skills]) => `
          <div class="skill-category">
            <div class="skill-category-name">${category}</div>
            <div class="skill-list">
              ${skills.map(skill => `<span class="skill-tag">${skill}</span>`).join('')}
            </div>
          </div>
          `).join('')}
        </div>
        ${enhanced.softSkills.length > 0 ? `
        <div class="skills-column">
          <div class="soft-skills-section">
            <div class="soft-skills-title">Professional Skills</div>
            <div>
              ${enhanced.softSkills.map(skill => `<span class="soft-skill-tag">${skill}</span>`).join('')}
            </div>
          </div>
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

    .contact-link {
      color: ${colors.accent};
      text-decoration: none;
    }

    /* Tailored Badge */
    .tailored-badge {
      display: inline-block;
      background: ${colors.accent}15;
      color: ${colors.accent};
      font-size: 8pt;
      font-weight: 600;
      padding: 4px 12px;
      border-radius: 12px;
      margin-top: 8px;
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

    /* Skills */
    .skills-grid {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }

    .skill-tag {
      display: inline-block;
      background: ${colors.primary}10;
      color: ${colors.primary};
      font-size: 9pt;
      font-weight: 500;
      padding: 4px 10px;
      border-radius: 4px;
    }

    .skills-category {
      margin-bottom: 8px;
    }

    .skills-category-title {
      font-size: 9pt;
      font-weight: 600;
      color: ${colors.secondary};
      margin-bottom: 4px;
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
  </style>
</head>
<body>
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
        jobInfo?.role && jobInfo?.company
          ? `<span class="tailored-badge">Tailored for ${jobInfo.role} at ${jobInfo.company}</span>`
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
      <div class="two-column">
        <div class="skills-category">
          <div class="skills-category-title">Technical Skills</div>
          <div class="skills-grid">
            ${enhanced.technicalSkills.map((skill) => `<span class="skill-tag">${skill}</span>`).join('')}
          </div>
        </div>
        ${
          enhanced.softSkills.length > 0
            ? `
          <div class="skills-category">
            <div class="skills-category-title">Soft Skills</div>
            <div class="skills-grid">
              ${enhanced.softSkills.map((skill) => `<span class="skill-tag">${skill}</span>`).join('')}
            </div>
          </div>
        `
            : ''
        }
      </div>
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
