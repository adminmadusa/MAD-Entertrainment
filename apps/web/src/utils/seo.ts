export const SITE_URL = 'https://madentertainment.in';

export interface BreadcrumbItem {
  name: string;
  url: string;
}

/**
 * Builds standard Schema.org BreadcrumbList JSON-LD structured data.
 * This serves as the single source of truth for SEO breadcrumb generation in the application.
 */
export function buildBreadcrumbJsonLd(items: BreadcrumbItem[]): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, idx) => ({
      '@type': 'ListItem',
      position: idx + 1,
      name: item.name,
      item: item.url,
    })),
  };
}
