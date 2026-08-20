'use client';

function InstagramIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <circle cx="12" cy="12" r="4" />
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
    </svg>
  );
}

function TwitterIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
    </svg>
  );
}

function YouTubeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M22.54 6.42a2.78 2.78 0 0 0-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46A2.78 2.78 0 0 0 1.46 6.42 29 29 0 0 0 1 12a29 29 0 0 0 .46 5.58 2.78 2.78 0 0 0 1.95 1.96C5.12 20 12 20 12 20s6.88 0 8.59-.46a2.78 2.78 0 0 0 1.95-1.96A29 29 0 0 0 23 12a29 29 0 0 0-.46-5.58z" />
      <polygon points="9.75,15.02 15.5,12 9.75,8.98 9.75,15.02" fill="#0B0F1A" />
    </svg>
  );
}

function SoundCloudIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M11.56 16.52c0 .28-.22.5-.5.5h-.75c-.28 0-.5-.22-.5-.5v-6.04c0-.28.22-.5.5-.5h.75c.28 0 .5.22.5.5v6.04zm2.19.5c.28 0 .5-.22.5-.5V8.98c0-.28-.22-.5-.5-.5h-.75c-.28 0-.5.22-.5.5v7.54c0 .28.22.5.5.5h.75zm2.18 0c.28 0 .5-.22.5-.5v-8.3c0-.28-.22-.5-.5-.5h-.75c-.28 0-.5.22-.5.5v8.3c0 .28.22.5.5.5h.75zm2.19-.5c0 .28-.22.5-.5.5h-.75c-.28 0-.5-.22-.5-.5V9.48c0-.28.22-.5.5-.5h.75c.28 0 .5.22.5.5v7.04zm2.19-.75c0 .28-.22.5-.5.5h-.75c-.28 0-.5-.22-.5-.5v-4.54c0-.28.22-.5.5-.5h.75c.28 0 .5.22.5.5v4.54zM2.5 13.5c0-.28.22-.5.5-.5h.75c.28 0 .5.22.5.5V16c0 .28-.22.5-.5.5H3c-.28 0-.5-.22-.5-.5v-2.5zm2.19-1c0-.28.22-.5.5-.5h.75c.28 0 .5.22.5.5V16c0 .28-.22.5-.5.5h-.75c-.28 0-.5-.22-.5-.5v-3.5zm2.19-1.5c0-.28.22-.5.5-.5h.75c.28 0 .5.22.5.5V16c0 .28-.22.5-.5.5h-.75c-.28 0-.5-.22-.5-.5v-5zm2.19-1c0-.28.22-.5.5-.5h.75c.28 0 .5.22.5.5V16c0 .28-.22.5-.5.5h-.75c-.28 0-.5-.22-.5-.5v-6z" />
    </svg>
  );
}

export function normalizeSocialLinks(socialLinks: unknown): { platform: string; url: string }[] {
  if (!socialLinks) return [];
  if (Array.isArray(socialLinks)) {
    return socialLinks
      .map((link: unknown) => {
        const l = link as Record<string, string | undefined> | null | undefined;
        return {
          platform: l?.platform || '',
          url: l?.url || '',
        };
      })
      .filter((link) => link.platform && link.url);
  }
  if (typeof socialLinks === 'object') {
    return Object.entries(socialLinks as Record<string, unknown>)
      .map(([platform, url]) => ({
        platform,
        url: typeof url === 'string' ? url : '',
      }))
      .filter((link) => link.platform && link.url);
  }
  return [];
}

function getSocialIcon(platform: string) {
  const p = platform.toLowerCase();
  switch (p) {
    case 'instagram':
      return <InstagramIcon />;
    case 'twitter':
    case 'x':
      return <TwitterIcon />;
    case 'facebook':
      return <FacebookIcon />;
    case 'youtube':
      return <YouTubeIcon />;
    case 'soundcloud':
      return <SoundCloudIcon />;
    default:
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <line x1="2" y1="12" x2="22" y2="12" />
          <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
        </svg>
      );
  }
}

interface DjSocialLinksProps {
  socialLinks: unknown;
}

export function DjSocialLinks({ socialLinks }: DjSocialLinksProps) {
  const normalized = normalizeSocialLinks(socialLinks);
  if (normalized.length === 0) return null;

  return (
    <div className="glass p-5 md:p-8 rounded-3xl border border-border-subtle bg-bg-card/30 backdrop-blur-md">
      <h2 className="text-xl font-bold text-white mb-4 uppercase tracking-wider border-b border-border-subtle/50 pb-3 flex items-center gap-2 text-glow-neon-cyan">
        <span className="w-1.5 h-6 bg-accent-cyan rounded" />
        Connect
      </h2>
      <div className="flex flex-wrap items-center gap-3 pt-2">
        {normalized.map((link) => (
          <a
            key={link.platform}
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs text-text-secondary hover:text-white transition-all duration-200 border border-transparent hover:border-white/10 shadow-glow-sm hover:scale-[1.03] active:scale-100"
          >
            {getSocialIcon(link.platform)}
            <span className="capitalize font-bold tracking-wide">{link.platform}</span>
          </a>
        ))}
      </div>
    </div>
  );
}
