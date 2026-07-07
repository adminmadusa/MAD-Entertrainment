'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { useState } from 'react';

import { adminGetTicketProfiles, adminDeleteTicketProfile, adminUpdateTicketProfile } from '@/lib/api/admin/ticket-profile.service';
import { adminGetTiers, adminCreateTier, adminUpdateTier, adminDeleteTier, type AdminTier } from '@/lib/api/admin/tier.service';
import { extractApiError } from '@/lib/api/client';
import { useAdminAuth } from '@/providers/AdminAuthProvider';
import { AdminRole } from '@mad/shared';
import type { TicketProfile } from '@mad/types';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, ErrorState } from '@mad/ui';
import { formatDate } from '@mad/utils';

// Color Presets for swatches
const COLOR_PRESETS = [
  { hex: '#6366F1', name: 'Indigo' },
  { hex: '#8B5CF6', name: 'Violet' },
  { hex: '#F59E0B', name: 'Amber' },
  { hex: '#F43F5E', name: 'Rose' },
  { hex: '#10B981', name: 'Emerald' },
  { hex: '#0EA5E9', name: 'Sky' },
  { hex: '#EC4899', name: 'Pink' },
  { hex: '#64748B', name: 'Slate' }
];

// Icon Presets
const ICON_PRESETS = [
  { id: 'ticket', label: 'Ticket' },
  { id: 'star', label: 'Star' },
  { id: 'medal', label: 'Medal' },
  { id: 'crown', label: 'Crown' },
  { id: 'lock', label: 'Lock' },
  { id: 'users', label: 'Users' },
  { id: 'heart', label: 'Heart' },
  { id: 'clock', label: 'Clock' },
  { id: 'gift', label: 'Gift' }
];

function getTierIcon(iconName: string) {
  switch (iconName) {
    case 'star':
      return <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>;
    case 'medal':
      return <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>;
    case 'crown':
      return <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 4l3 12h14l3-12-6 7-4-7-4 7-6-7z"/></svg>;
    case 'lock':
      return <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>;
    case 'users':
      return <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>;
    case 'heart':
      return <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>;
    case 'clock':
      return <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>;
    case 'gift':
      return <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="8" width="18" height="14" rx="2"/><path d="M12 5V22M19 12H5M12 5a3 3 0 1 0-3-3M12 5a3 3 0 1 1 3-3"/></svg>;
    case 'ticket':
    default:
      return <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2z"/><line x1="9" y1="12" x2="15" y2="12"/></svg>;
  }
}

