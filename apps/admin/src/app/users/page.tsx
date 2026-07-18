'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import React, { useState, useEffect, useCallback } from 'react';

import { adminGetUsers } from '@/lib/api/admin/user.service';
import { useAdminAuth } from '@/providers/AdminAuthProvider';
import { AdminRole } from '@mad/shared';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, ErrorState, EmptyState, TablePagination } from '@mad/ui';
import { Users, Search } from '@mad/ui/icons';
import { formatDateTime } from '@mad/utils';

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

  // ─── Render Table Body ───────────────────────────────────────
  const renderTableRows = () => {
    if (isLoading) {
      return Array.from({ length: 5 }).map((_, i) => (
        <TableRow key={i} className="border-b border-border-subtle/50 animate-pulse">
          <TableCell className="py-4 px-5">
            <div className="h-4 bg-white/5 rounded w-36 mb-1.5" />
            <div className="h-3 bg-white/5 rounded w-48" />
          </TableCell>
          <TableCell className="py-4 px-4 hidden lg:table-cell">
            <div className="h-4 bg-white/5 rounded w-28" />
          </TableCell>
          <TableCell className="py-4 px-4 hidden md:table-cell">
            <div className="h-4 bg-white/5 rounded w-16" />
          </TableCell>
          <TableCell className="py-4 px-4 hidden lg:table-cell">
            <div className="h-4 bg-white/5 rounded w-24" />
          </TableCell>
          <TableCell className="py-4 px-4">
            <div className="h-4 bg-white/5 rounded w-16" />
          </TableCell>
          <TableCell className="py-4 px-5 text-right">
            <div className="h-4 bg-white/5 rounded w-16 ml-auto" />
          </TableCell>
        </TableRow>
      ));
    }

    if (items.length === 0) {
      return (
        <TableRow>
          <TableCell colSpan={6} className="py-8">
            <EmptyState
              variant="table"
              icon={searchParam ? <Search /> : <Users />}
              title={searchParam ? "No results match your search." : "No customer records found."}
              description={searchParam ? "Try changing your search criteria." : undefined}
            />
          </TableCell>
        </TableRow>
      );
    }

    return items.map((user) => (
      <TableRow key={user.email} className="border-b border-border-subtle/40 hover:bg-white/2 transition-colors">
        <TableCell className="py-4 px-5">
          <div>
            <p className="text-text-primary font-medium">{user.name}</p>
            <p className="text-text-secondary text-xs font-mono">{user.email}</p>
          </div>
        </TableCell>
        <TableCell className="py-4 px-4 text-text-secondary hidden lg:table-cell font-mono text-xs">
          {user.phone}
        </TableCell>
        <TableCell className="py-4 px-4 hidden md:table-cell">
          <span className={`text-[10px] px-2 py-0.5 rounded font-medium border capitalize ${
            user.loginVia === 'google'
              ? 'bg-blue-500/10 border-blue-500/20 text-blue-400'
              : user.loginVia === 'otp'
              ? 'bg-accent-purple/10 border-accent-purple/20 text-accent-purple'
              : 'bg-white/5 border-white/10 text-text-secondary'
          }`}>
            {user.loginVia || 'Guest'}
          </span>
        </TableCell>
        <TableCell className="py-4 px-4 text-text-secondary hidden lg:table-cell text-xs">
          {formatDateTime(user.createdAt)}
        </TableCell>
        <TableCell className="py-4 px-4">
          {user.accountType === 'registered' ? (
            <span className={`text-[10px] px-2.5 py-1 rounded-full border font-medium ${
              user.isActive
                ? 'bg-green-500/10 text-green-400 border-green-500/30'
                : 'bg-red-500/10 text-red-400 border-red-500/30'
            }`}>
              {user.isActive ? 'Active' : 'Suspended'}
            </span>
          ) : (
            <span className="text-[10px] px-2.5 py-1 rounded-full border font-medium bg-white/5 text-text-muted border-white/10">
              Guest Checkout
            </span>
          )}
        </TableCell>
        <TableCell className="py-4 px-5 text-right">
          <Link
            href={
              user.accountType === 'registered'
                ? `/users/${user.id}`
                : `/users/guest/${encodeURIComponent(user.email)}`
            }
            className="text-xs font-semibold text-accent-purple hover:underline"
          >
            View Profile
          </Link>
        </TableCell>
      </TableRow>
    ));
  };

  // ─── Render Mobile Cards ─────────────────────────────────────
  const renderMobileCards = () => {
    if (isLoading) {
      return Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="glass p-4 rounded-xl space-y-3 animate-pulse">
          <div className="h-4 bg-white/5 rounded w-1/2" />
          <div className="h-3 bg-white/5 rounded w-3/4" />
          <div className="h-3 bg-white/5 rounded w-1/3" />
          <div className="h-8 bg-white/5 rounded w-full mt-2" />
        </div>
      ));
    }

    if (items.length === 0) {
      return (
        <div className="glass p-8 rounded-xl text-center text-text-muted text-sm">
          {searchParam ? 'No customers match your search criteria.' : 'No customer records found.'}
        </div>
      );
    }

    return items.map((user) => (
      <div key={user.email} className="glass p-4 rounded-xl border border-border-subtle/50 space-y-2.5">
        <div className="flex justify-between items-start">
          <div>
            <h4 className="text-white font-semibold text-sm">{user.name}</h4>
            <p className="text-text-muted text-xs font-mono">{user.email}</p>
          </div>
          {user.accountType === 'registered' ? (
            <span className={`text-[9px] px-2 py-0.5 rounded-full border font-medium ${
              user.isActive
                ? 'bg-green-500/10 text-green-400 border-green-500/30'
                : 'bg-red-500/10 text-red-400 border-red-500/30'
            }`}>
              {user.isActive ? 'Active' : 'Suspended'}
            </span>
          ) : (
            <span className="text-[9px] px-2 py-0.5 rounded-full border font-medium bg-white/5 text-text-muted border-white/10">
              Guest
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2 pt-1.5 text-xs text-text-secondary border-t border-white/5">
          <div>
            <span className="text-[10px] text-text-muted block">Phone</span>
            <span className="font-mono">{user.phone}</span>
          </div>
          <div>
            <span className="text-[10px] text-text-muted block">Login Via</span>
            <span className="capitalize">{user.loginVia || 'Guest Checkout'}</span>
          </div>
        </div>

        <Link
          href={
            user.accountType === 'registered'
              ? `/users/${user.id}`
              : `/users/guest/${encodeURIComponent(user.email)}`
          }
          className="block w-full py-2 bg-white/5 hover:bg-white/10 border border-border-subtle rounded-lg text-center text-xs font-semibold text-white transition-all mt-2"
        >
          View Profile
        </Link>
      </div>
    ));
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
        <Table className="min-w-[900px]">
          <TableHeader>
            <TableRow className="bg-white/[0.01]">
              <TableHead
                onClick={() => handleSort('name')}
                className="py-3.5 px-5 cursor-pointer hover:text-white select-none"
              >
                Customer {sortFieldParam === 'name' ? (sortOrderParam === 'asc' ? '↑' : '↓') : ''}
              </TableHead>
              <TableHead className="py-3.5 px-4 hidden lg:table-cell">
                Phone
              </TableHead>
              <TableHead className="py-3.5 px-4 hidden md:table-cell">
                Login Via
              </TableHead>
              <TableHead
                onClick={() => handleSort('createdAt')}
                className="py-3.5 px-4 hidden lg:table-cell cursor-pointer hover:text-white select-none"
              >
                Joined {sortFieldParam === 'createdAt' ? (sortOrderParam === 'asc' ? '↑' : '↓') : ''}
              </TableHead>
              <TableHead className="py-3.5 px-4">Status</TableHead>
              <TableHead className="py-3.5 px-5 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>{renderTableRows()}</TableBody>
        </Table>

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
        {renderMobileCards()}

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
