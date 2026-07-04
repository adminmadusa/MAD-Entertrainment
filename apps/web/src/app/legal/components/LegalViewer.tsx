'use client';

import ReactMarkdown from 'react-markdown';
import { LegalMobileTabs } from './LegalMobileTabs';

interface LegalViewerProps {
  title: string;
  lastUpdated: string;
  markdownContent: string;
}

export function LegalViewer({ title, lastUpdated, markdownContent }: LegalViewerProps) {
  return (
    <div className="flex-1 w-full max-w-4xl pb-20">
      <LegalMobileTabs />

      <div className="glass-strong rounded-3xl p-6 sm:p-10 border border-border-subtle">
        <header className="mb-10 pb-6 border-b border-border-subtle/50">
          <h1 className="text-white font-bold text-3xl sm:text-4xl mb-4 tracking-tight">
            {title}
          </h1>
          <p className="text-text-muted text-sm flex items-center gap-2">
            <span>Last Updated:</span>
            <time dateTime={lastUpdated} className="text-text-secondary font-medium">
              {new Date(lastUpdated).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </time>
          </p>
        </header>

        <div className="prose prose-invert prose-p:text-text-secondary prose-headings:text-white prose-a:text-accent-purple hover:prose-a:text-accent-purple-light prose-strong:text-white max-w-none">
          <ReactMarkdown>
            {markdownContent || '*Content is currently being updated.*'}
          </ReactMarkdown>
        </div>
      </div>
    </div>
  );
}
