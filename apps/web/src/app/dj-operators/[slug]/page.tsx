import { Metadata, ResolvingMetadata } from 'next';

import { getCachedDJ } from '@/utils/cache-fetcher';
import { buildBreadcrumbJsonLd, SITE_URL } from '@/utils/seo';

import DJDetailClient from './DjDetailClient';

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata(
  { params }: Props,
  parent: ResolvingMetadata
): Promise<Metadata> {
  const { slug } = await params;

  try {
    const dj = await getCachedDJ(slug);

    if (!dj) {
      return {
        title: 'DJ Not Found | MAD Entertainment',
      };
    }

    const previousImages = (await parent).openGraph?.images || [];
    const bannerUrl = dj.profileImage?.url;

    return {
      title: `${dj.name} | DJ Operator | MAD Entertainment`,
      description: dj.bio?.substring(0, 160) || `Check out ${dj.name} on MAD Entertainment.`,
      openGraph: {
        title: dj.name,
        description: dj.bio?.substring(0, 160),
        url: `${SITE_URL}/dj-operators/${slug}`,
        siteName: 'MAD Entertainment',
        images: bannerUrl ? [{ url: bannerUrl, width: 800, height: 800 }] : previousImages,
        locale: 'en_US',
        type: 'profile',
      },
    };
  } catch {
    return {
      title: 'DJ Operator | MAD Entertainment',
    };
  }
}

export default async function DJPage({ params }: Props) {
  const { slug } = await params;
  let dj: Awaited<ReturnType<typeof getCachedDJ>> | undefined;
  try {
    dj = await getCachedDJ(slug);
  } catch {
    // Swallow — client component will re-fetch if needed
  }

  return (
    <>
      {dj && (
        <script
          type="application/ld+json"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(
              buildBreadcrumbJsonLd([
                { name: 'Home', url: SITE_URL },
                { name: 'DJs', url: `${SITE_URL}/dj-operators` },
                { name: dj.name, url: `${SITE_URL}/dj-operators/${slug}` },
              ])
            ),
          }}
        />
      )}
      <DJDetailClient slug={slug} initialDJ={dj ?? undefined} />
    </>
  );
}
