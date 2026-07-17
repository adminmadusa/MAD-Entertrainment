'use client';

import { AdminUser } from '@/lib/api/admin/auth.service';
import { AdminRole } from '@mad/shared';
import type { Admin } from '@mad/types';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, EmptyState } from '@mad/ui';
import { formatDateTime } from '@mad/utils';

const ROLE_LABELS: Record<AdminRole, string> = {
  [AdminRole.SUPER_ADMIN]: 'Super Admin',
  [AdminRole.ADMIN]: 'Admin',
  [AdminRole.MANAGER]: 'Manager',
  [AdminRole.SUPPORT]: 'Support',
  [AdminRole.SCANNER]: 'Scanner',
};

const ROLE_BADGE_STYLES: Record<AdminRole, string> = {
  [AdminRole.SUPER_ADMIN]: 'bg-accent-purple/10 border-accent-purple/30 text-accent-purple',
  [AdminRole.ADMIN]: 'bg-blue-500/10 border-blue-500/30 text-blue-400',
  [AdminRole.MANAGER]: 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400',
  [AdminRole.SUPPORT]: 'bg-green-500/10 border-green-500/30 text-green-400',
  [AdminRole.SCANNER]: 'bg-white/5 border-white/10 text-text-secondary',
};

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface TeamTableProps {
  admins: Admin[];
  isLoading: boolean;
  pagination: Pagination | undefined;
  page: number;
  currentAdmin: AdminUser | null;
  meProfileId: string | undefined;
  onPageChange: (page: number) => void;
  onToggle: (id: string) => void;
  toggleIsPending: boolean;
  onOpenEdit: (admin: Admin) => void;
  onOpenRole: (admin: Admin) => void;
  onOpenReset: (admin: Admin) => void;
}

