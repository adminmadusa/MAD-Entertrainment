import fs from 'fs/promises';
import path from 'path';
import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import { legalDocuments } from '@/content/legalDocuments';
import { LegalViewer } from '../components/LegalViewer';

interface LegalDocPageProps {
  params: Promise<{ doc: string }>;
}

export async function generateStaticParams() {
  return legalDocuments.map((doc) => ({
    doc: doc.slug,
  }));
}

export async function generateMetadata({ params }: LegalDocPageProps): Promise<Metadata> {
  const resolvedParams = await params;
  const docMeta = legalDocuments.find((d) => d.slug === resolvedParams.doc);

  if (!docMeta) {
    return {
      title: 'Document Not Found | MAD Entertainment',
    };
  }

  return {
    title: `${docMeta.title} | MAD Entertainment`,
    description: docMeta.description,
    alternates: {
      canonical: `https://madentertainment.in/legal/${docMeta.slug}`,
    },
  };
}

export default async function LegalDocPage({ params }: LegalDocPageProps) {
  const resolvedParams = await params;
  const docMeta = legalDocuments.find((d) => d.slug === resolvedParams.doc);

  if (!docMeta) {
    notFound();
  }

  const contentPath = path.join(process.cwd(), 'src/content/legal', `${docMeta.slug}.md`);
  let content = '';

  try {
    content = await fs.readFile(contentPath, 'utf8');
  } catch (error) {
    // If the file doesn't exist, we fallback to a placeholder text or throw an error.
    console.error(`Failed to read markdown for ${docMeta.slug}`);
    content = 'Content is currently being updated.';
  }

  return (
    <LegalViewer
      title={docMeta.title}
      lastUpdated={docMeta.lastUpdated}
      markdownContent={content}
    />
  );
}
