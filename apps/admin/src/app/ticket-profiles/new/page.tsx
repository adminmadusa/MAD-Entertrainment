'use client';

import { TicketTier } from '@mad/shared';
import { useMutation, useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { adminCreateTicketProfile } from '@/lib/api/admin/ticket-profile.service';
import { adminGetTiers } from '@/lib/api/admin/tier.service';
import { extractApiError } from '@/lib/api/client';
import { TicketProfile, TicketGroup, TicketConfig } from '@mad/types';

interface TicketInput {
  tier: string;
  name: string;
  description: string;
  price: number | '';
  isFree: boolean;
  totalCapacity: number | '';
  minPerBooking: number | '';
  maxPerBooking: number | '';
  groupSize: number | '';
  discountType: 'percentage' | 'flat' | 'none';
  discountValue: number | '';
  minQtyRequired: number | '';
  buyQty: number | '';
  freeTicketQty: number | '';
  isActive: boolean;
}

interface GroupInput {
  name: string;
  slug: string;
  description: string;
  tickets: TicketInput[];
}

const defaultTicket = (): TicketInput => ({
  tier: 'general',
  name: 'General Admission',
  description: '',
  price: '',
  isFree: false,
  totalCapacity: '',
  minPerBooking: 1,
  maxPerBooking: 10,
  groupSize: 1,
  discountType: 'none',
  discountValue: '',
  minQtyRequired: 1,
  buyQty: '',
  freeTicketQty: '',
  isActive: true,
});

const defaultGroup = (): GroupInput => ({
  name: 'General Passes',
  slug: 'general-passes',
  description: '',
  tickets: [defaultTicket()],
});

export default function CreateTicketProfilePage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [groups, setGroups] = useState<GroupInput[]>([defaultGroup()]);
  const [error, setError] = useState('');

  const { data: dbTiers = [] } = useQuery({
    queryKey: ['adminTiers'],
    queryFn: adminGetTiers,
  });

  const createMutation = useMutation({
    mutationFn: adminCreateTicketProfile,
    onSuccess: () => router.push('/ticket-profiles'),
    onError: (err) => setError(extractApiError(err).message),
  });

  const addGroup = () => {
    setGroups((prev) => [...prev, defaultGroup()]);
  };

  const removeGroup = (gIdx: number) => {
    setGroups((prev) => prev.filter((_, idx) => idx !== gIdx));
  };

  const updateGroupField = (gIdx: number, field: keyof GroupInput, value: string) => {
    setGroups((prev) =>
      prev.map((g, idx) => {
        if (idx !== gIdx) return g;
        if (field === 'name') {
          const generatedSlug = value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
          return { ...g, name: value, slug: generatedSlug };
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

  const updateTicketField = (gIdx: number, tIdx: number, field: keyof TicketInput, value: unknown) => {
    setGroups((prev) =>
      prev.map((g, idx) => {
        if (idx !== gIdx) return g;
        const updatedTickets = g.tickets.map((t, tId) => {
          if (tId !== tIdx) return t;
          if (field === 'price' && value === 0) {
            return { ...t, price: 0, isFree: true };
          }
          return { ...t, [field]: value as never };
        });
        return { ...g, tickets: updatedTickets };
      })
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Profile name is required.');
      return;
    }

    if (groups.length === 0) {
      setError('At least one ticket group is required.');
      return;
    }

    // Prepare payload
    const formattedGroups: TicketGroup[] = groups.map((g) => ({
      name: g.name.trim(),
      slug: g.slug.trim() || g.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      description: g.description.trim() || undefined,
      tickets: g.tickets.map((t) => {
        const hasOffer = t.discountType !== 'none';
        return {
          tier: t.tier,
          name: t.name.trim(),
          description: t.description.trim() || undefined,
          price: t.isFree ? 0 : Number(t.price || 0),
          isFree: t.isFree,
          totalCapacity: Number(t.totalCapacity || 100),
          minPerBooking: Number(t.minPerBooking || 1),
          maxPerBooking: Number(t.maxPerBooking || 10),
          groupSize: Number(t.groupSize || 1),
          isActive: t.isActive,
          offerRules: hasOffer
            ? {
                discountType: t.discountType,
                discountValue: Number(t.discountValue || 0),
                minQtyRequired: Number(t.minQtyRequired || 1),
                buyQty: t.buyQty ? Number(t.buyQty) : undefined,
                freeTicketQty: t.freeTicketQty ? Number(t.freeTicketQty) : undefined,
              }
            : undefined,
        };
      }),
    }));

    // Verify all ticket fields
    for (const g of formattedGroups) {
      if (g.tickets.length === 0) {
        setError(`Group "${g.name}" must contain at least one ticket tier.`);
        return;
      }
      for (const t of g.tickets) {
        if (!t.name) {
          setError(`Ticket name is required in group "${g.name}".`);
          return;
        }
      }
    }

    createMutation.mutate({
      name: name.trim(),
      description: description.trim() || undefined,
      groups: formattedGroups,
    });
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
        {error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="px-4 py-3 bg-error/10 border border-error/30 rounded-xl text-sm text-red-400"
          >
            {error}
          </motion.div>
        )}

        {/* Profile Basic Info */}
        <div className="glass rounded-2xl border border-border-subtle p-6 space-y-4">
          <h2 className="text-white font-semibold text-base">Profile Info</h2>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-text-secondary text-sm font-medium">Profile Name *</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Standard Club Event Profile"
                required
                className="w-full px-4 py-2.5 rounded-xl bg-background border border-border-subtle text-sm text-text-primary focus:outline-none focus:border-accent-purple transition-colors"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-text-secondary text-sm font-medium">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief details about what events this profile matches..."
                rows={3}
                className="w-full px-4 py-2.5 rounded-xl bg-background border border-border-subtle text-sm text-text-primary focus:outline-none focus:border-accent-purple transition-colors resize-none"
              />
            </div>
          </div>
        </div>

        {/* Groups */}
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
            <div
              key={gIdx}
              className="glass rounded-2xl border border-border-subtle p-6 space-y-6 relative"
            >
              {groups.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeGroup(gIdx)}
                  className="absolute top-6 right-6 text-xs font-bold text-red-400 hover:text-red-300 transition-colors"
                >
                  Remove Group
                </button>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-text-secondary text-sm font-medium">Group Name *</label>
                  <input
                    value={group.name}
                    onChange={(e) => updateGroupField(gIdx, 'name', e.target.value)}
                    placeholder="e.g. VIP Lounges, Regular Entry"
                    required
                    className="w-full px-4 py-2.5 rounded-xl bg-background border border-border-subtle text-sm text-text-primary focus:outline-none focus:border-accent-purple transition-colors"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-text-secondary text-sm font-medium">Group Identifier (Slug)</label>
                  <input
                    value={group.slug}
                    disabled
                    className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-border-subtle text-sm text-text-muted focus:outline-none"
                  />
                </div>
              </div>

              {/* Tickets in Group */}
              <div className="space-y-4 pt-4 border-t border-white/5">
                <div className="flex items-center justify-between">
                  <h3 className="text-text-secondary font-bold text-sm uppercase tracking-wider">
                    Ticket Tiers in {group.name || `Group ${gIdx + 1}`}
                  </h3>
                  <button
                    type="button"
                    onClick={() => addTicket(gIdx)}
                    className="text-accent-purple text-xs font-bold hover:underline"
                  >
                    + Add Ticket Tier
                  </button>
                </div>

                <div className="space-y-4">
                  {group.tickets.map((ticket, tIdx) => (
                    <div
                      key={tIdx}
                      className="p-5 bg-white/3 rounded-xl border border-white/5 space-y-4 relative"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-text-secondary text-xs font-bold uppercase">
                          Tier {tIdx + 1}
                        </span>
                        {group.tickets.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeTicket(gIdx, tIdx)}
                            className="text-red-400 text-xs hover:underline"
                          >
                            Remove Tier
                          </button>
                        )}
                      </div>

                      {/* Ticket Config Row 1 */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-text-secondary text-xs font-medium">System Tier Enum</label>
                          <select
                            value={ticket.tier}
                            onChange={(e) => updateTicketField(gIdx, tIdx, 'tier', e.target.value)}
                            className="w-full px-4 py-2.5 rounded-xl bg-background border border-border-subtle text-sm text-text-primary focus:outline-none focus:border-accent-purple transition-colors"
                          >
                            {dbTiers.length > 0
                              ? dbTiers.map((t) => (
                                  <option key={t._id} value={t.slug} className="bg-background-card">
                                    {t.name}
                                  </option>
                                ))
                              : Object.values(TicketTier).map((tierVal) => (
                                  <option key={tierVal} value={tierVal} className="bg-background-card">
                                    {tierVal}
                                  </option>
                                ))}
                          </select>
                        </div>
                        <div className="space-y-1.5 sm:col-span-2">
                          <label className="text-text-secondary text-xs font-medium">
                            Display Name (use {"{eventName}"} for auto-mapping) *
                          </label>
                          <input
                            value={ticket.name}
                            onChange={(e) => updateTicketField(gIdx, tIdx, 'name', e.target.value)}
                            placeholder="e.g. {eventName} VIP Pass"
                            required
                            className="w-full px-4 py-2.5 rounded-xl bg-background border border-border-subtle text-sm text-text-primary focus:outline-none focus:border-accent-purple transition-colors"
                          />
                        </div>
                      </div>

                      {/* Ticket Config Row 2 */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-text-secondary text-xs font-medium">Price (₹)</label>
                          <input
                            type="number"
                            min={0}
                            value={ticket.price}
                            disabled={ticket.isFree}
                            onChange={(e) =>
                              updateTicketField(
                                gIdx,
                                tIdx,
                                'price',
                                e.target.value === '' ? '' : Number(e.target.value)
                              )
                            }
                            placeholder="e.g. 1500"
                            required={!ticket.isFree}
                            className="w-full px-4 py-2.5 rounded-xl bg-background border border-border-subtle text-sm text-text-primary focus:outline-none focus:border-accent-purple transition-colors disabled:opacity-50"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-text-secondary text-xs font-medium">Capacity Limit</label>
                          <input
                            type="number"
                            min={1}
                            value={ticket.totalCapacity}
                            onChange={(e) =>
                              updateTicketField(
                                gIdx,
                                tIdx,
                                'totalCapacity',
                                e.target.value === '' ? '' : Number(e.target.value)
                              )
                            }
                            placeholder="e.g. 100"
                            required
                            className="w-full px-4 py-2.5 rounded-xl bg-background border border-border-subtle text-sm text-text-primary focus:outline-none focus:border-accent-purple transition-colors"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-text-secondary text-xs font-medium">Max Qty / Booking</label>
                          <input
                            type="number"
                            min={1}
                            value={ticket.maxPerBooking}
                            onChange={(e) =>
                              updateTicketField(
                                gIdx,
                                tIdx,
                                'maxPerBooking',
                                e.target.value === '' ? '' : Number(e.target.value)
                              )
                            }
                            placeholder="e.g. 10"
                            className="w-full px-4 py-2.5 rounded-xl bg-background border border-border-subtle text-sm text-text-primary focus:outline-none focus:border-accent-purple transition-colors"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-text-secondary text-xs font-medium">Min Qty / Booking</label>
                          <input
                            type="number"
                            min={1}
                            value={ticket.minPerBooking}
                            onChange={(e) =>
                              updateTicketField(
                                gIdx,
                                tIdx,
                                'minPerBooking',
                                e.target.value === '' ? '' : Number(e.target.value)
                              )
                            }
                            placeholder="e.g. 1"
                            className="w-full px-4 py-2.5 rounded-xl bg-background border border-border-subtle text-sm text-text-primary focus:outline-none focus:border-accent-purple transition-colors"
                          />
                        </div>
                      </div>

                      {/* Ticket Config Row 3 */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="space-y-1.5 flex items-end pb-3">
                          <label className="flex items-center gap-3 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={ticket.isFree}
                              onChange={(e) => {
                                updateTicketField(gIdx, tIdx, 'isFree', e.target.checked);
                                if (e.target.checked) {
                                  updateTicketField(gIdx, tIdx, 'price', 0);
                                }
                              }}
                              className="w-4 h-4 accent-accent-purple rounded"
                            />
                            <span className="text-text-secondary text-xs font-medium">
                              Mark as FREE Ticket
                            </span>
                          </label>
                        </div>
                        <div className="space-y-1.5 sm:col-span-2">
                          <label className="text-text-secondary text-xs font-medium">Tier Description</label>
                          <input
                            value={ticket.description}
                            onChange={(e) => updateTicketField(gIdx, tIdx, 'description', e.target.value)}
                            placeholder="Brief description of perks..."
                            className="w-full px-4 py-2.5 rounded-xl bg-background border border-border-subtle text-sm text-text-primary focus:outline-none focus:border-accent-purple transition-colors"
                          />
                        </div>
                      </div>

                      {/* Offer Rules nested form */}
                      <div className="p-4 bg-white/2 rounded-xl border border-white/5 space-y-4">
                        <h4 className="text-text-secondary font-bold text-xs uppercase tracking-wider">
                          Offers & Group Pricing Rules
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                          <div className="space-y-1.5">
                            <label className="text-text-muted text-xs">Discount Type</label>
                            <select
                              value={ticket.discountType}
                              onChange={(e) => updateTicketField(gIdx, tIdx, 'discountType', e.target.value)}
                              className="w-full px-4 py-2 rounded-xl bg-background border border-border-subtle text-xs text-text-primary focus:outline-none focus:border-accent-purple"
                            >
                              <option value="none" className="bg-background-card">No Offer</option>
                              <option value="percentage" className="bg-background-card">Percentage Discount</option>
                              <option value="flat" className="bg-background-card">Flat Amount Discount</option>
                            </select>
                          </div>
                          {ticket.discountType !== 'none' && (
                            <>
                              <div className="space-y-1.5">
                                <label className="text-text-muted text-xs">
                                  {ticket.discountType === 'percentage' ? 'Discount Percentage (%)' : 'Discount Value (₹)'}
                                </label>
                                <input
                                  type="number"
                                  min={0}
                                  value={ticket.discountValue}
                                  onChange={(e) =>
                                    updateTicketField(
                                      gIdx,
                                      tIdx,
                                      'discountValue',
                                      e.target.value === '' ? '' : Number(e.target.value)
                                    )
                                  }
                                  placeholder="e.g. 10"
                                  className="w-full px-4 py-2 rounded-xl bg-background border border-border-subtle text-xs text-text-primary focus:outline-none focus:border-accent-purple"
                                />
                              </div>
                              <div className="space-y-1.5">
                                <label className="text-text-muted text-xs">Min Quantity Required</label>
                                <input
                                  type="number"
                                  min={1}
                                  value={ticket.minQtyRequired}
                                  onChange={(e) =>
                                    updateTicketField(
                                      gIdx,
                                      tIdx,
                                      'minQtyRequired',
                                      e.target.value === '' ? '' : Number(e.target.value)
                                    )
                                  }
                                  placeholder="e.g. 4"
                                  className="w-full px-4 py-2 rounded-xl bg-background border border-border-subtle text-xs text-text-primary focus:outline-none focus:border-accent-purple"
                                />
                              </div>
                            </>
                          )}
                        </div>

                        {ticket.discountType !== 'none' && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-white/5 pt-3">
                            <div className="space-y-1.5">
                              <label className="text-text-muted text-xs">Buy Quantity (for Buy X Get Y Free)</label>
                              <input
                                type="number"
                                min={1}
                                value={ticket.buyQty}
                                onChange={(e) =>
                                  updateTicketField(
                                    gIdx,
                                    tIdx,
                                    'buyQty',
                                    e.target.value === '' ? '' : Number(e.target.value)
                                  )
                                }
                                placeholder="e.g. 4"
                                className="w-full px-4 py-2 rounded-xl bg-background border border-border-subtle text-xs text-text-primary focus:outline-none focus:border-accent-purple"
                              />
                            </div>
                            <div className="space-y-1.5">
                              <label className="text-text-muted text-xs">Free Quantity (for Buy X Get Y Free)</label>
                              <input
                                type="number"
                                min={1}
                                value={ticket.freeTicketQty}
                                onChange={(e) =>
                                  updateTicketField(
                                    gIdx,
                                    tIdx,
                                    'freeTicketQty',
                                    e.target.value === '' ? '' : Number(e.target.value)
                                  )
                                }
                                placeholder="e.g. 1"
                                className="w-full px-4 py-2 rounded-xl bg-background border border-border-subtle text-xs text-text-primary focus:outline-none focus:border-accent-purple"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Form Actions */}
        <div className="flex gap-4 pb-6">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex-1 py-3 glass border border-border-subtle rounded-xl text-text-secondary font-medium hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={createMutation.isPending}
            className="flex-1 py-3 btn-gradient text-white font-bold rounded-xl shadow-glow-sm disabled:opacity-60 transition-all"
          >
            {createMutation.isPending ? 'Creating...' : 'Create Profile'}
          </button>
        </div>
      </form>
    </div>
  );
}
