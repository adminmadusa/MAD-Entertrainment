import { Metadata, ResolvingMetadata } from 'next';

import { publicGetDJBySlug } from '@/lib/api/public.service';

import DJDetailClient from './dj-detail-client';

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata(
  { params }: Props,
  parent: ResolvingMetadata
): Promise<Metadata> {
  const { slug } = await params;

  try {
    const dj = await publicGetDJBySlug(slug);

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
        url: `https://madentertainment.in/dj-operators/${slug}`,
        siteName: 'MAD Entertainment',
        images: bannerUrl ? [{ url: bannerUrl, width: 800, height: 800 }] : previousImages,
        locale: 'en_IN',
        type: 'profile',
      },
    };
  } catch {
    return {
      title: 'DJ Operator | MAD Entertainment',
    };
  }
}

export default function DJPage() {
  return <DJDetailClient />;
}
