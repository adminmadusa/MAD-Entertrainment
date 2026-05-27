"use client";

import { AdminRole } from "@mad/shared";
import { Admin } from "@mad/types";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";

import {
  adminGetAdmins,
  adminCreateAdmin,
  adminToggleAdminActive,
} from "@/lib/api/admin/team.service";
import { adminApiClient, extractApiError } from "@/lib/api/client";
import ErrorState from "@/components/states/ErrorState";

export default function AdminTeamPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [isInviteOpen, setIsInviteOpen] = useState(false);

  // Invite states
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState(AdminRole.ADMIN);
  const [inviteError, setInviteError] = useState("");

  // Fetch logged in admin to prevent deactivating self
  const { data: meProfile } = useQuery({
    queryKey: ["admin-profile-me"],
    queryFn: async () => {
      const { data } = await adminApiClient.get<{ data: { admin: Admin } }>(
        "/admin/auth/me",
      );
      return data.data.admin;
    },
  });

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-team", page],
    queryFn: () => adminGetAdmins(page, 15),
  });

  const toggleMutation = useMutation({
    mutationFn: (id: string) => adminToggleAdminActive(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-team"] }),
  });

  const inviteMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) => adminCreateAdmin(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-team"] });
      setIsInviteOpen(false);
      setName("");
      setEmail("");
      setPassword("");
      setRole(AdminRole.ADMIN);
      setInviteError("");
    },
    onError: (err) => setInviteError(extractApiError(err).message),
  });

  const admins = data?.items ?? [];
  const pagination = data?.pagination;

  if (error) {
    return (
      <div className="py-12">
        <ErrorState
          message={(error as Error).message || "Failed to load team members."}
        />
      </div>
    );
  }

  const handleInviteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setInviteError("");

    if (!name.trim() || !email.trim() || !password) {
      setInviteError("All fields are required.");
      return;
    }

    inviteMutation.mutate({
      name: name.trim(),
      email: email.trim(),
      password,
      role,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white">Team Management</h1>
          <p className="text-text-muted text-sm mt-0.5">
            Manage administrative personnel
          </p>
        </div>
        <button
          onClick={() => setIsInviteOpen(true)}
          className="px-4 py-2.5 btn-gradient text-white font-semibold text-sm rounded-xl shadow-glow-sm hover:scale-105 transition-transform flex items-center gap-2"
        >
          <span>+</span> Invite Member
        </button>
      </div>

      {/* Table */}
      <div className="glass rounded-2xl border border-border-subtle overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-subtle">
                <th className="text-left text-text-muted font-medium py-3.5 px-5">
                  Member
                </th>
                <th className="text-left text-text-muted font-medium py-3.5 px-4">
                  Role
                </th>
                <th className="text-left text-text-muted font-medium py-3.5 px-4">
                  Last Active
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
                Array.from({ length: 3 }).map((_, i) => (
                  <tr
                    key={i}
                    className="border-b border-border-subtle/50 animate-pulse"
                  >
                    <td className="py-4 px-5">
                      <div className="h-4 bg-white/5 rounded w-48" />
                    </td>
                    <td className="py-4 px-4">
                      <div className="h-4 bg-white/5 rounded w-20" />
                    </td>
                    <td className="py-4 px-4">
                      <div className="h-4 bg-white/5 rounded w-24" />
                    </td>
                    <td className="py-4 px-4">
                      <div className="h-4 bg-white/5 rounded w-16" />
                    </td>
                    <td className="py-4 px-5">
                      <div className="h-4 bg-white/5 rounded w-12 ml-auto" />
                    </td>
                  </tr>
                ))
              ) : admins.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-16 text-center text-text-muted">
                    No team members registered.
                  </td>
                </tr>
              ) : (
                admins.map((admin) => (
                  <tr
                    key={admin._id}
                    className="border-b border-border-subtle/40 hover:bg-white/2 transition-colors"
                  >
                    <td className="py-4 px-5">
                      <div>
                        <p className="text-text-primary font-medium">
                          {admin.name}
                        </p>
                        <p className="text-text-muted text-xs">{admin.email}</p>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <span
                        className={`text-xs px-2 py-0.5 rounded font-medium capitalize border ${
                          admin.role === AdminRole.SUPER_ADMIN
                            ? "bg-accent-purple/10 border-accent-purple/30 text-accent-purple"
                            : "bg-white/5 border-white/10 text-text-secondary"
                        }`}
                      >
                        {admin.role.replace("_", " ")}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-text-secondary">
                      {admin.lastLogin
                        ? new Date(admin.lastLogin).toLocaleDateString(
                            "en-IN",
                            {
                              day: "numeric",
                              month: "short",
                              hour: "2-digit",
                              minute: "2-digit",
                            },
                          )
                        : "Never logged in"}
                    </td>
                    <td className="py-4 px-4">
                      <span
                        className={`text-xs px-2.5 py-1 rounded-full border font-medium ${
                          admin.isActive
                            ? "bg-green-500/10 text-green-400 border-green-500/30"
                            : "bg-red-500/10 text-red-400 border-red-500/30"
                        }`}
                      >
                        {admin.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="py-4 px-5 text-right">
                      {meProfile && meProfile._id !== admin._id ? (
                        <button
                          onClick={() => toggleMutation.mutate(admin._id)}
                          disabled={toggleMutation.isPending}
                          className={`text-xs font-semibold hover:underline ${
                            admin.isActive ? "text-error" : "text-green-400"
                          }`}
                        >
                          {admin.isActive ? "Deactivate" : "Activate"}
                        </button>
                      ) : (
                        <span className="text-text-muted text-xs italic">
                          Logged in
                        </span>
                      )}
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
              {pagination.total} members
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 text-xs glass border border-border-subtle rounded-lg disabled:opacity-40 text-text-secondary hover:text-white transition-all"
              >
                ← Prev
              </button>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={page >= pagination.totalPages}
                className="px-3 py-1.5 text-xs glass border border-border-subtle rounded-lg disabled:opacity-40 text-text-secondary hover:text-white transition-all"
              >
                Next →
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Invite Member Modal */}
      <AnimatePresence>
        {isInviteOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="glass-strong rounded-2xl border border-border-subtle p-6 max-w-md w-full space-y-4"
            >
              <div>
                <h3 className="text-white font-bold text-lg">
                  Invite Team Member
                </h3>
                <p className="text-text-muted text-xs">
                  Assign access credentials and roles
                </p>
              </div>

              {inviteError && (
                <div className="px-4 py-2.5 bg-error/10 border border-error/30 rounded-xl text-xs text-red-400">
                  {inviteError}
                </div>
              )}

              <form onSubmit={handleInviteSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-text-secondary text-xs font-medium block">
                    Full Name
                  </label>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. John Doe"
                    required
                    className={inputCls}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-text-secondary text-xs font-medium block">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. john@madentertrainment.com"
                    required
                    className={inputCls}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-text-secondary text-xs font-medium block">
                    Access Password
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min 8 characters, complex"
                    required
                    className={inputCls}
                  />
                  <p className="text-[10px] text-text-muted leading-relaxed">
                    Must contain at least 8 chars, 1 uppercase, 1 lowercase, 1
                    number, and 1 special character.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-text-secondary text-xs font-medium block">
                    Dashboard Role
                  </label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as AdminRole)}
                    className={inputCls}
                  >
                    <option
                      value={AdminRole.ADMIN}
                      className="bg-background-card"
                    >
                      Standard Admin
                    </option>
                    <option
                      value={AdminRole.SUPER_ADMIN}
                      className="bg-background-card"
                    >
                      Super Admin (full controls)
                    </option>
                  </select>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsInviteOpen(false);
                      setInviteError("");
                    }}
                    className="flex-1 py-2.5 glass border border-border-subtle rounded-xl text-sm font-medium text-text-secondary hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={inviteMutation.isPending}
                    className="flex-1 py-2.5 btn-gradient text-white font-bold rounded-xl shadow-glow-sm disabled:opacity-60 transition-all text-sm"
                  >
                    {inviteMutation.isPending ? "Inviting..." : "Invite"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

const inputCls =
  "w-full px-4 py-2.5 rounded-xl bg-background border border-border-subtle text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-purple transition-colors";
