'use client';

import { useMutation, useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { adminCreateTicketProfile } from '@/lib/api/admin/ticket-profile.service';
import { adminGetTiers } from '@/lib/api/admin/tier.service';
import { extractApiError } from '@/lib/api/client';

import {
  defaultGroup,
  defaultTicket,
  validateTicketProfile,
  buildTicketProfilePayload,
  type GroupInput,
  type TicketInput,
} from '@/components/ticket-profiles/types';
import { ProfileBasicInfoCard } from '@/components/ticket-profiles/ProfileBasicInfoCard';
import { TicketGroupCard } from '@/components/ticket-profiles/TicketGroupCard';
import { ProfileFormActions } from '@/components/ticket-profiles/ProfileFormActions';

export default function CreateTicketProfilePage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [groups, setGroups] = useState<GroupInput[]>([defaultGroup()]);
  const [error, setError] = useState('');

  const { data: dbTiers = [] } = useQuery({ queryKey: ['adminTiers'], queryFn: adminGetTiers });

  const createMutation = useMutation({
    mutationFn: adminCreateTicketProfile,
    onSuccess: () => router.push('/ticket-profiles'), onError: (err) => setError(extractApiError(err).message),
  });

  const addGroup = () => setGroups((prev) => [...prev, defaultGroup()]);
  const removeGroup = (gIdx: number) => setGroups((prev) => prev.filter((_, idx) => idx !== gIdx));

  const updateGroupField = (gIdx: number, field: keyof GroupInput, value: string) => {
    setGroups((prev) => prev.map((g, idx) => {
      if (idx !== gIdx) return g;
      if (field === 'name') {
        const slug = value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
        return { ...g, name: value, slug };
      }
      return { ...g, [field]: value };
    }));
  };

  const addTicket = (gIdx: number) => {
    setGroups((prev) =>
      prev.map((g, idx) => (idx === gIdx ? { ...g, tickets: [...g.tickets, defaultTicket()] } : g))
    );
  };

  const removeTicket = (gIdx: number, tIdx: number) => {
    setGroups((prev) =>
      prev.map((g, idx) => (idx === gIdx ? { ...g, tickets: g.tickets.filter((_, tId) => tId !== tIdx) } : g))
    );
  };

  const updateTicketField = (gIdx: number, tIdx: number, field: keyof TicketInput, value: unknown) => {
    setGroups((prev) => prev.map((g, idx) => {
      if (idx !== gIdx) return g;
      return { ...g, tickets: g.tickets.map((t, tId) => {
        if (tId !== tIdx) return t;
        return field === 'price' && value === 0 ? { ...t, price: 0, isFree: true } : { ...t, [field]: value as never };
      }) };
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const validationError = validateTicketProfile(name, groups);
    if (validationError) return setError(validationError);
    createMutation.mutate(buildTicketProfilePayload(name, description, groups));
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 text-white">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white">Create Ticket Profile</h1>
          <p className="text-text-muted text-sm mt-0.5">Define reusable event ticket templates</p>
        </div>
        <button
          onClick={() => router.back()}
          className="text-text-muted text-sm hover:text-text-secondary transition-colors flex items-center gap-1.5"
        >
          ← Back
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && <div className="px-4 py-3 bg-error/10 border border-error/30 rounded-xl text-sm text-red-400">{error}</div>}

        <ProfileBasicInfoCard name={name} setName={setName} description={description} setDescription={setDescription} />

        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-white font-bold text-lg">Ticket Groups / Sections</h2>
            <button
              type="button"
              onClick={addGroup}
              className="px-3.5 py-2 rounded-xl bg-accent-purple/10 border border-accent-purple/20 text-accent-purple-light text-xs font-semibold hover:bg-accent-purple/20 transition-all"
            >
              + Add Group
            </button>
          </div>

          {groups.map((group, gIdx) => (
            <TicketGroupCard
              key={gIdx} group={group} gIdx={gIdx} canRemove={groups.length > 1}
              onRemoveGroup={removeGroup} onUpdateGroupField={updateGroupField}
              onAddTicket={addTicket} onRemoveTicket={removeTicket} onUpdateTicketField={updateTicketField}
              dbTiers={dbTiers}
            />
          ))}
        </div>

        <ProfileFormActions submitLabel="Create Profile" isPending={createMutation.isPending} onCancel={() => router.back()} />
      </form>
    </div>
  );
}
