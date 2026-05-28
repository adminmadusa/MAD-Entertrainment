"use client";

import { Artist } from "@mad/types";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useState } from "react";

import {
  adminGetArtists,
  adminDeleteArtist,
  adminUpdateArtist,
} from "@/lib/api/admin/artist.service";
import { extractApiError } from "@/lib/api/client";
import ErrorState from "@/components/states/ErrorState";

export default function AdminArtistsPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [deleteTarget, setDeleteTarget] = useState<Artist | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-artists", { page, search }],
    queryFn: () => adminGetArtists({ page, limit: 15, search }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => adminDeleteArtist(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-artists"] });
      setDeleteTarget(null);
    },
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      adminUpdateArtist(id, { isActive }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-artists"] }),
  });

  const artists = data?.items ?? [];
  const pagination = data?.pagination;

  if (error) {
    return (
      <div className="py-12">
        <ErrorState
          message={(error as Error).message || "Failed to load artists."}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white">Artists</h1>
          <p className="text-text-muted text-sm mt-0.5">
            {pagination?.total ?? 0} artists total
          </p>
        </div>
        <Link
          href="/artists/new"
          id="admin-create-artist"
          className="px-4 py-2.5 btn-gradient text-white font-semibold text-sm rounded-xl shadow-glow-sm motion-safe:hover:scale-105 transition-transform motion-reduce:transition-none flex items-center gap-2"
        >
          <span>+</span> Add Artist
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <input
          type="search"
          aria-label="Search artists"
          placeholder="Search artists..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="flex-1 min-w-0 sm:min-w-48 px-4 py-2.5 rounded-xl bg-background-card border border-border-subtle text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-purple focus-visible:ring-2 focus-visible:ring-accent-purple transition-colors"
        />
      </div>

      {/* Table */}
      <div
        className="glass rounded-2xl border border-border-subtle overflow-hidden min-h-[360px]"
        aria-busy={isLoading}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-subtle">
                <th className="text-left text-text-muted font-medium py-3.5 px-5">
                  Artist
                </th>
                <th className="text-left text-text-muted font-medium py-3.5 px-4">
                  Bio
                </th>
                <th className="text-left text-text-muted font-medium py-3.5 px-4">
                  Genre
                </th>
                <th className="text-left text-text-muted font-medium py-3.5 px-4">
                  Status
                </th>
                <th className="text-right text-text-muted font-medium py-3.5 px-5">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr
                    key={i}
                    className="border-b border-border-subtle/50 animate-pulse motion-reduce:animate-none"
                  >
                    <td className="py-4 px-5">
                      <div className="h-4 bg-white/5 rounded w-48" />
                    </td>
                    <td className="py-4 px-4">
                      <div className="h-4 bg-white/5 rounded w-48" />
                    </td>
                    <td className="py-4 px-4">
                      <div className="h-4 bg-white/5 rounded w-20" />
                    </td>
                    <td className="py-4 px-4">
                      <div className="h-4 bg-white/5 rounded w-12" />
                    </td>
                    <td className="py-4 px-5">
                      <div className="h-4 bg-white/5 rounded w-20 ml-auto" />
                    </td>
                  </tr>
                ))
              ) : artists.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10">
                    <div className="min-h-[240px] flex flex-col items-center justify-center gap-3 text-center">
                      <p className="text-white text-sm font-medium">
                        No artists found
                      </p>
                      <p className="text-text-muted text-xs">
                        Try adjusting filters or add your first artist.
                      </p>
                      <Link
                        href="/artists/new"
                        className="text-accent-purple text-sm hover:underline"
                      >
                        Add your first artist →
                      </Link>
                    </div>
                  </td>
                </tr>
              ) : (
                artists.map((artist) => (
                  <tr
                    key={artist._id}
                    className="border-b border-border-subtle/40 hover:bg-white/2 transition-colors"
                  >
                    <td className="py-4 px-5">
                      <div className="flex items-center gap-3">
                        {artist.profileImage?.url ? (
                          <div className="w-10 h-10 rounded-full overflow-hidden bg-white/5 flex-shrink-0">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={artist.profileImage.url}
                              alt={artist.name}
                              loading="lazy"
                              decoding="async"
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-accent-purple/10 flex-shrink-0 flex items-center justify-center text-accent-purple text-xs font-bold">
                            {artist.name[0]}
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="text-text-primary font-medium truncate max-w-52">
                            {artist.name}
                          </p>
                          <p className="text-text-muted text-xs truncate">
                            {artist.slug}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-text-secondary">
                      <p className="truncate max-w-xs text-xs">
                        {artist.bio || "—"}
                      </p>
                    </td>
                    <td className="py-4 px-4 text-text-secondary">
                      <div className="flex flex-wrap gap-1 max-w-40">
                        {artist.genre && artist.genre.length > 0 ? (
                          artist.genre.map((g) => (
                            <span
                              key={g}
                              className="text-[10px] px-2 py-0.5 rounded bg-white/5 border border-white/10 text-text-secondary capitalize"
                            >
                              {g}
                            </span>
                          ))
                        ) : (
                          <span className="text-text-muted text-xs">—</span>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <button
                        onClick={() =>
                          statusMutation.mutate({
                            id: artist._id,
                            isActive: !artist.isActive,
                          })
                        }
                        className={`text-xs px-2.5 py-1 rounded-full border font-medium transition-all motion-reduce:transition-none ${
                          artist.isActive
                            ? "bg-green-500/10 text-green-400 border-green-500/30"
                            : "bg-red-500/10 text-red-400 border-red-500/30"
                        }`}
                      >
                        {artist.isActive ? "Active" : "Inactive"}
                      </button>
                    </td>
                    <td className="py-4 px-5">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/artists/${artist._id}/edit`}
                          className="px-3 py-1.5 text-xs font-medium glass border border-border-subtle rounded-lg text-text-secondary hover:text-white hover:border-accent-purple/40 transition-all motion-reduce:transition-none"
                        >
                          Edit
                        </Link>
                        <button
                          onClick={() => setDeleteTarget(artist)}
                          className="px-3 py-1.5 text-xs font-medium glass border border-border-subtle rounded-lg text-text-muted hover:text-red-400 hover:border-red-500/40 transition-all motion-reduce:transition-none"
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

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-border-subtle">
            <p className="text-text-muted text-xs">
              Page {pagination.page} of {pagination.totalPages} ·{" "}
              {pagination.total} artists
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 text-xs glass border border-border-subtle rounded-lg disabled:opacity-40 text-text-secondary hover:text-white transition-all motion-reduce:transition-none"
              >
                ← Prev
              </button>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={page >= pagination.totalPages}
                className="px-3 py-1.5 text-xs glass border border-border-subtle rounded-lg disabled:opacity-40 text-text-secondary hover:text-white transition-all motion-reduce:transition-none"
              >
                Next →
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirm Modal */}
      <AnimatePresence>
        {deleteTarget && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 sm:p-6 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="glass-strong rounded-2xl border border-border-subtle p-4 sm:p-6 max-w-sm w-full my-auto max-h-[90vh] overflow-y-auto"
            >
              <h3 className="text-white font-bold text-lg mb-2">
                Delete Artist?
              </h3>
              <p className="text-text-secondary text-sm mb-1">
                <strong className="text-white">{deleteTarget.name}</strong> will
                be permanently deleted.
              </p>
              <p className="text-error text-xs mb-5">
                This action cannot be undone.
              </p>
              {deleteMutation.error && (
                <p className="text-red-400 text-xs mb-3">
                  {extractApiError(deleteMutation.error).message}
                </p>
              )}
              <div className="flex flex-col-reverse sm:flex-row gap-3">
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
                  {deleteMutation.isPending ? "Deleting..." : "Delete"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
