import type { Metadata } from 'next';

// Constants extracted to reduce duplication and bundle size
const SITE_CONFIG = {
  name: 'starscout',
  description: 'Search through your github stars using AI',
  url: 'https://starscout.xyz',
  ogImage: '/og-image.png',
} as const;

const SOCIAL_TITLES = {
  openGraph: 'starscout - AI-Powered GitHub Stars Search',
  twitter: 'starscout - AI-Powered GitHub Stars Search',
} as const;

/**
 * Generates base metadata for the application
 * This function runs only on the server, keeping metadata out of client bundle
 */
export function generateBaseMetadata(): Metadata {
  return {
    title: SITE_CONFIG.name,
    description: SITE_CONFIG.description,
    metadataBase: new URL(SITE_CONFIG.url),
    openGraph: {
      title: SOCIAL_TITLES.openGraph,
      description: SITE_CONFIG.description,
      type: 'website',
      url: SITE_CONFIG.url,
      images: [
        {
          url: SITE_CONFIG.ogImage,
          width: 1200,
          height: 630,
          alt: SOCIAL_TITLES.openGraph,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: SOCIAL_TITLES.twitter,
      description: SITE_CONFIG.description,
      images: [SITE_CONFIG.ogImage],
    },
    icons: {
      icon: [
        { url: '/icon.svg', type: 'image/svg+xml' },
      ],
    },
  };
}

/**
 * Generates page-specific metadata
 * @param title - Page specific title (will be appended to site name)
 * @param description - Page specific description
 */
export function generatePageMetadata(
  title?: string,
  description?: string
): Metadata {
  const baseMetadata = generateBaseMetadata();
  
  if (!title && !description) {
    return baseMetadata;
  }

  const pageTitle = title ? `${title} | ${SITE_CONFIG.name}` : SITE_CONFIG.name;
  const pageDescription = description || SITE_CONFIG.description;

  return {
    ...baseMetadata,
    title: pageTitle,
    description: pageDescription,
    openGraph: {
      ...baseMetadata.openGraph,
      title: title ? `${title} | ${SOCIAL_TITLES.openGraph}` : SOCIAL_TITLES.openGraph,
      description: pageDescription,
    },
    twitter: {
      ...baseMetadata.twitter,
      title: title ? `${title} | ${SOCIAL_TITLES.twitter}` : SOCIAL_TITLES.twitter,
      description: pageDescription,
    },
  };
} 