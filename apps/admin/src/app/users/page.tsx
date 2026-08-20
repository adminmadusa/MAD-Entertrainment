'use client';

import { useQuery } from '@tanstack/react-query';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import React, { useState, useEffect, useCallback } from 'react';

import { adminGetUsers } from '@/lib/api/admin/user.service';
import { useAdminAuth } from '@/providers/AdminAuthProvider';
import { AdminRole } from '@mad/shared';
import { ErrorState, TablePagination } from '@mad/ui';

import { UsersMobileCards } from './components/UsersMobileCards';
import { UsersTable } from './components/UsersTable';

export default function UsersDirectoryPage() {
  const { admin } = useAdminAuth();
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  // ─── URL Query Parsing ───────────────────────────────────────
  const typeParam = (searchParams.get('type') as 'registered' | 'guest') || 'registered';
  const pageParam = parseInt(searchParams.get('page') || '1', 10);
  const limitParam = parseInt(searchParams.get('limit') || '20', 10);
  const searchParam = searchParams.get('search') || '';
  const sortFieldParam = searchParams.get('sortField') || 'createdAt';
  const sortOrderParam = (searchParams.get('sortOrder') as 'asc' | 'desc') || 'desc';

  // Search input state
  const [searchInput, setSearchInput] = useState(searchParam);

  // Helper to update query parameters
  const updateUrlParams = useCallback((newParams: Record<string, string | number | null>) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(newParams).forEach(([key, value]) => {
      if (value === null || value === '') {
        params.delete(key);
      } else {
        params.set(key, String(value));
      }
    });
    router.push(`${pathname}?${params.toString()}`);
  }, [searchParams, router, pathname]);

  // Sync back searchParam to input when searchParam changes (e.g. Back button or reset)
  useEffect(() => {
    setSearchInput(searchParam);
  }, [searchParam]);

  // Sync debounced search to URL
  useEffect(() => {
    const handler = setTimeout(() => {
      if (searchInput !== searchParam) {
        updateUrlParams({ search: searchInput || null, page: 1 });
      }
    }, 300);
    return () => clearTimeout(handler);
  }, [searchInput, searchParam, updateUrlParams]);

  // ─── Fetch Data ──────────────────────────────────────────────
  const { data, isLoading, error } = useQuery({
    queryKey: ['admin-users', typeParam, pageParam, limitParam, searchParam, sortFieldParam, sortOrderParam],
    queryFn: () =>
      adminGetUsers({
        page: pageParam,
        limit: limitParam,
        search: searchParam,
        type: typeParam,
        sortField: sortFieldParam,
        sortOrder: sortOrderParam,
      }),
  });

  // ─── Route Protection ────────────────────────────────────────
  if (admin && admin.role === AdminRole.SCANNER) {
    return (
      <div className="py-12">
        <ErrorState message="Access Denied: You do not have permissions to view this resource." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-12">
        <ErrorState
          message={(error as Error).message || 'Failed to load customers.'}
          retry={() => router.refresh()}
        />
      </div>
    );
  }

  const items = data?.items ?? [];
  const pagination = data?.pagination;

  // Handles sort header toggles
  const handleSort = (field: string) => {
    const isAsc = sortFieldParam === field && sortOrderParam === 'asc';
    updateUrlParams({
      sortField: field,
      sortOrder: isAsc ? 'desc' : 'asc',
      page: 1,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-white">Users Directory</h1>
        <p className="text-text-muted text-sm mt-0.5">
          Manage registered customer profiles and guest purchasers
        </p>
      </div>

      {/* Tabs & Filters */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        {/* Tab Buttons */}
        <div className="flex bg-white/5 border border-border-subtle p-1 rounded-xl">
          <button
            onClick={() => updateUrlParams({ type: 'registered', page: 1 })}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
              typeParam === 'registered'
                ? 'bg-accent-purple text-white shadow-glow-sm'
                : 'text-text-secondary hover:text-white'
            }`}
          >
            Registered Customers
          </button>
          <button
            onClick={() => updateUrlParams({ type: 'guest', page: 1 })}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
              typeParam === 'guest'
                ? 'bg-accent-purple text-white shadow-glow-sm'
                : 'text-text-secondary hover:text-white'
            }`}
          >
            Guest Customers
          </button>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-72">
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search name, email, phone..."
            className="w-full pl-9 pr-8 py-2.5 rounded-xl bg-background-card border border-border-subtle text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent-purple/50 focus:border-accent-purple transition-colors"
          />
          <svg className="absolute left-3 top-3 h-4 w-4 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" /><line x1="21" x2="16.65" y1="21" y2="16.65" />
          </svg>
          {searchInput && (
            <button
              onClick={() => setSearchInput('')}
              className="absolute right-3 top-3 text-text-muted hover:text-white"
            >
              ×
            </button>
          )}
        </div>
      </div>

      {/* Main Grid View */}
      {/* Desktop/Tablet Table Grid */}
      <div className="hidden md:block glass rounded-2xl border border-border-subtle overflow-hidden">
        <UsersTable
          items={items}
          isLoading={isLoading}
          searchParam={searchParam}
          sortFieldParam={sortFieldParam}
          sortOrderParam={sortOrderParam}
          onSort={handleSort}
        />

        {pagination && pagination.totalPages > 1 && (
          <TablePagination
            currentPage={pageParam}
            totalPages={pagination.totalPages}
            onPageChange={(page) => updateUrlParams({ page })}
            totalRecords={pagination.total}
            recordsLabel="records"
          />
        )}
      </div>

      {/* Mobile Card Grid */}
      <div className="block md:hidden space-y-4">
        <UsersMobileCards
          items={items}
          isLoading={isLoading}
          searchParam={searchParam}
        />

        {/* Mobile Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <div className="flex items-center justify-between p-1 bg-white/5 border border-border-subtle rounded-xl">
            <button
              onClick={() => updateUrlParams({ page: Math.max(1, pageParam - 1) })}
              disabled={pageParam === 1}
              className="flex-1 py-2 text-center text-xs font-semibold disabled:opacity-40 text-text-secondary hover:text-white transition-all"
            >
              ← Prev
            </button>
            <span className="px-3 text-text-muted text-xs">
              Page {pagination.page} / {pagination.totalPages}
            </span>
            <button
              onClick={() => updateUrlParams({ page: pageParam + 1 })}
              disabled={pageParam >= pagination.totalPages}
              className="flex-1 py-2 text-center text-xs font-semibold disabled:opacity-40 text-text-secondary hover:text-white transition-all"
            >
              Next →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
