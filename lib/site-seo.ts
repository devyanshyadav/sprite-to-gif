import type { Metadata } from 'next';
import { STUDIO_COPY } from '@/lib/studio-copy';

/** Canonical site origin. Set `NEXT_PUBLIC_SITE_URL` in production (e.g. https://sprite-to-gif.vercel.app). */
export function getSiteUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '');
  if (fromEnv) return fromEnv;
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL.replace(/\/$/, '')}`;
  }
  return 'http://localhost:3000';
}

export const SITE_NAME = STUDIO_COPY.productName;

export const SITE_TITLE = `${SITE_NAME} — ${STUDIO_COPY.hero.title}`;

/** Primary meta description — matches in-app hero and workflow. */
export const SITE_DESCRIPTION = [
  `${STUDIO_COPY.hero.title}. ${STUDIO_COPY.hero.tagline}`,
  'Grid detection tuned for neon dividers and uneven gutters; optional per-cell refine.',
  'Prompt builder for AI sprite sheets; preview and export share the same clarity pipeline.',
  'Free and local — no server uploads.',
].join(' ');

export const SITE_KEYWORDS = [
  'sprite sheet to gif',
  'AI sprite sheet',
  'neon grid detection',
  'sprite sheet boundary detection',
  'sprite sheet gif converter',
  'sprite sheet prompt builder',
  'browser gif maker',
  'local gif export',
  'sprite sheet clarity',
  'per frame sharpen gif',
] as const;

const OG_IMAGE_PATH = '/ogimage.png';

export function absoluteUrl(path: string): string {
  return new URL(path, getSiteUrl()).toString();
}

export function buildRootMetadata(): Metadata {
  const siteUrl = getSiteUrl();
  const ogImage = absoluteUrl(OG_IMAGE_PATH);

  return {
    metadataBase: new URL(siteUrl),
    title: {
      default: SITE_TITLE,
      template: `%s · ${SITE_NAME}`,
    },
    description: SITE_DESCRIPTION,
    applicationName: SITE_NAME,
    keywords: [...SITE_KEYWORDS],
    authors: [{ name: STUDIO_COPY.footer.author, url: STUDIO_COPY.footer.authorUrl }],
    creator: STUDIO_COPY.footer.author,
    category: 'multimedia',
    alternates: {
      canonical: '/',
    },
    openGraph: {
      type: 'website',
      locale: 'en_US',
      url: '/',
      siteName: SITE_NAME,
      title: SITE_TITLE,
      description: SITE_DESCRIPTION,
      images: [
        {
          url: ogImage,
          alt: `${SITE_NAME}: ${STUDIO_COPY.hero.tagline}`,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: SITE_TITLE,
      description: SITE_DESCRIPTION,
      images: [ogImage],
    },
    robots: {
      index: true,
      follow: true,
    },
  };
}

export function webApplicationJsonLd(): Record<string, unknown> {
  const url = getSiteUrl();
  return {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: SITE_NAME,
    url,
    description: SITE_DESCRIPTION,
    applicationCategory: 'MultimediaApplication',
    operatingSystem: 'Any',
    browserRequirements: 'Requires JavaScript. Modern Chromium, Safari, or Firefox.',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
    },
    featureList: [
      'Neon-green grid line detection for AI sprite sheets',
      'Per-cell refine and smart CV gutter detection',
      STUDIO_COPY.grid.autoDetect,
      'Grid-locked sprite sheet prompt builder',
      'Shared clarity pipeline for preview and GIF export',
      STUDIO_COPY.preview.modeLoop,
      STUDIO_COPY.export.download,
      STUDIO_COPY.export.frameZip,
      STUDIO_COPY.samples,
      STUDIO_COPY.savedVault.title,
    ],
    author: {
      '@type': 'Person',
      name: STUDIO_COPY.footer.author,
      url: STUDIO_COPY.footer.authorUrl,
    },
    codeRepository: STUDIO_COPY.footer.githubUrl,
  };
}
