import type { UserProfile, ContextDocument } from '@/src/types';

/**
 * Rules that make the uploaded documents behave like a Claude Project's knowledge:
 * the authoritative doc wins, and its own rules (provenance tags, never-say lists,
 * scope boundaries) are binding on every AI output.
 */
const DOCUMENT_RULES = `GROUND RULES for using the candidate documents (these override style and completeness):
- The document marked [AUTHORITATIVE] is the single source of truth about the candidate. If a [SUPPORTING] document disagrees with it, the authoritative document wins.
- Obey every rule the documents themselves state: provenance tags, scope boundaries (what the candidate did vs. what others built), naming rules, and "never say" lists. Claims marked unsourced or never-say must NOT appear in your output, in any phrasing.
- Use only facts present in the documents. Do not invent metrics, dates, titles, team sizes, or outcomes. If a number would help but is not supplied, write around it.`;

export function hasContextDocuments(profile: UserProfile): boolean {
  return (profile.contextDocuments?.length ?? 0) > 0;
}

function renderDocument(doc: ContextDocument): string {
  return `### [${doc.kind.toUpperCase()}] ${doc.name}\n${doc.content.trim()}`;
}

/**
 * Candidate context built from uploaded source documents.
 * Returns null when the profile has none, so callers can fall back to their
 * structured-field builders.
 *
 * ponytail: documents are sent whole (~10-30K tokens) — Gemini's context is 1M,
 * so no chunking/retrieval. Add retrieval only if document sets grow past ~200K tokens.
 */
export function buildCandidateContext(profile: UserProfile): string | null {
  const docs = profile.contextDocuments ?? [];
  if (docs.length === 0) return null;

  // Authoritative first so it frames everything after it
  const ordered = [...docs].sort((a, b) =>
    a.kind === b.kind ? 0 : a.kind === 'authoritative' ? -1 : 1
  );

  const p = profile.preferences;
  const list = (xs: string[] | undefined) => (xs?.length ? xs.join(', ') : 'Not specified');

  return `## Candidate Source Documents
${DOCUMENT_RULES}

${ordered.map(renderDocument).join('\n\n')}

## Preferences (from profile settings — use for deal-breaker, comp, and work-style checks)
- Target Roles: ${list(p.targetRoles)}
- Work Style: ${list(p.workStyle)}
- Salary Range: $${p.salaryRange.min.toLocaleString()}-$${p.salaryRange.max.toLocaleString()}
- Priority Factors: ${list(p.priorityFactors)}
- Deal Breakers: ${list(p.dealBreakers)}
- Constraints: ${list(profile.constraints)}
- Career Goals: ${list(profile.goals)}`;
}
