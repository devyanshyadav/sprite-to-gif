export type PromptLaunchTarget = 'gemini' | 'chatgpt' | 'grok';

const MAX_QUERY_CHARS = 7000;

const CLIPBOARD_FALLBACK =
  'Use the sprite-sheet prompt I copied to the clipboard. Paste it into the chat if the box is empty, then generate one high-quality PNG.';

const LAUNCH_URL: Record<PromptLaunchTarget, string> = {
  chatgpt: 'https://chatgpt.com/?hints=image&q=',
  grok: 'https://grok.com/?q=',
  // gemini.google.com ignores ?q=; Google AI Mode accepts the full prompt.
  gemini: 'https://www.google.com/search?udm=50&q=',
};

export const PROMPT_LAUNCH_TARGETS: {
  id: PromptLaunchTarget;
  label: string;
}[] = [
  { id: 'gemini', label: 'Open in Gemini' },
  { id: 'chatgpt', label: 'Open in ChatGPT' },
  { id: 'grok', label: 'Open in Grok' },
];

function encodedQuery(prompt: string): string {
  const full = encodeURIComponent(prompt);
  return full.length > MAX_QUERY_CHARS
    ? encodeURIComponent(CLIPBOARD_FALLBACK)
    : full;
}

export function buildPromptLaunchUrl(
  target: PromptLaunchTarget,
  prompt: string,
): string {
  return `${LAUNCH_URL[target]}${encodedQuery(prompt)}`;
}

export function launchPromptIn(
  target: PromptLaunchTarget,
  prompt: string,
): void {
  window.open(buildPromptLaunchUrl(target, prompt), '_blank', 'noopener,noreferrer');
  void navigator.clipboard.writeText(prompt).catch(() => {});
}
