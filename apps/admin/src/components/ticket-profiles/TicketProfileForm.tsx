'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { ProfileBasicInfoCard } from '@/components/ticket-profiles/ProfileBasicInfoCard';
import { ProfileFormActions } from '@/components/ticket-profiles/ProfileFormActions';
import { TicketGroupCard } from '@/components/ticket-profiles/TicketGroupCard';
import type { AdminTier } from '@/lib/api/admin/tier.service';
import type { TicketProfile } from '@mad/types';

import {
  buildTicketProfilePayload,
  defaultGroup,
  defaultTicket,
  validateTicketProfile,
  type GroupInput,
  type TicketInput,
} from './utils';

interface TicketProfileFormProps {
  initialData?: TicketProfile | null;
  onSubmit: (payload: ReturnType<typeof buildTicketProfilePayload>) => void;
  isPending: boolean;
  apiError?: string | null;
  dbTiers: AdminTier[];
}

export function TicketProfileForm({
  initialData,
  onSubmit,
  isPending,
  apiError,
  dbTiers,
}: TicketProfileFormProps) {
  const router = useRouter();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [groups, setGroups] = useState<GroupInput[]>([defaultGroup()]);
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    if (initialData) {
      setName(initialData.name || '');
      setDescription(initialData.description || '');
      setGroups(
        (initialData.groups || []).map((g) => ({
          name: g.name,
          slug: g.slug,
          description: g.description || '',
          tickets: (g.tickets || []).map((t) => ({
            tier: t.tier,
            name: t.name,
            description: t.description || '',
            price: t.price,
            isFree: !!t.isFree,
            totalCapacity: t.totalCapacity,
            minPerBooking: t.minPerBooking || 1,
            maxPerBooking: t.maxPerBooking || 10,
            groupSize: t.groupSize || 1,
            discountType: t.offerRules?.discountType || 'none',
            discountValue: t.offerRules?.discountValue || '',
            minQtyRequired: t.offerRules?.minQtyRequired || 1,
            buyQty: t.offerRules?.buyQty || '',
            freeTicketQty: t.offerRules?.freeTicketQty || '',
            isActive: t.isActive !== false,
          })),
        }))
      );
    }
  }, [initialData]);

  const addGroup = () => setGroups((prev) => [...prev, defaultGroup()]);
  const removeGroup = (gIdx: number) => setGroups((prev) => prev.filter((_, idx) => idx !== gIdx));

  const updateGroupField = (gIdx: number, field: keyof GroupInput, value: string) => {
    setGroups((prev) =>
      prev.map((g, idx) => {
        if (idx !== gIdx) return g;
        if (field === 'name') {
          const slug = value
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)/g, '');
          return { ...g, name: value, slug };
        }
        return { ...g, [field]: value };
      })
    );
  };

  const addTicket = (gIdx: number) => {
    setGroups((prev) =>
      prev.map((g, idx) => (idx === gIdx ? { ...g, tickets: [...g.tickets, defaultTicket()] } : g))
    );
  };

  const removeTicket = (gIdx: number, tIdx: number) => {
    setGroups((prev) =>
      prev.map((g, idx) =>
        idx === gIdx ? { ...g, tickets: g.tickets.filter((_, tId) => tId !== tIdx) } : g
      )
    );
  };

  const updateTicketField = (
    gIdx: number,
    tIdx: number,
    field: keyof TicketInput,
    value: unknown
  ) => {
    setGroups((prev) =>
      prev.map((g, idx) => {
        if (idx !== gIdx) return g;
        return {
          ...g,
          tickets: g.tickets.map((t, tId) => {
            if (tId !== tIdx) return t;
            return field === 'price' && value === 0
              ? { ...t, price: 0, isFree: true }
              : { ...t, [field]: value as never };
          }),
        };
      })
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);
    const err = validateTicketProfile(name, groups);
    if (err) {
      setValidationError(err);
      return;
    }
    onSubmit(buildTicketProfilePayload(name, description, groups));
  };

  const displayedError = validationError || apiError;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {displayedError && (
        <div className="px-4 py-3 bg-error/10 border border-error/30 rounded-xl text-sm text-red-400">
          {displayedError}
        </div>
      )}

      <ProfileBasicInfoCard
        name={name}
        setName={setName}
        description={description}
        setDescription={setDescription}
      />

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
            key={gIdx}
            group={group}
            gIdx={gIdx}
            canRemove={groups.length > 1}
            onRemoveGroup={removeGroup}
            onUpdateGroupField={updateGroupField}
            onAddTicket={addTicket}
            onRemoveTicket={removeTicket}
            onUpdateTicketField={updateTicketField}
            dbTiers={dbTiers}
          />
        ))}
      </div>

      <ProfileFormActions
        submitLabel={initialData ? 'Save Changes' : 'Create Profile'}
        isPending={isPending}
        onCancel={() => router.back()}
      />
    </form>
  );
}
