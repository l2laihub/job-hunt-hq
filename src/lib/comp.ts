import type { JobApplication } from '@/src/types';

// ponytail: fixed conversion assumptions; make them profile settings if they ever need tuning
export const CAD_TO_USD = 0.73;
export const HOURS_PER_YEAR = 2080;

export interface Comp {
  min: number;
  max: number;
  unit: 'year' | 'hour';
  currency: 'USD' | 'CAD';
}

/** Parse a free-text range like "$180,000–$220,000", "$150k-190k", "CAD 70-80/hr". */
export function parseCompString(raw?: string): Comp | null {
  raw = raw?.slice(0, 200); // bounds the regex scan on huge pastes
  if (!raw || /not disclosed|not specified|undisclosed|n\/a/i.test(raw)) return null;
  const currency = /C\$|CA\$|\bCAD\b/i.test(raw) ? 'CAD' : 'USD';
  const unit = /(\/|\bper|\ban)\s*h(ou)?r\b|hourly/i.test(raw) ? 'hour' : 'year';
  const nums: number[] = [];
  const re = /(\$)?\s*([0-9][0-9,]*(?:\.[0-9]+)?)\s*(k\b)?/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(raw)) && nums.length < 2) {
    let v = parseFloat(m[2].replace(/,/g, ''));
    if (isNaN(v)) continue;
    if (!m[1] && !m[3] && v < 1000 && nums.length === 0 && unit === 'year') continue; // stray digits like "Zone 1"
    if (m[3]) v *= 1000;
    else if (unit === 'year' && v < 1000) v *= 1000; // "154.4" meaning 154.4k
    // A range's upper bound is >= the lower and within 3x ("$120,000 plus 401k match")
    if (nums.length === 1 && (v < nums[0] || v > nums[0] * 3)) continue;
    nums.push(v);
  }
  if (!nums.length) return null;
  return { min: nums[0], max: nums[1] ?? nums[0], unit, currency };
}

/** Structured comp fields win; otherwise parse the free-text salary range. */
export function compOf(app: Pick<JobApplication, 'compMin' | 'compMax' | 'compUnit' | 'compCurrency' | 'salaryRange'>): Comp | null {
  if (app.compMin != null) {
    return {
      min: app.compMin,
      max: app.compMax ?? app.compMin,
      unit: app.compUnit || 'year',
      currency: app.compCurrency || 'USD',
    };
  }
  return parseCompString(app.salaryRange);
}

export function toAnnualUSD(c: Comp): { min: number; max: number } {
  const f = (c.currency === 'CAD' ? CAD_TO_USD : 1) * (c.unit === 'hour' ? HOURS_PER_YEAR : 1);
  return { min: c.min * f, max: c.max * f };
}

const k = (n: number) => (n >= 1000 ? `$${Math.round(n / 1000)}k` : `$${Math.round(n)}`);
const range = (lo: number, hi: number) => (Math.round(lo) === Math.round(hi) ? k(lo) : `${k(lo)}–${k(hi)}`);

/** "$180k–$220k/yr · ≈$87–$106/hr" — the other unit, normalized to USD. */
export function formatComp(c: Comp): string {
  const ann = toAnnualUSD(c);
  if (c.unit === 'hour') {
    return `${range(c.min, c.max)}/hr${c.currency === 'CAD' ? ' CAD' : ''} · ≈${range(ann.min, ann.max)}/yr`;
  }
  return `${range(ann.min, ann.max)}/yr${c.currency === 'CAD' ? ' (USD)' : ''} · ≈${range(ann.min / HOURS_PER_YEAR, ann.max / HOURS_PER_YEAR)}/hr`;
}