export default function TeamTable({
  admins,
  isLoading,
  pagination,
  page,
  currentAdmin,
  meProfileId,
  onPageChange,
  onToggle,
  toggleIsPending,
  onOpenEdit,
  onOpenRole,
  onOpenReset,
}: TeamTableProps) {
  const renderRows = () => {
    if (isLoading) {
      return Array.from({ length: 3 }).map((_, i) => (
        <TableRow key={i} className="border-b border-border-subtle/50 animate-pulse">
          <TableCell className="py-4 px-5"><div className="h-4 bg-white/5 rounded w-48" /></TableCell>
          <TableCell className="py-4 px-4"><div className="h-4 bg-white/5 rounded w-20" /></TableCell>
          <TableCell className="py-4 px-4"><div className="h-4 bg-white/5 rounded w-24" /></TableCell>
          <TableCell className="py-4 px-4"><div className="h-4 bg-white/5 rounded w-24" /></TableCell>
          <TableCell className="py-4 px-4"><div className="h-4 bg-white/5 rounded w-16" /></TableCell>
          <TableCell className="py-4 px-5"><div className="h-4 bg-white/5 rounded w-12 ml-auto" /></TableCell>
        </TableRow>
      ));
    }

    if (admins.length === 0) {
      return (
        <TableRow>
          <TableCell colSpan={6} className="py-16">
            <EmptyState title="No admin users registered" description="There are currently no back-office administrative accounts setup." />
          </TableCell>
        </TableRow>
      );
    }

    return admins.map((admin) => (
      <TableRow key={admin._id} className="border-b border-border-subtle/40 hover:bg-white/2 transition-colors">
        <TableCell sticky="start" showStickyDivider className="py-4 px-5">
          <div>
            <p className="text-text-primary font-medium">{admin.name}</p>
            <p className="text-text-secondary text-xs">{admin.email}</p>
          </div>
        </TableCell>
        <TableCell className="py-4 px-4">
          <span className={`text-xs px-2 py-0.5 rounded font-medium border ${ROLE_BADGE_STYLES[admin.role as AdminRole] || ROLE_BADGE_STYLES[AdminRole.ADMIN]}`}>
            {ROLE_LABELS[admin.role as AdminRole] || admin.role}
          </span>
        </TableCell>
        <TableCell className="py-4 px-4 text-text-secondary whitespace-nowrap">
          {admin.createdAt ? formatDateTime(admin.createdAt) : '—'}
        </TableCell>
        <TableCell className="py-4 px-4 text-text-secondary whitespace-nowrap">
          {admin.lastLogin ? formatDateTime(admin.lastLogin) : 'Invited • Awaiting First Login'}
        </TableCell>
        <TableCell className="py-4 px-4">
          <span className={`text-xs px-2.5 py-1 rounded-full border font-medium ${
            admin.isActive
              ? 'bg-green-500/10 text-green-400 border-green-500/30'
              : 'bg-red-500/10 text-red-400 border-red-500/30'
          }`}>
            {admin.isActive ? 'Active' : 'Inactive'}
          </span>
        </TableCell>
        <TableCell sticky="end" showStickyDivider className="py-4 px-5">
          <div className="flex items-center justify-end gap-2">
            {currentAdmin?.role === AdminRole.SUPER_ADMIN ? (
              <>
                <button
                  onClick={() => onOpenEdit(admin)}
                  className="px-2.5 py-1.5 text-xs font-medium glass border border-border-subtle rounded-lg text-text-secondary hover:text-white hover:border-accent-purple/40 transition-all"
                >
                  Edit
                </button>
                <button
                  onClick={() => onOpenRole(admin)}
                  disabled={meProfileId !== undefined && meProfileId === admin._id}
                  className="px-2.5 py-1.5 text-xs font-medium glass border border-border-subtle rounded-lg text-text-secondary hover:text-white hover:border-accent-purple/40 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  title={meProfileId !== undefined && meProfileId === admin._id ? 'You cannot modify your own role' : undefined}
                >
                  Role
                </button>
                <button
                  onClick={() => onOpenReset(admin)}
                  disabled={meProfileId !== undefined && meProfileId === admin._id}
                  className="px-2.5 py-1.5 text-xs font-medium glass border border-border-subtle rounded-lg text-text-secondary hover:text-white hover:border-accent-purple/40 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  title={meProfileId !== undefined && meProfileId === admin._id ? 'Use account settings to change your password' : undefined}
                >
                  Reset
                </button>
                {meProfileId !== undefined && meProfileId !== admin._id ? (
                  <button
                    onClick={() => onToggle(admin._id)}
                    disabled={toggleIsPending}
                    className={`px-2.5 py-1.5 text-xs font-medium border rounded-lg transition-all ${
                      admin.isActive
                        ? 'bg-red-500/10 text-red-400 border-red-500/30 hover:bg-red-500/20'
                        : 'bg-green-500/10 text-green-400 border-green-500/30 hover:bg-green-500/20'
                    }`}
                  >
                    {admin.isActive ? 'Deactivate' : 'Activate'}
                  </button>
                ) : (
                  <span className="text-text-muted text-xs italic px-2 py-1.5">Self</span>
                )}
              </>
            ) : (
              <span className="text-text-muted text-xs">—</span>
            )}
          </div>
        </TableCell>
      </TableRow>
    ));
  };

  return (
    <div className="glass rounded-2xl border border-border-subtle overflow-hidden">
      <Table>
        <TableHeader stickyHeader>
          <TableRow>
            <TableHead sticky="start" showStickyDivider className="py-3.5 px-5">Member</TableHead>
            <TableHead className="py-3.5 px-4">Role</TableHead>
            <TableHead className="py-3.5 px-4">Created</TableHead>
            <TableHead className="py-3.5 px-4">Last Active</TableHead>
            <TableHead className="py-3.5 px-4">Status</TableHead>
            <TableHead sticky="end" showStickyDivider className="py-3.5 px-5 text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>{renderRows()}</TableBody>
      </Table>

      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between px-5 py-3 border-t border-border-subtle">
          <p className="text-text-muted text-xs">
            Page {pagination.page} of {pagination.totalPages} · {pagination.total} members
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => onPageChange(Math.max(1, page - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 text-xs glass border border-border-subtle rounded-lg disabled:opacity-40 text-text-secondary hover:text-white transition-all"
            >
              ← Prev
            </button>
            <button
              onClick={() => onPageChange(page + 1)}
              disabled={page >= pagination.totalPages}
              className="px-3 py-1.5 text-xs glass border border-border-subtle rounded-lg disabled:opacity-40 text-text-secondary hover:text-white transition-all"
            >
              Next →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
