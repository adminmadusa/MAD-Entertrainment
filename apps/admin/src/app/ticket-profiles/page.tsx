'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { useState } from 'react';
import { adminGetTicketProfiles, adminDeleteTicketProfile, adminUpdateTicketProfile } from '@/lib/api/admin/ticket-profile.service';
import { extractApiError } from '@/lib/api/client';
import ErrorState from '@/components/states/ErrorState';
import { TicketProfile } from '@mad/types';

export default function AdminTicketProfilesPage() {
  const qc = useQueryClient();
  const [deleteTarget, setDeleteTarget] = useState<TicketProfile | null>(null);

  const { data: profiles = [], isLoading, error } = useQuery({
    queryKey: ['admin-ticket-profiles'],
    queryFn: adminGetTicketProfiles,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => adminDeleteTicketProfile(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-ticket-profiles'] });
      setDeleteTarget(null);
    },
  });

  const toggleStatusMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      adminUpdateTicketProfile(id, { isActive }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-ticket-profiles'] });
    },
  });

  if (error) {
    return (
      <div className="py-12">
        <ErrorState message={(error as Error).message || 'Failed to load ticket profiles.'} />
      </div>
    );
  }

  const formatDate = (dateStr: Date | string) => {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getTicketsCount = (profile: TicketProfile) => {
    return profile.groups?.reduce((sum, group) => sum + (group.tickets?.length || 0), 0) || 0;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white">Ticket Profiles</h1>
          <p className="text-text-muted text-sm mt-0.5">
            {profiles.length} reusable ticketing profiles total
          </p>
        </div>
        <Link
          href="/ticket-profiles/new"
          id="admin-create-ticket-profile"
          className="px-4 py-2.5 btn-gradient text-white font-semibold text-sm rounded-xl shadow-glow-sm hover:scale-105 transition-transform flex items-center gap-2"
        >
          <span>+</span> Create Profile
        </Link>
      </div>

      {/* Table */}
      <div className="glass rounded-2xl border border-border-subtle overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="border-b border-border-subtle text-text-muted">
                <th className="py-3.5 px-5 font-medium">Profile Name & Description</th>
                <th className="py-3.5 px-4 font-medium">Groups</th>
                <th className="py-3.5 px-4 font-medium">Total Ticket Tiers</th>
                <th className="py-3.5 px-4 font-medium">Created On</th>
                <th className="py-3.5 px-4 font-medium">Status</th>
                <th className="py-3.5 px-5 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i} className="border-b border-border-subtle/50 animate-pulse">
                    <td className="py-4 px-5"><div className="h-4 bg-white/5 rounded w-48" /></td>
                    <td className="py-4 px-4"><div className="h-4 bg-white/5 rounded w-12" /></td>
                    <td className="py-4 px-4"><div className="h-4 bg-white/5 rounded w-16" /></td>
                    <td className="py-4 px-4"><div className="h-4 bg-white/5 rounded w-24" /></td>
                    <td className="py-4 px-4"><div className="h-4 bg-white/5 rounded w-16" /></td>
                    <td className="py-4 px-5"><div className="h-4 bg-white/5 rounded w-20 ml-auto" /></td>
                  </tr>
                ))
              ) : profiles.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center text-text-muted">
                    No ticket profiles found.{' '}
                    <Link href="/ticket-profiles/new" className="text-accent-purple hover:underline">
                      Create one →
                    </Link>
                  </td>
                </tr>
              ) : (
                profiles.map((profile) => (
                  <tr key={profile._id} className="border-b border-border-subtle/40 hover:bg-white/2 transition-colors">
                    <td className="py-4 px-5">
                      <div>
                        <span className="text-white font-bold text-sm block">
                          {profile.name}
                        </span>
                        {profile.description && (
                          <p className="text-text-muted text-xs mt-1 max-w-xs truncate">{profile.description}</p>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-4 text-text-secondary font-medium">
                      <span className="text-white bg-white/5 px-2.5 py-0.5 rounded-lg border border-white/10 font-mono">
                        {profile.groups?.length || 0}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-text-secondary font-medium">
                      <span className="text-accent-purple-light font-semibold font-mono">
                        {getTicketsCount(profile)}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-text-secondary text-xs">
                      {formatDate(profile.createdAt)}
                    </td>
                    <td className="py-4 px-4">
                      <button
                        onClick={() => toggleStatusMutation.mutate({ id: profile._id, isActive: !profile.isActive })}
                        className={`text-xs px-2.5 py-1 rounded-full border font-medium transition-all ${
                          profile.isActive
                            ? 'bg-green-500/10 text-green-400 border-green-500/30'
                            : 'bg-red-500/10 text-red-400 border-red-500/30'
                        }`}
                      >
                        {profile.isActive ? 'Active' : 'Inactive'}
                      </button>
                    </td>
                    <td className="py-4 px-5">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/ticket-profiles/${profile._id}/edit`}
                          className="px-3 py-1.5 text-xs font-medium glass border border-border-subtle rounded-lg text-text-secondary hover:text-white hover:border-accent-purple/40 transition-all"
                        >
                          Edit
                        </Link>
                        <button
                          onClick={() => setDeleteTarget(profile)}
                          className="px-3 py-1.5 text-xs font-medium glass border border-border-subtle rounded-lg text-text-muted hover:text-red-400 hover:border-red-500/40 transition-all"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete Confirm Modal */}
      <AnimatePresence>
        {deleteTarget && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="glass-strong rounded-2xl border border-border-subtle p-6 max-w-sm w-full"
            >
              <h3 className="text-white font-bold text-lg mb-2">Delete Ticket Profile?</h3>
              <p className="text-text-secondary text-sm mb-1">
                Profile <strong className="text-white">{deleteTarget.name}</strong> will be permanently deleted.
              </p>
              <p className="text-error text-xs mb-5">This action cannot be undone.</p>
              {deleteMutation.error && (
                <p className="text-red-400 text-xs mb-3">{extractApiError(deleteMutation.error).message}</p>
              )}
              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteTarget(null)}
                  className="flex-1 py-2.5 glass border border-border-subtle rounded-xl text-sm font-medium text-text-secondary hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => deleteMutation.mutate(deleteTarget._id)}
                  disabled={deleteMutation.isPending}
                  className="flex-1 py-2.5 bg-error/80 hover:bg-error rounded-xl text-white text-sm font-medium transition-colors disabled:opacity-60"
                >
                  {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
