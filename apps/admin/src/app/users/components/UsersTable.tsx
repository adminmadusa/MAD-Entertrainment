'use client';

import Link from 'next/link';
import React from 'react';

import type { UserListItem } from '@/lib/api/admin/user.service';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, EmptyState } from '@mad/ui';
import { Users, Search } from '@mad/ui/icons';
import { formatDateTime } from '@mad/utils';

interface UsersTableProps {
  items: UserListItem[];
  isLoading: boolean;
  searchParam: string;
  sortFieldParam: string;
  sortOrderParam: 'asc' | 'desc';
  onSort: (field: string) => void;
}

export function UsersTable({
  items,
  isLoading,
  searchParam,
  sortFieldParam,
  sortOrderParam,
  onSort,
}: UsersTableProps) {
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
              title={searchParam ? 'No results match your search.' : 'No customer records found.'}
              description={searchParam ? 'Try changing your search criteria.' : undefined}
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

  return (
    <Table className="min-w-[900px]">
      <TableHeader>
        <TableRow className="bg-white/[0.01]">
          <TableHead
            onClick={() => onSort('name')}
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
            onClick={() => onSort('createdAt')}
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
  );
}
