import { describe, expect, it } from 'vitest';
import { buildPromptLaunchUrl } from '@/lib/prompt-launch';

const SAMPLE = `8K MASTER ANIMATION SPRITE SHEET SPECIFICATION (4×4 UNIFORM GRID · 16 FRAMES)

ANIMATION SCENE & ACTION: A koi swims through lanterns
VISUAL STYLE: Octane cinematic 3D`;

describe('buildPromptLaunchUrl', () => {
  it('prefills each host with the exact prompt', () => {
    const q = encodeURIComponent(SAMPLE);
    expect(buildPromptLaunchUrl('chatgpt', SAMPLE)).toBe(
      `https://chatgpt.com/?hints=image&q=${q}`,
    );
    expect(buildPromptLaunchUrl('grok', SAMPLE)).toBe(`https://grok.com/?q=${q}`);
    expect(buildPromptLaunchUrl('gemini', SAMPLE)).toBe(
      `https://www.google.com/search?udm=50&q=${q}`,
    );
  });

  it('shortens ChatGPT URLs when the prompt would overflow', () => {
    const url = buildPromptLaunchUrl('chatgpt', 'x'.repeat(8000));
    expect(url.length).toBeLessThan(2000);
    expect(url).toContain('chatgpt.com');
    expect(url).not.toContain('x'.repeat(100));
  });
});
