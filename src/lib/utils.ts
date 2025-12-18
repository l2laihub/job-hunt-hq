import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merge Tailwind classes with clsx
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/**
 * Format date for display
 */
export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Format relative time (e.g., "2 days ago")
 */
export function formatRelativeTime(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
  return `${Math.floor(diffDays / 365)} years ago`;
}

/**
 * Generate a unique ID
 */
export function generateId(): string {
  return crypto.randomUUID();
}

/**
 * Debounce function
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}

/**
 * Download data as JSON file
 */
export function downloadJSON(data: unknown, filename: string): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Read file as text
 */
export function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsText(file);
  });
}

/**
 * Read file as base64
 */
export function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1] || result;
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Parse JSON safely
 */
export function safeJSONParse<T>(json: string, fallback: T): T {
  try {
    return JSON.parse(json) as T;
  } catch {
    return fallback;
  }
}

/**
 * Get score color class
 */
export function getScoreColor(score: number): string {
  if (score >= 8) return 'text-green-400';
  if (score >= 5) return 'text-yellow-400';
  return 'text-red-400';
}

/**
 * Get score background class
 */
export function getScoreBgColor(score: number): string {
  if (score >= 8) return 'bg-green-900/40 border-green-700/50';
  if (score >= 5) return 'bg-yellow-900/40 border-yellow-700/50';
  return 'bg-red-900/40 border-red-700/50';
}

/**
 * Truncate text with ellipsis
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + '...';
}

/**
 * Capitalize first letter
 */
export function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/**
 * Format currency
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Format time in MM:SS
 */
export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Parse simple markdown to HTML
 * Supports: **bold**, *italic*, `code`, - lists, numbered lists, headers, newlines
 */
export function parseMarkdown(text: string): string {
  if (!text) return '';

  let html = text
    // Escape HTML entities first
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    // Bold: **text** or __text__
    .replace(/\*\*([^*]+)\*\*/g, '<strong class="font-semibold text-white">$1</strong>')
    .replace(/__([^_]+)__/g, '<strong class="font-semibold text-white">$1</strong>')
    // Italic: *text* or _text_ (but not inside bold)
    .replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '<em class="italic">$1</em>')
    .replace(/(?<!_)_([^_]+)_(?!_)/g, '<em class="italic">$1</em>')
    // Inline code: `code`
    .replace(/`([^`]+)`/g, '<code class="bg-gray-800 px-1.5 py-0.5 rounded text-blue-300 text-xs font-mono">$1</code>')
    // Headers: # ## ###
    .replace(/^### (.+)$/gm, '<h4 class="text-sm font-bold text-white mt-3 mb-1">$1</h4>')
    .replace(/^## (.+)$/gm, '<h3 class="text-base font-bold text-white mt-4 mb-2">$1</h3>')
    .replace(/^# (.+)$/gm, '<h2 class="text-lg font-bold text-white mt-4 mb-2">$1</h2>')
    // Bullet lists: - item or * item
    .replace(/^[-*] (.+)$/gm, '<li class="flex items-start gap-2 ml-4"><span class="text-blue-400 mt-1.5">•</span><span>$1</span></li>')
    // Numbered lists: 1. item
    .replace(/^\d+\. (.+)$/gm, '<li class="flex items-start gap-2 ml-4"><span class="text-blue-400 font-mono text-xs mt-0.5">▸</span><span>$1</span></li>')
    // Line breaks: double newline = paragraph, single newline = <br>
    .replace(/\n\n/g, '</p><p class="mt-2">')
    .replace(/\n/g, '<br />');

  // Wrap in paragraph
  return `<p>${html}</p>`;
}

/**
 * Format cover letter content to ensure proper paragraph breaks
 * This can be used to fix display of cover letters that were generated without line breaks
 * Returns text with proper newlines that can be displayed with whitespace-pre-wrap
 */
export function formatCoverLetter(content: string): string {
  let formatted = content.trim();

  // If content already has enough line breaks, just clean it up
  if ((formatted.match(/\n\n/g) || []).length >= 3) {
    return formatted;
  }

  // Step 1: Add break after greeting (Dear X,)
  formatted = formatted.replace(/^(Dear[^,]+,)\s*/i, '$1\n\n');

  // Step 2: Add break before common sign-offs
  formatted = formatted.replace(
    /\s+(Best regards|Sincerely|Kind regards|Regards|Thank you|Warm regards|Yours truly|Respectfully),?\s*/gi,
    '\n\n$1,\n'
  );

  // Step 3: Check if we need to add more paragraph breaks in the body
  const paragraphCount = (formatted.match(/\n\n/g) || []).length;

  if (paragraphCount < 3) {
    // Find body section
    const greetingMatch = formatted.match(/^(Dear[^,]+,\n\n)/i);
    const signoffMatch = formatted.match(/(\n\n(?:Best regards|Sincerely|Kind regards|Regards|Thank you|Warm regards|Yours truly|Respectfully),[\s\S]*$)/i);

    if (greetingMatch && signoffMatch) {
      const greeting = greetingMatch[1];
      const signoffIndex = formatted.lastIndexOf(signoffMatch[1]);
      const body = formatted.slice(greeting.length, signoffIndex);
      const signoff = signoffMatch[1];

      // Split body intelligently
      let formattedBody = body
        // Break before transition phrases
        .replace(/\.\s+(In my |At |During |While |After |Before |Throughout |Additionally|Furthermore|Moreover|Beyond this|My experience|My background|My work|I've also|I also|Most recently|Previously|Before that)/gi, '.\n\n$1')
        // Break before closing statements
        .replace(/\.\s+(I(?:'m| am) (?:particularly|especially|most|confident|eager|excited)|What (?:excites|interests|draws|attracts)|I would (?:welcome|love|be)|I look forward|I'd (?:love|welcome|be))/gi, '.\n\n$1')
        // If still no breaks, split after first few sentences
        .replace(/^([^.]+\.[^.]+\.)\s+/g, '$1\n\n');

      formatted = greeting + formattedBody.trim() + signoff;
    }
  }

  return formatted.trim();
}

/**
 * Convert cover letter text to HTML for rich display
 * Converts newlines to proper paragraph tags with spacing
 */
export function coverLetterToHtml(content: string): string {
  const formatted = formatCoverLetter(content);

  // Split by double newlines into paragraphs
  const paragraphs = formatted.split(/\n\n+/);

  return paragraphs
    .map((p) => {
      // Handle sign-off + name (single newline between them)
      if (p.includes('\n')) {
        const lines = p.split('\n').map((line) => line.trim()).filter(Boolean);
        return `<p class="mb-4 last:mb-0">${lines.join('<br />')}</p>`;
      }
      return `<p class="mb-4 last:mb-0">${p.trim()}</p>`;
    })
    .join('');
}
