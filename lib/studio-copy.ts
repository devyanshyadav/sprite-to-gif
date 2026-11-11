/** User-facing studio copy — keep tone short, consistent, and action-led. */

export const STUDIO_COPY = {
  productName: 'SpriteToGIF',
  hero: {
    title: 'Sprite sheet to GIF',
    tagline:
      'Detect frame boundaries, draft sheet prompts, export GIFs — all in your browser.',
  },
  sheet: {
    emptyLabel: 'No sheet loaded',
    dropzoneTitle: 'Upload a sprite sheet',
    dropzoneHint: 'PNG, JPG, or WebP · drop, paste, or browse',
    updatingGrid: 'Updating grid…',
  },
  workflow: {
    ariaLabel: 'Studio steps',
    prompt: 'Prompt builder',
    upload: 'Upload sheet',
    uploading: 'Uploading…',
    export: 'Export GIF',
  },
  grid: {
    autoDetect: 'Auto-detect grid',
    detect: 'Detect grid',
    advanced: 'Advanced',
    refineCells: 'Refine each cell',
  },
  preview: {
    empty: 'No frames enabled',
    speed: 'Speed',
    modeLoop: 'Loop',
    modePingPong: 'Ping-pong',
    modeReverse: 'Reverse',
  },
  export: {
    create: (frameCount: number) => `Export GIF`,
    creating: (progress: number) => `Exporting… ${progress}%`,
    frameZip: 'Frame PNGs',
    ready: 'Ready',
    open: 'Preview',
    dialogTitle: 'GIF ready',
    download: 'Download GIF',
    save: 'Save to library',
    saving: 'Saving…',
    saved: 'Saved',
    alertSuccess: 'Success',
    alertNotice: 'Notice',
  },
  promptBuilder: {
    ideaLabel: 'What should move?',
    ideaPlaceholder: 'e.g. panda waving hello',
    copy: 'Copy prompt',
    copied: 'Copied',
    open: 'Open',
  },
  promptSheet: {
    title: 'Prompt builder',
    description:
      'Draft a grid-locked AI sprite spec (neon borders, uniform cells) sized to your columns × rows.',
  },
  savedVault: {
    title: 'Saved GIFs',
    description: 'GIFs stored on this device only.',
    emptyTitle: 'Nothing saved yet',
    emptyDescription: 'Export a GIF, then save it here.',
    countLabel: (n: number) => `${n} saved`,
    clearAll: 'Clear all',
  },
  samples: 'Sample sheets',
  saved: 'Saved',
  footer: {
    madeBy: 'A fun project by',
    author: 'Devyansh',
    authorUrl: 'https://devyanshyadav.com',
    githubUrl: 'https://github.com/devyanshyadav/sprite-to-gif',
    githubLabel: 'GitHub',
    githubTooltip: 'View source on GitHub',
  },
} as const;
