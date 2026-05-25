'use client';

import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';
import { useParams } from 'next/navigation';

import { publicGetDJBySlug } from '@/lib/api/public.service';

export default function DJDetailClient() {
  const params = useParams();
  const slug = params.slug as string;

  const { data: dj, isLoading, error } = useQuery({
    queryKey: ['public-dj', slug],
    queryFn: () => publicGetDJBySlug(slug),
  });

  if (isLoading) {
    return (
      <div className="pt-32 pb-20 min-h-screen bg-background flex flex-col items-center justify-center">
        <div className="w-12 h-12 border-4 border-accent-purple border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-text-muted">Loading profile...</p>
      </div>
    );
  }

  if (error || !dj) {
    return (
      <div className="pt-32 pb-20 min-h-screen bg-background flex flex-col items-center justify-center">
        <h1 className="text-3xl font-bold text-white mb-4">DJ Not Found</h1>
        <p className="text-text-muted mb-8">The DJ Operator you are looking for does not exist.</p>
        <Link href="/dj-operators" className="btn-gradient text-white px-6 py-2 rounded-xl">
          Back to DJs
        </Link>
      </div>
    );
  }

  return (
    <div className="pt-24 min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative w-full h-[50vh] min-h-[400px] overflow-hidden">
        {dj.profileImage?.url ? (
          <Image
            src={dj.profileImage.url}
            alt={dj.name}
            fill
            className="object-cover opacity-40 blur-md"
            priority
          />
        ) : (
          <div className="absolute inset-0 bg-background-secondary" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-transparent" />
        
        <div className="absolute inset-0 flex items-center pt-10">
          <div className="container-mad w-full flex flex-col md:flex-row items-center gap-8 md:gap-12">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
              className="relative w-48 h-48 md:w-64 md:h-64 rounded-full overflow-hidden border-4 border-accent-purple/30 shadow-glow"
            >
              {dj.profileImage?.url ? (
                <Image
                  src={dj.profileImage.url}
                  alt={dj.name}
                  fill
                  className="object-cover"
                  priority
                />
              ) : (
                <div className="w-full h-full bg-white/5 flex items-center justify-center">
                  <span className="text-text-muted text-lg">No Image</span>
                </div>
              )}
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="text-center md:text-left flex-1"
            >
              {dj.isActive && (
                <span className="inline-block px-3 py-1 mb-4 text-xs font-bold rounded-lg bg-green-500/20 text-green-400 border border-green-500/30">
                  AVAILABLE FOR BOOKING
                </span>
              )}
              <h1 className="text-display-md font-black text-white mb-2">{dj.name}</h1>
              {dj.experienceYears && (
                <p className="text-lg text-text-secondary mb-6">
                  {dj.experienceYears}+ Years of Experience
                </p>
              )}
              <Link href="/events">
                <button className="btn-gradient text-white px-8 py-3 rounded-2xl font-bold shadow-glow hover:scale-105 transition-transform">
                  View Upcoming Events
                </button>
              </Link>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Details Section */}
      <section className="py-16">
        <div className="container-mad max-w-4xl">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            {/* Main Content */}
            <div className="md:col-span-2 space-y-10">
              {dj.bio && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                >
                  <h2 className="text-2xl font-bold text-white mb-4">About</h2>
                  <div className="glass p-6 md:p-8 rounded-2xl border border-border-subtle prose prose-invert max-w-none">
                    <p className="text-text-secondary leading-relaxed whitespace-pre-wrap">{dj.bio}</p>
                  </div>
                </motion.div>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {dj.specialties && dj.specialties.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  className="glass p-6 rounded-2xl border border-border-subtle"
                >
                  <h3 className="text-lg font-bold text-white mb-4">Specialties</h3>
                  <div className="flex flex-wrap gap-2">
                    {dj.specialties.map((spec) => (
                      <span key={spec} className="px-3 py-1 bg-white/5 border border-white/10 text-text-secondary rounded-lg text-sm">
                        {spec}
                      </span>
                    ))}
                  </div>
                </motion.div>
              )}

              {dj.socialLinks && Object.keys(dj.socialLinks).length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  className="glass p-6 rounded-2xl border border-border-subtle"
                >
                  <h3 className="text-lg font-bold text-white mb-4">Connect</h3>
                  <div className="space-y-3">
                    {Object.entries(dj.socialLinks).map(([platform, url]) => {
                      if (!url) return null;
                      return (
                        <a
                          key={platform}
                          href={url as string}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/10 text-text-secondary hover:text-white transition-colors border border-transparent hover:border-white/10"
                        >
                          <span className="capitalize font-medium">{platform}</span>
                          <svg className="w-4 h-4 ml-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                        </a>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
