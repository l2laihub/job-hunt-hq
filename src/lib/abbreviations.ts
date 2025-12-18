/**
 * Common abbreviations used in job hunting and recruitment
 * Each entry maps an abbreviation to its full meaning and optional description
 */

export interface AbbreviationInfo {
  full: string;
  description?: string;
}

export const ABBREVIATIONS: Record<string, AbbreviationInfo> = {
  // Resume & Application
  ATS: {
    full: 'Applicant Tracking System',
    description: 'Software used by companies to filter and manage job applications. Higher ATS scores mean your resume is more likely to pass automated screening.',
  },
  CV: {
    full: 'Curriculum Vitae',
    description: 'A detailed document highlighting your professional and academic history.',
  },
  JD: {
    full: 'Job Description',
    description: 'A document outlining the responsibilities, requirements, and qualifications for a job position.',
  },

  // Interview & Assessment
  STAR: {
    full: 'Situation, Task, Action, Result',
    description: 'A structured method for answering behavioral interview questions by describing a specific example.',
  },
  OKR: {
    full: 'Objectives and Key Results',
    description: 'A goal-setting framework used by companies to define and track objectives and outcomes.',
  },
  KPI: {
    full: 'Key Performance Indicator',
    description: 'Measurable values that demonstrate how effectively you or a company is achieving objectives.',
  },

  // Employment Types
  FTE: {
    full: 'Full-Time Employee',
    description: 'A permanent employee working standard full-time hours with benefits.',
  },
  PTO: {
    full: 'Paid Time Off',
    description: 'Vacation days, sick leave, or personal days that are compensated.',
  },
  OTE: {
    full: 'On-Target Earnings',
    description: 'Total expected compensation including base salary and variable pay (commissions, bonuses) when targets are met.',
  },
  RSU: {
    full: 'Restricted Stock Unit',
    description: 'Company shares granted to employees as part of compensation that vest over time.',
  },

  // Technical & Development
  API: {
    full: 'Application Programming Interface',
    description: 'A set of protocols that allows different software applications to communicate.',
  },
  SDK: {
    full: 'Software Development Kit',
    description: 'A collection of tools and libraries for building software applications.',
  },
  CI: {
    full: 'Continuous Integration',
    description: 'Development practice of frequently merging code changes into a shared repository.',
  },
  CD: {
    full: 'Continuous Deployment/Delivery',
    description: 'Practice of automatically deploying code changes to production after passing tests.',
  },
  TDD: {
    full: 'Test-Driven Development',
    description: 'Development approach where tests are written before the actual code.',
  },
  MVP: {
    full: 'Minimum Viable Product',
    description: 'A product with enough features to satisfy early customers and gather feedback.',
  },
  SaaS: {
    full: 'Software as a Service',
    description: 'Software delivery model where applications are hosted in the cloud and accessed via subscription.',
  },

  // Company & Business
  B2B: {
    full: 'Business to Business',
    description: 'Companies that sell products or services to other businesses.',
  },
  B2C: {
    full: 'Business to Consumer',
    description: 'Companies that sell products or services directly to consumers.',
  },
  SMB: {
    full: 'Small and Medium Business',
    description: 'Companies with fewer employees and lower revenue than large enterprises.',
  },
  IPO: {
    full: 'Initial Public Offering',
    description: 'When a company first sells shares to the public on a stock exchange.',
  },

  // HR & Recruiting
  HR: {
    full: 'Human Resources',
    description: 'Department responsible for managing employee-related functions.',
  },
  HRBP: {
    full: 'HR Business Partner',
    description: 'HR professional who works closely with business leaders on people strategy.',
  },
  EEO: {
    full: 'Equal Employment Opportunity',
    description: 'Laws and practices that prohibit workplace discrimination.',
  },
  NDA: {
    full: 'Non-Disclosure Agreement',
    description: 'Legal contract that protects confidential information shared during employment or interviews.',
  },

  // Remote Work
  WFH: {
    full: 'Work From Home',
    description: 'Working remotely from your home instead of an office.',
  },
  RTO: {
    full: 'Return to Office',
    description: 'Policy requiring employees to work from the office instead of remotely.',
  },

  // Platforms
  LI: {
    full: 'LinkedIn',
    description: 'Professional networking platform commonly used for job searching.',
  },
};

/**
 * Get abbreviation info by key (case-insensitive)
 */
export function getAbbreviation(abbr: string): AbbreviationInfo | undefined {
  return ABBREVIATIONS[abbr.toUpperCase()];
}

/**
 * Check if a string is a known abbreviation
 */
export function isAbbreviation(text: string): boolean {
  return text.toUpperCase() in ABBREVIATIONS;
}
