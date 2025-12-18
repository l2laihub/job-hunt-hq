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
  template?: 'professional' | 'modern' | 'minimal';
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
};

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

    .contact-info {
      font-size: 9pt;
      color: ${colors.muted};
    }

    .contact-info span {
      margin: 0 8px;
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
      page-break-inside: avoid;
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

      .section {
        page-break-inside: avoid;
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
