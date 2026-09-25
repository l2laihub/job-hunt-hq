import { describe, it, expect } from 'vitest';
import { parseCompString, compOf, formatComp } from './comp';

describe('parseCompString', () => {
  it.each([
    ['$180,000 - $220,000', { min: 180000, max: 220000, unit: 'year', currency: 'USD' }],
    ['$150k-190k', { min: 150000, max: 190000, unit: 'year', currency: 'USD' }],
    ['Zone 1: $154.4 - $220.6', { min: 154400, max: 220600, unit: 'year', currency: 'USD' }],
    ['CAD 70-80/hr', { min: 70, max: 80, unit: 'hour', currency: 'CAD' }],
    ['$95/hour', { min: 95, max: 95, unit: 'hour', currency: 'USD' }],
    ['$65/hr, W2', { min: 65, max: 65, unit: 'hour', currency: 'USD' }],
    ['$120,000 plus 401k match', { min: 120000, max: 120000, unit: 'year', currency: 'USD' }],
    ['$60-$70 an hour', { min: 60, max: 70, unit: 'hour', currency: 'USD' }],
    ['C$90k-110k', { min: 90000, max: 110000, unit: 'year', currency: 'CAD' }],
  ])('%s', (raw, expected) => {
    expect(parseCompString(raw)).toEqual(expected);
  });

  it('returns null when not disclosed', () => {
    expect(parseCompString('Not disclosed')).toBeNull();
    expect(parseCompString(undefined)).toBeNull();
  });
});

describe('compOf / formatComp', () => {
  it('prefers structured fields over the free-text range', () => {
    expect(compOf({ compMin: 100, compMax: 120, compUnit: 'hour', salaryRange: '$1M' })).toEqual({
      min: 100, max: 120, unit: 'hour', currency: 'USD',
    });
  });

  it('normalizes hourly CAD to annual USD', () => {
    expect(formatComp({ min: 70, max: 80, unit: 'hour', currency: 'CAD' })).toBe('$70–$80/hr CAD · ≈$106k–$121k/yr');
  });

  it('shows the hourly equivalent of a yearly range', () => {
    expect(formatComp({ min: 208000, max: 208000, unit: 'year', currency: 'USD' })).toBe('$208k/yr · ≈$100/hr');
  });
});
