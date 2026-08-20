'use client';

import Link from 'next/link';
import { EVENT_STATUS_METADATA, EventStatus } from '@mad/shared';

import { useAdminEventsList } from './hooks/useAdminEventsList';
import { AdminEventsTable } from './components/AdminEventsTable';
import { AdminEventsDeleteModals } from './components/AdminEventsDeleteModals';

const EVENT_STATUS_FILTER_OPTIONS = Object.entries(EVENT_STATUS_METADATA);

export default function AdminEventsPage() {
  const {
    canMutateEvents,
    search,
    setSearch,
    statusFilter,
    setStatusFilter,
    setPage,
    sortField,
    sortOrder,
    handleSort,
    deleteTarget,
    setDeleteTarget,
    isBulkDeleteModalOpen,
    setIsBulkDeleteModalOpen,
    toastMessage,
    optimisticStatuses,
    data,
    isLoading,
    isError,
    error,
    refetch,
    bulkSelection,
    deleteMutation,
    statusUpdateMutation,
    bulkDeleteMutation,
  } = useAdminEventsList();

  const events = Array.isArray(data?.items) ? data?.items : [];
  const pagination = data?.pagination;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white">Events</h1>
          <p className="text-text-secondary text-sm mt-0.5">
            {pagination?.total ?? 0} events total
          </p>
        </div>
        {canMutateEvents && (
          <Link
            href="/events/new"
            id="admin-create-event"
            className="px-4 py-2.5 btn-gradient text-white font-semibold text-sm rounded-xl shadow-glow-sm hover:scale-105 transition-transform flex items-center gap-2"
          >
            <span>+</span> Create Event
          </Link>
        )}
      </div>

      {/* Search & Tabs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Tab Buttons */}
        <div className="flex flex-wrap bg-white/5 border border-border-subtle p-1 rounded-xl gap-1">
          <button
            onClick={() => {
              setStatusFilter('');
              setPage(1);
            }}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              statusFilter === ''
                ? 'bg-accent-purple text-white shadow-glow-sm'
                : 'text-text-secondary hover:text-white'
            }`}
          >
            All Statuses
          </button>
          {EVENT_STATUS_FILTER_OPTIONS.map(([value, meta]) => (
            <button
              key={value}
              onClick={() => {
                setStatusFilter(value as EventStatus);
                setPage(1);
              }}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                statusFilter === value
                  ? 'bg-accent-purple text-white shadow-glow-sm'
                  : 'text-text-secondary hover:text-white'
              }`}
            >
              {meta.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-full md:w-72">
          <input
            type="search"
            placeholder="Search events..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-background-card border border-border-subtle text-xs text-text-primary placeholder:text-text-secondary focus:outline-none focus:border-accent-purple focus:ring-2 focus:ring-accent-purple/50 transition-colors"
          />
          <svg
            className="absolute left-3 top-3 h-4 w-4 text-text-muted"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" x2="16.65" y1="21" y2="16.65" />
          </svg>
        </div>
      </div>

      {/* Table Container */}
      <AdminEventsTable
        events={events}
        isLoading={isLoading}
        isError={isError}
        error={error}
        search={search}
        statusFilter={statusFilter}
        refetch={refetch}
        canMutateEvents={canMutateEvents}
        bulkSelection={bulkSelection}
        sortField={sortField}
        sortOrder={sortOrder}
        onSort={handleSort}
        optimisticStatuses={optimisticStatuses}
        statusUpdateMutation={statusUpdateMutation}
        onDeleteClick={(event) => setDeleteTarget(event)}
        pagination={pagination}
        onPageChange={setPage}
      />

      {/* Delete Confirmation Modals & Floating Action Bar */}
      <AdminEventsDeleteModals
        deleteTarget={deleteTarget}
        onCloseDeleteModal={() => setDeleteTarget(null)}
        onConfirmDelete={(id) => deleteMutation.mutate(id)}
        isDeleting={deleteMutation.isPending}
        deleteError={deleteMutation.error}
        isBulkDeleteModalOpen={isBulkDeleteModalOpen}
        onCloseBulkDeleteModal={() => setIsBulkDeleteModalOpen(false)}
        onConfirmBulkDelete={() => bulkDeleteMutation.mutate(Array.from(bulkSelection.selectedIds))}
        isBulkDeleting={bulkDeleteMutation.isPending}
        selectedCount={bulkSelection.selectedCount}
        onClearSelection={bulkSelection.clearSelection}
        onOpenBulkDeleteModal={() => setIsBulkDeleteModalOpen(true)}
      />

      {toastMessage && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-2 fade-in">
          <div
            className={`px-4 py-3 rounded-xl shadow-elevation-high border ${
              toastMessage.type === 'success'
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                : 'bg-error/10 border-error/30 text-red-400'
            }`}
          >
            {toastMessage.text}
          </div>
        </div>
      )}
    </div>
  );
}