export default function TicketManagementPage() {
  const { admin } = useAdminAuth();
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<'profiles' | 'tiers'>('profiles');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Authorization Checkers
  const canMutate = !!admin?.role && [AdminRole.SUPER_ADMIN, AdminRole.ADMIN, AdminRole.MANAGER].includes(admin.role as AdminRole);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  return (
    <div className="space-y-6">
      {/* Toast Alert */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-6 right-6 z-50 px-4 py-3 bg-accent-purple text-white font-semibold text-sm rounded-xl shadow-glow"
          >
            {toastMessage}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-white">Ticket Management</h1>
        <p className="text-text-muted text-sm mt-0.5">Configure reusable ticket structures and visual pricing tiers</p>
      </div>

      {/* Tab Navigation Menu */}
      <div className="flex flex-wrap border-b border-border-subtle" role="tablist" aria-label="Ticket Management Subtabs">
        <button
          onClick={() => setActiveTab('profiles')}
          role="tab"
          aria-selected={activeTab === 'profiles'}
          className={`px-6 py-3 font-semibold text-sm transition-all border-b-2 -mb-[2px] ${
            activeTab === 'profiles'
              ? 'border-accent-purple text-accent-purple-light'
              : 'border-transparent text-text-secondary hover:text-text-primary'
          }`}
        >
          Ticket Profiles
        </button>
        <button
          onClick={() => setActiveTab('tiers')}
          role="tab"
          aria-selected={activeTab === 'tiers'}
          className={`px-6 py-3 font-semibold text-sm transition-all border-b-2 -mb-[2px] ${
            activeTab === 'tiers'
              ? 'border-accent-purple text-accent-purple-light'
              : 'border-transparent text-text-secondary hover:text-text-primary'
          }`}
        >
          Ticket Tiers
        </button>

        {/* Future disabled tabs for discovery */}
        <button
          disabled
          className="px-6 py-3 font-semibold text-sm text-text-muted/40 cursor-not-allowed flex items-center gap-1.5"
        >
          <span>Categories</span>
          <span className="text-[8px] font-bold tracking-wider uppercase px-1 py-0.5 rounded bg-white/5 text-text-muted/30">Soon</span>
        </button>
        <button
          disabled
          className="px-6 py-3 font-semibold text-sm text-text-muted/40 cursor-not-allowed flex items-center gap-1.5"
        >
          <span>Offers</span>
          <span className="text-[8px] font-bold tracking-wider uppercase px-1 py-0.5 rounded bg-white/5 text-text-muted/30">Soon</span>
        </button>
        <button
          disabled
          className="px-6 py-3 font-semibold text-sm text-text-muted/40 cursor-not-allowed flex items-center gap-1.5"
        >
          <span>Pricing Rules</span>
          <span className="text-[8px] font-bold tracking-wider uppercase px-1 py-0.5 rounded bg-white/5 text-text-muted/30">Soon</span>
        </button>
      </div>

      {activeTab === 'profiles' ? (
        <TicketProfilesTab canMutate={canMutate} qc={qc} showToast={showToast} />
      ) : (
        <TicketTiersTab canMutate={canMutate} qc={qc} showToast={showToast} />
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// TICKET PROFILES TAB
// ──────────────────────────────────────────────────────────────
interface TabProps {
  canMutate: boolean;
  qc: ReturnType<typeof useQueryClient>;
  showToast: (msg: string) => void;
}

function TicketProfilesTab({ canMutate, qc, showToast }: TabProps) {
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
      showToast('Ticket profile deleted successfully');
    },
  });

  const toggleStatusMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      adminUpdateTicketProfile(id, { isActive }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-ticket-profiles'] });
      showToast('Status updated successfully');
    },
  });

  if (error) {
    return (
      <div className="py-12">
        <ErrorState message={(error as Error).message || 'Failed to load ticket profiles.'} />
      </div>
    );
  }

  const getTicketsCount = (profile: TicketProfile) => {
    return profile.groups?.reduce((sum, group) => sum + (group.tickets?.length || 0), 0) || 0;
  };

  const renderTableBody = () => {
    if (isLoading) {
      return Array.from({ length: 3 }).map((_, i) => (
        <TableRow key={i} className="border-b border-border-subtle/50 animate-pulse">
          <TableCell className="py-4 px-5"><div className="h-4 bg-white/5 rounded w-48" /></TableCell>
          <TableCell className="py-4 px-4"><div className="h-4 bg-white/5 rounded w-12" /></TableCell>
          <TableCell className="py-4 px-4"><div className="h-4 bg-white/5 rounded w-16" /></TableCell>
          <TableCell className="py-4 px-4"><div className="h-4 bg-white/5 rounded w-24" /></TableCell>
          <TableCell className="py-4 px-4"><div className="h-4 bg-white/5 rounded w-16" /></TableCell>
          <TableCell className="py-4 px-5"><div className="h-4 bg-white/5 rounded w-20 ml-auto" /></TableCell>
        </TableRow>
      ));
    }

    if (profiles.length === 0) {
      return (
        <TableRow>
          <TableCell colSpan={6} className="py-16 text-center text-text-muted text-sm">
            No ticket profiles found.{' '}
            <Link href="/ticket-profiles/new" className="text-accent-purple hover:underline font-semibold">
              Create one →
            </Link>
          </TableCell>
        </TableRow>
      );
    }

    return profiles.map((profile) => (
      <TableRow key={profile._id} className="border-b border-border-subtle/40 hover:bg-white/2 transition-colors">
        <TableCell className="py-4 px-5">
          <div>
            <span className="text-white font-bold text-sm block">
              {profile.name}
            </span>
            {profile.description && (
              <p className="text-text-muted text-xs mt-1 max-w-xs truncate">{profile.description}</p>
            )}
          </div>
        </TableCell>
        <TableCell className="py-4 px-4 text-text-secondary font-medium">
          <span className="text-white bg-white/5 px-2.5 py-0.5 rounded-lg border border-white/10 font-mono text-xs">
            {profile.groups?.length || 0}
          </span>
        </TableCell>
        <TableCell className="py-4 px-4 text-text-secondary font-medium">
          <span className="text-accent-purple-light font-semibold font-mono text-xs">
            {getTicketsCount(profile)}
          </span>
        </TableCell>
        <TableCell className="py-4 px-4 text-text-secondary text-xs">
          {formatDate(profile.createdAt)}
        </TableCell>
        <TableCell className="py-4 px-4">
          {canMutate ? (
            <button
              onClick={() => toggleStatusMutation.mutate({ id: profile._id, isActive: !profile.isActive })}
              className={`text-xs px-2.5 py-1 rounded-full border font-medium transition-all ${
                profile.isActive
                  ? 'bg-green-500/10 text-green-400 border-green-500/30 hover:bg-green-500/20'
                  : 'bg-red-500/10 text-red-400 border-red-500/30 hover:bg-red-500/20'
              }`}
            >
              {profile.isActive ? 'Active' : 'Inactive'}
            </button>
          ) : (
            <span className={`text-xs px-2.5 py-1 rounded-full border font-medium ${
              profile.isActive
                ? 'bg-green-500/10 text-green-400 border-green-500/30'
                : 'bg-red-500/10 text-red-400 border-red-500/30'
            }`}>
              {profile.isActive ? 'Active' : 'Inactive'}
            </span>
          )}
        </TableCell>
        <TableCell className="py-4 px-5">
          {canMutate ? (
            <div className="flex items-center justify-end gap-2">
              <Link
                href={`/ticket-profiles/${profile._id}/edit`}
                className="px-3 py-1.5 text-xs font-semibold glass border border-border-subtle rounded-lg text-text-secondary hover:text-white hover:border-accent-purple/40 transition-all"
              >
                Edit
              </Link>
              <button
                onClick={() => setDeleteTarget(profile)}
                className="px-3 py-1.5 text-xs font-semibold glass border border-border-subtle rounded-lg text-text-muted hover:text-red-400 hover:border-red-500/40 transition-all"
              >
                Delete
              </button>
            </div>
          ) : (
            <div className="text-right text-text-muted">—</div>
          )}
        </TableCell>
      </TableRow>
    ));
  };

  return (
    <div className="space-y-6">
      {/* Create Button Banner */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-white font-bold text-lg">Reusable Ticket Profiles</h2>
          <p className="text-text-secondary text-xs mt-0.5">Profiles outline complete ticket groupings and restrictions</p>
        </div>
        {canMutate && (
          <Link
            href="/ticket-profiles/new"
            className="px-4 py-2.5 btn-gradient text-white font-semibold text-sm rounded-xl shadow-glow-sm hover:scale-[1.02] transition-transform flex items-center gap-1.5"
          >
            <span>+</span> Create Profile
          </Link>
        )}
      </div>

      {/* Table grid */}
      <div className="glass rounded-2xl border border-border-subtle overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="py-3.5 px-5">Profile Name & Description</TableHead>
              <TableHead className="py-3.5 px-4">Groups</TableHead>
              <TableHead className="py-3.5 px-4">Total Ticket Tiers</TableHead>
              <TableHead className="py-3.5 px-4">Created On</TableHead>
              <TableHead className="py-3.5 px-4">Status</TableHead>
              <TableHead className="py-3.5 px-5 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {renderTableBody()}
          </TableBody>
        </Table>
      </div>

      {/* Reusable dialog modal */}
      <AnimatePresence>
        {deleteTarget && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="glass-strong rounded-2xl border border-border-subtle p-6 max-w-sm w-full"
            >
              <h2 className="text-white font-bold text-lg mb-2">Delete Ticket Profile?</h2>
              <p className="text-text-secondary text-sm mb-1">
                Profile <strong className="text-white">{deleteTarget.name}</strong> will be permanently deleted.
              </p>
              <p className="text-error text-xs mb-5 font-semibold">This action cannot be undone.</p>
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

// ──────────────────────────────────────────────────────────────
// TICKET TIERS TAB (MODERN VISUAL OVERHAUL)
// ──────────────────────────────────────────────────────────────
function TicketTiersTab({ canMutate, qc, showToast }: TabProps) {
  const [nameInput, setNameInput] = useState('');
  const [descInput, setDescInput] = useState('');
  const [colorInput, setColorInput] = useState('#6366F1');
  const [iconInput, setIconInput] = useState('ticket');
  const [defaultVisInput, setDefaultVisInput] = useState(true);
  const [sortIdxInput, setSortIdxInput] = useState(0);

  const [editingTier, setEditingTier] = useState<AdminTier | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [validationError, setValidationError] = useState<string | null>(null);

  const { data: tiers = [], isLoading, error } = useQuery({
    queryKey: ['adminTiers'],
    queryFn: adminGetTiers,
  });

  const createMutation = useMutation({
    mutationFn: adminCreateTier,
    onSuccess: () => {
      setNameInput('');
      setDescInput('');
      setColorInput('#6366F1');
      setIconInput('ticket');
      setDefaultVisInput(true);
      setSortIdxInput(0);
      setValidationError(null);
      qc.invalidateQueries({ queryKey: ['adminTiers'] });
      showToast('Ticket tier created successfully');
    },
    onError: (err) => setValidationError(extractApiError(err).message),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<AdminTier> }) =>
      adminUpdateTier(id, payload),
    onSuccess: () => {
      setEditingTier(null);
      setValidationError(null);
      qc.invalidateQueries({ queryKey: ['adminTiers'] });
      showToast('Ticket tier updated successfully');
    },
    onError: (err) => setValidationError(extractApiError(err).message),
  });

  const deleteMutation = useMutation({
    mutationFn: adminDeleteTier,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['adminTiers'] });
      showToast('Ticket tier deleted successfully');
    },
  });

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);
    if (!nameInput.trim()) return;

    // HEX regex validation
    if (!/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(colorInput.trim())) {
      setValidationError('Invalid color format. Please enter a valid Hex code (e.g. #FFFFFF).');
      return;
    }

    createMutation.mutate({
      name: nameInput.trim(),
      description: descInput.trim(),
      color: colorInput.trim(),
      icon: iconInput,
      defaultVisibility: defaultVisInput,
      sortIndex: Number(sortIdxInput),
      isActive: true
    });
  };

  const handleEditSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTier) return;
    setValidationError(null);

    if (!editingTier.name.trim()) return;
    if (editingTier.color && !/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(editingTier.color.trim())) {
      setValidationError('Invalid color format. Please enter a valid Hex code.');
      return;
    }

    updateMutation.mutate({
      id: editingTier._id,
      payload: {
        name: editingTier.name.trim(),
        description: editingTier.description?.trim() || '',
        color: editingTier.color?.trim() || '#6366F1',
        icon: editingTier.icon || 'ticket',
        defaultVisibility: editingTier.defaultVisibility,
        sortIndex: Number(editingTier.sortIndex || 0),
        isActive: editingTier.isActive
      }
    });
  };

  const handleDelete = (id: string) => {
    if (!confirm('Are you sure you want to delete this ticket tier? Existing events referencing it will continue to render normally.')) return;
    deleteMutation.mutate(id);
  };

  if (error) {
    return (
      <div className="py-12">
        <ErrorState message={(error as Error).message || 'Failed to load ticket tiers.'} />
      </div>
    );
  }

  // Filters logic
  const filteredTiers = tiers.filter((t) => {
    const matchesSearch = t.name.toLowerCase().includes(searchQuery.toLowerCase()) || t.slug.includes(searchQuery.toLowerCase());
    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'active' && t.isActive !== false) ||
      (statusFilter === 'inactive' && t.isActive === false);
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Search and Filters panel */}
      <div className="glass p-4 rounded-2xl border border-border-subtle flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="relative w-full sm:max-w-xs">
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search tiers by name or slug..."
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-background border border-border-subtle text-sm text-text-primary focus:outline-none focus:border-accent-purple"
          />
          <svg className="absolute left-3 top-2.5 w-4 h-4 text-text-muted" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
        </div>

        <div className="flex gap-2 w-full sm:w-auto">
          <button
            onClick={() => setStatusFilter('all')}
            className={`flex-1 sm:flex-initial px-3.5 py-1.5 text-xs font-bold rounded-lg border transition-all ${
              statusFilter === 'all'
                ? 'bg-accent-purple/20 text-accent-purple-light border-accent-purple/30'
                : 'glass border-border-subtle text-text-secondary hover:text-white'
            }`}
          >
            All Tiers
          </button>
          <button
            onClick={() => setStatusFilter('active')}
            className={`flex-1 sm:flex-initial px-3.5 py-1.5 text-xs font-bold rounded-lg border transition-all ${
              statusFilter === 'active'
                ? 'bg-green-500/10 text-green-400 border-green-500/20'
                : 'glass border-border-subtle text-text-secondary hover:text-white'
            }`}
          >
            Active
          </button>
          <button
            onClick={() => setStatusFilter('inactive')}
            className={`flex-1 sm:flex-initial px-3.5 py-1.5 text-xs font-bold rounded-lg border transition-all ${
              statusFilter === 'inactive'
                ? 'bg-red-500/10 text-red-400 border-red-500/20'
                : 'glass border-border-subtle text-text-secondary hover:text-white'
            }`}
          >
            Inactive
          </button>
        </div>
      </div>

      {validationError && (
        <div className="px-4 py-3 bg-error/10 border border-error/30 rounded-xl text-sm text-red-400">
          {validationError}
        </div>
      )}

      {/* Grid Layout (Desktop 2-col, Mobile 1-col) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">

        {/* Left column: Visual Configurator Form */}
        {canMutate && (
          <div className="lg:col-span-1 space-y-6">

            {/* Live Preview Ticket Card */}
            <div className="glass rounded-2xl border border-border-subtle p-5 overflow-hidden relative flex flex-col justify-between h-48 bg-gradient-to-br from-white/5 to-white/0 shadow-glow-sm">
              <div className="absolute top-0 right-0 w-24 h-24 rounded-full filter blur-2xl opacity-20" style={{ backgroundColor: colorInput }} />

              <div className="flex justify-between items-start">
                <div className="flex items-center gap-2.5">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-md transition-all"
                    style={{ backgroundColor: colorInput }}
                  >
                    {getTierIcon(iconInput)}
                  </div>
                  <div>
                    <h4 className="text-white font-black text-sm uppercase tracking-wider">{nameInput || 'Tier Title'}</h4>
                    <p className="text-[10px] text-text-muted font-mono">{nameInput.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'slug-auto-preview'}</p>
                  </div>
                </div>
                <span className="text-[9px] font-bold tracking-widest uppercase px-2 py-0.5 rounded bg-white/10 text-white/90">
                  Preview
                </span>
              </div>

              <p className="text-text-secondary text-xs line-clamp-2 italic pr-4">
                {descInput || 'Write a short description to guide customers on checkout...'}
              </p>

              <div className="flex justify-between items-center border-t border-white/5 pt-3">
                <span className="text-[10px] text-text-muted">Visibility: {defaultVisInput ? 'Visible' : 'Hidden'}</span>
                <span className="text-xs font-bold font-mono" style={{ color: colorInput }}>Order: {sortIdxInput}</span>
              </div>
            </div>

            {/* Quick Add Form */}
            <div className="glass rounded-2xl border border-border-subtle p-6 space-y-4">
              <h3 className="text-white font-bold text-md">Add New Ticket Tier</h3>
              <form onSubmit={handleAddSubmit} className="space-y-4">
                <div>
                  <label className="text-text-secondary text-xs font-bold block mb-1.5">Tier Name</label>
                  <input
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    placeholder="e.g. VIP VIP Backstage"
                    required
                    className="w-full px-4 py-2.5 rounded-xl bg-background border border-border-subtle text-sm text-text-primary focus:outline-none focus:border-accent-purple"
                  />
                </div>

                <div>
                  <label className="text-text-secondary text-xs font-bold block mb-1.5">Description</label>
                  <textarea
                    value={descInput}
                    onChange={(e) => setDescInput(e.target.value)}
                    placeholder="Describe tier privileges..."
                    rows={2}
                    className="w-full px-4 py-2.5 rounded-xl bg-background border border-border-subtle text-sm text-text-primary focus:outline-none focus:border-accent-purple resize-none"
                  />
                </div>

                {/* Swatch Color Picker */}
                <div>
                  <label className="text-text-secondary text-xs font-bold block mb-1.5">Accent Color</label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {COLOR_PRESETS.map((preset) => (
                      <button
                        key={preset.hex}
                        type="button"
                        onClick={() => setColorInput(preset.hex)}
                        title={preset.name}
                        className={`w-6 h-6 rounded-full border transition-all ${
                          colorInput === preset.hex ? 'scale-125 border-white ring-2 ring-accent-purple/50' : 'border-transparent hover:scale-110'
                        }`}
                        style={{ backgroundColor: preset.hex }}
                      />
                    ))}
                  </div>
                  <input
                    value={colorInput}
                    onChange={(e) => setColorInput(e.target.value)}
                    placeholder="Hex code, e.g. #6366F1"
                    className="w-full px-4 py-2 rounded-xl bg-background border border-border-subtle text-xs text-text-primary focus:outline-none focus:border-accent-purple font-mono"
                  />
                </div>

                {/* Grid Icon Picker */}
                <div>
                  <label className="text-text-secondary text-xs font-bold block mb-1.5">Badge Icon</label>
                  <div className="grid grid-cols-5 gap-2">
                    {ICON_PRESETS.map((icon) => (
                      <button
                        key={icon.id}
                        type="button"
                        onClick={() => setIconInput(icon.id)}
                        title={icon.label}
                        className={`py-2 rounded-xl border flex items-center justify-center transition-all ${
                          iconInput === icon.id
                            ? 'bg-accent-purple/10 text-accent-purple-light border-accent-purple/30'
                            : 'glass border-border-subtle text-text-secondary hover:text-white'
                        }`}
                      >
                        {getTierIcon(icon.id)}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Additional Settings */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-text-secondary text-xs font-bold block mb-1.5">Sort Position</label>
                    <input
                      type="number"
                      min="0"
                      value={sortIdxInput}
                      onChange={(e) => setSortIdxInput(Number(e.target.value))}
                      className="w-full px-4 py-2 rounded-xl bg-background border border-border-subtle text-sm text-text-primary focus:outline-none focus:border-accent-purple font-mono"
                    />
                  </div>
                  <div className="flex flex-col justify-end pb-2">
                    <label className="flex items-center gap-2 text-text-secondary text-xs font-bold cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={defaultVisInput}
                        onChange={(e) => setDefaultVisInput(e.target.checked)}
                        className="rounded bg-background border-border-subtle text-accent-purple focus:ring-accent-purple"
                      />
                      Default Visible
                    </label>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="w-full py-2.5 btn-gradient text-white text-sm font-bold rounded-xl shadow-glow-sm disabled:opacity-60 transition-all"
                >
                  Create Custom Tier
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Right column: Tiers Log Manager */}
        <div className={`${canMutate ? 'lg:col-span-2' : 'lg:col-span-3'} space-y-4`}>
          <div className="flex justify-between items-center">
            <h3 className="text-white font-bold text-md capitalize">Active System Tiers</h3>
            <span className="text-xs bg-white/5 border border-white/10 text-text-secondary font-bold px-2.5 py-0.5 rounded-full">
              {filteredTiers.length} items
            </span>
          </div>

          {isLoading ? (
            <div className="p-12 text-center text-text-muted text-sm animate-pulse">Loading tiers...</div>
          ) : filteredTiers.length === 0 ? (
            <div className="p-12 text-center text-text-muted text-sm border border-dashed border-border-subtle rounded-2xl glass">
              No matching ticket tiers defined. Configure presets on the left.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {filteredTiers.map((tier) => (
                <div
                  key={tier._id}
                  className="glass p-5 rounded-2xl border border-border-subtle flex flex-col justify-between gap-4 hover:border-white/10 transition-colors relative"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-white"
                        style={{ backgroundColor: tier.color || '#6366F1' }}
                      >
                        {getTierIcon(tier.icon || 'ticket')}
                      </div>
                      <div>
                        <h4 className="text-white font-bold text-sm">{tier.name}</h4>
                        <p className="text-[10px] text-text-muted font-mono">{tier.slug}</p>
                      </div>
                    </div>

                    {canMutate && (
                      <span className="text-[9px] font-bold text-text-muted font-mono bg-white/5 px-2 py-0.5 rounded border border-white/5">
                        Index: {tier.sortIndex ?? 0}
                      </span>
                    )}
                  </div>

                  <p className="text-text-secondary text-xs line-clamp-2">
                    {tier.description || <span className="text-text-muted/40 italic">No description provided.</span>}
                  </p>

                  <div className="flex items-center justify-between pt-3 border-t border-white/5">
                    <span className="text-[10px] text-text-muted">
                      Default: {tier.defaultVisibility !== false ? 'Visible' : 'Hidden'}
                    </span>

                    {canMutate && (
                      <div className="flex items-center gap-2">
                        {/* Status Toggle Switch */}
                        <button
                          onClick={() =>
                            updateMutation.mutate({
                              id: tier._id,
                              payload: { isActive: tier.isActive === false }
                            })
                          }
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border transition-all ${
                            tier.isActive !== false
                              ? 'bg-green-500/10 text-green-400 border-green-500/20'
                              : 'bg-red-500/10 text-red-400 border-red-500/20'
                          }`}
                        >
                          {tier.isActive !== false ? 'Active' : 'Inactive'}
                        </button>

                        <button
                          onClick={() => setEditingTier(tier)}
                          className="px-2.5 py-1 text-[11px] font-semibold glass border border-border-subtle rounded-lg text-text-secondary hover:text-white transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(tier._id)}
                          className="px-2.5 py-1 text-[11px] font-semibold glass border border-border-subtle rounded-lg text-text-muted hover:text-red-400 hover:border-red-500/40 transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Editing Dialog Modal */}
      <AnimatePresence>
        {editingTier && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="glass-strong rounded-2xl border border-border-subtle p-6 max-w-md w-full space-y-4"
            >
              <h2 className="text-white font-bold text-lg">Edit Ticket Tier</h2>
              <form onSubmit={handleEditSave} className="space-y-4">
                <div>
                  <label className="text-text-secondary text-xs font-bold block mb-1">Tier Name</label>
                  <input
                    value={editingTier.name}
                    onChange={(e) => setEditingTier({ ...editingTier, name: e.target.value })}
                    required
                    className="w-full px-4 py-2 rounded-xl bg-background border border-border-subtle text-sm text-text-primary focus:outline-none focus:border-accent-purple"
                  />
                </div>

                <div>
                  <label className="text-text-secondary text-xs font-bold block mb-1">Description</label>
                  <textarea
                    value={editingTier.description || ''}
                    onChange={(e) => setEditingTier({ ...editingTier, description: e.target.value })}
                    rows={2}
                    className="w-full px-4 py-2 rounded-xl bg-background border border-border-subtle text-sm text-text-primary focus:outline-none focus:border-accent-purple resize-none"
                  />
                </div>

                {/* Color edit swatches */}
                <div>
                  <label className="text-text-secondary text-xs font-bold block mb-1">Accent Color</label>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {COLOR_PRESETS.map((preset) => (
                      <button
                        key={preset.hex}
                        type="button"
                        onClick={() => setEditingTier({ ...editingTier, color: preset.hex })}
                        className={`w-5 h-5 rounded-full border transition-all ${
                          editingTier.color === preset.hex ? 'scale-110 border-white' : 'border-transparent'
                        }`}
                        style={{ backgroundColor: preset.hex }}
                      />
                    ))}
                  </div>
                  <input
                    value={editingTier.color || ''}
                    onChange={(e) => setEditingTier({ ...editingTier, color: e.target.value })}
                    className="w-full px-4 py-2 rounded-xl bg-background border border-border-subtle text-xs text-text-primary focus:outline-none focus:border-accent-purple font-mono"
                  />
                </div>

                {/* Icon edit picker */}
                <div>
                  <label className="text-text-secondary text-xs font-bold block mb-1">Icon Badge</label>
                  <div className="grid grid-cols-5 gap-1.5">
                    {ICON_PRESETS.map((icon) => (
                      <button
                        key={icon.id}
                        type="button"
                        onClick={() => setEditingTier({ ...editingTier, icon: icon.id })}
                        className={`py-1.5 rounded-lg border flex items-center justify-center transition-all ${
                          editingTier.icon === icon.id
                            ? 'bg-accent-purple/10 text-accent-purple-light border-accent-purple/30'
                            : 'glass border-border-subtle text-text-secondary hover:text-white'
                        }`}
                      >
                        {getTierIcon(icon.id)}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-text-secondary text-xs font-bold block mb-1">Sort Position</label>
                    <input
                      type="number"
                      min="0"
                      value={editingTier.sortIndex ?? 0}
                      onChange={(e) => setEditingTier({ ...editingTier, sortIndex: Number(e.target.value) })}
                      className="w-full px-4 py-2 rounded-xl bg-background border border-border-subtle text-sm text-text-primary focus:outline-none focus:border-accent-purple font-mono"
                    />
                  </div>
                  <div className="flex flex-col justify-end pb-2">
                    <label className="flex items-center gap-2 text-text-secondary text-xs font-bold cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={editingTier.defaultVisibility !== false}
                        onChange={(e) => setEditingTier({ ...editingTier, defaultVisibility: e.target.checked })}
                        className="rounded bg-background border-border-subtle text-accent-purple focus:ring-accent-purple"
                      />
                      Visible
                    </label>
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setEditingTier(null)}
                    className="flex-1 py-2.5 glass border border-border-subtle rounded-xl text-sm font-medium text-text-secondary hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={updateMutation.isPending}
                    className="flex-1 py-2.5 btn-gradient text-white text-sm font-bold rounded-xl shadow-glow-sm disabled:opacity-60 transition-all"
                  >
                    {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
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
