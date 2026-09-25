import { describe, it, expect } from 'vitest';
import { inlineMarkdownToHtml, parseMarkdown, coverLetterToHtml } from './utils';

const payload = 'Hi <img src=x onerror="alert(1)"> **bold**';

describe('HTML rendering of AI text', () => {
  it.each([
    ['inlineMarkdownToHtml', inlineMarkdownToHtml],
    ['parseMarkdown', parseMarkdown],
    ['coverLetterToHtml', coverLetterToHtml],
  ])('%s escapes injected tags', (_, render) => {
    const html = render(payload);
    expect(html).not.toContain('<img');
    expect(html).toContain('&lt;img');
  });

  it('still renders inline markdown after escaping', () => {
    expect(inlineMarkdownToHtml('**a** *b* `c`')).toBe(
      '<strong class="text-white font-semibold">a</strong> <em>b</em> <code class="bg-gray-800 px-1 rounded text-blue-300">c</code>'
    );
    expect(inlineMarkdownToHtml('1. step', { numbered: true })).toContain('<span class="text-blue-400 font-medium">1.</span> step');
  });
});
