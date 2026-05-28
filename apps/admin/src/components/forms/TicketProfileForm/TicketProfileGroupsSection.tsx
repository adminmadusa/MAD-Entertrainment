import { TicketTier } from "@mad/shared";

import { EVENT_FORM_INPUT_CLASS } from "@/components/forms/constants/event-form.constants";
import { AdminTier } from "@/lib/api/admin/tier.service";
import {
  TicketProfileFormValues,
  TicketProfileTicketFormValues,
} from "@/types/ticket-profile-form";

export function TicketProfileGroupsSection({
  values,
  tiers,
  addGroup,
  removeGroup,
  updateGroupField,
  addTicket,
  removeTicket,
  updateTicketField,
}: {
  values: TicketProfileFormValues;
  tiers: AdminTier[];
  addGroup: () => void;
  removeGroup: (groupIndex: number) => void;
  updateGroupField: (
    groupIndex: number,
    field: "name" | "slug" | "description",
    value: string,
  ) => void;
  addTicket: (groupIndex: number) => void;
  removeTicket: (groupIndex: number, ticketIndex: number) => void;
  updateTicketField: (
    groupIndex: number,
    ticketIndex: number,
    field: keyof TicketProfileTicketFormValues,
    value: unknown,
  ) => void;
}) {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h2 className="text-white font-bold text-lg">
          Ticket Groups / Sections
        </h2>
        <button
          type="button"
          onClick={addGroup}
          className="px-3.5 py-2 rounded-xl bg-accent-purple/10 border border-accent-purple/20 text-accent-purple-light text-xs font-semibold hover:bg-accent-purple/20 transition-colors"
        >
          + Add Group
        </button>
      </div>

      {values.groups.map((group, groupIndex) => (
        <div
          key={groupIndex}
          className="glass rounded-2xl border border-border-subtle p-4 sm:p-6 space-y-6 relative"
        >
          {values.groups.length > 1 && (
            <button
              type="button"
              onClick={() => removeGroup(groupIndex)}
              className="absolute top-6 right-6 text-xs font-bold text-red-400 hover:text-red-300 transition-colors"
            >
              Remove Group
            </button>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-text-secondary text-sm font-medium">
                Group Name *
              </label>
              <input
                value={group.name}
                onChange={(e) =>
                  updateGroupField(groupIndex, "name", e.target.value)
                }
                className={EVENT_FORM_INPUT_CLASS}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-text-secondary text-sm font-medium">
                Slug
              </label>
              <input
                value={group.slug}
                onChange={(e) =>
                  updateGroupField(groupIndex, "slug", e.target.value)
                }
                className={EVENT_FORM_INPUT_CLASS}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-text-secondary text-sm font-medium">
              Description
            </label>
            <textarea
              value={group.description}
              onChange={(e) =>
                updateGroupField(groupIndex, "description", e.target.value)
              }
              rows={2}
              className={`${EVENT_FORM_INPUT_CLASS} resize-none`}
            />
          </div>

          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <h3 className="text-white font-semibold text-sm">Tickets</h3>
              <button
                type="button"
                onClick={() => addTicket(groupIndex)}
                className="text-xs font-semibold text-accent-purple hover:text-accent-purple-light transition-colors"
              >
                + Add Ticket
              </button>
            </div>

            {group.tickets.map((ticket, ticketIndex) => (
              <div
                key={ticketIndex}
                className="p-4 bg-white/3 rounded-xl border border-border-subtle space-y-4"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-text-secondary text-sm font-medium">
                      Tier
                    </label>
                    <select
                      value={ticket.tier}
                      onChange={(e) =>
                        updateTicketField(
                          groupIndex,
                          ticketIndex,
                          "tier",
                          e.target.value as TicketTier,
                        )
                      }
                      className={EVENT_FORM_INPUT_CLASS}
                    >
                      {tiers.map((tier) => (
                        <option
                          key={tier._id}
                          value={tier.slug}
                          className="bg-background-card"
                        >
                          {tier.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-text-secondary text-sm font-medium">
                      Ticket Name *
                    </label>
                    <input
                      value={ticket.name}
                      onChange={(e) =>
                        updateTicketField(
                          groupIndex,
                          ticketIndex,
                          "name",
                          e.target.value,
                        )
                      }
                      className={EVENT_FORM_INPUT_CLASS}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-text-secondary text-sm font-medium">
                      Price (₹)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={ticket.price}
                      onChange={(e) =>
                        updateTicketField(
                          groupIndex,
                          ticketIndex,
                          "price",
                          e.target.value === "" ? "" : Number(e.target.value),
                        )
                      }
                      className={EVENT_FORM_INPUT_CLASS}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-text-secondary text-sm font-medium">
                      Capacity
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={ticket.totalCapacity}
                      onChange={(e) =>
                        updateTicketField(
                          groupIndex,
                          ticketIndex,
                          "totalCapacity",
                          e.target.value === "" ? "" : Number(e.target.value),
                        )
                      }
                      className={EVENT_FORM_INPUT_CLASS}
                    />
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <label className="text-xs text-text-secondary flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={ticket.isActive}
                      onChange={(e) =>
                        updateTicketField(
                          groupIndex,
                          ticketIndex,
                          "isActive",
                          e.target.checked,
                        )
                      }
                    />
                    Active
                  </label>
                  {group.tickets.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeTicket(groupIndex, ticketIndex)}
                      className="text-xs font-bold text-red-400 hover:text-red-300"
                    >
                      Remove Ticket
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
