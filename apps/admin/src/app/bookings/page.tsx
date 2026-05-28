"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { useState, useEffect } from "react";

import {
  adminGetBookings,
  adminCancelBooking,
  type AdminBooking,
} from "@/lib/api/admin/booking.service";
import ErrorState from "@/components/states/ErrorState";

const STATUS_COLORS: Record<string, string> = {
  confirmed: "bg-green-500/10 text-green-400 border-green-500/30",
  pending: "bg-yellow-500/10 text-yellow-400 border-yellow-500/30",
  cancelled: "bg-red-500/10 text-red-400 border-red-500/30",
  failed: "bg-gray-500/10 text-gray-400 border-gray-500/30",
};

export default function AdminBookingsPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [cancelTarget, setCancelTarget] = useState<AdminBooking | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [selectedBooking, setSelectedBooking] = useState<AdminBooking | null>(
    null,
  );

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => clearTimeout(handler);
  }, [search]);

  const { data, isLoading, error } = useQuery({
    queryKey: [
      "admin-bookings",
      { page, search: debouncedSearch, status: statusFilter },
    ],
    queryFn: () =>
      adminGetBookings({
        page,
        limit: 15,
        ...(debouncedSearch && { search: debouncedSearch }),
        ...(statusFilter && { status: statusFilter }),
      }),
  });

  const cancelMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      adminCancelBooking(id, reason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-bookings"] });
      setCancelTarget(null);
      setCancelReason("");
    },
  });

  const bookings = data?.items ?? [];
  const pagination = data?.pagination;

  if (error) {
    return (
      <div className="py-12">
        <ErrorState
          message={(error as Error).message || "Failed to load bookings."}
        />
      </div>
    );
  }

  const handleExportCSV = () => {
    if (!bookings || bookings.length === 0) return;

    const headers = [
      "Reference",
      "First Name",
      "Last Name",
      "Customer Email",
      "Customer Phone",
      "Birthdate",
      "Marketing: Keep Updated",
      "Marketing: Best Events",
      "Event",
      "Amount",
      "Status",
      "Date",
    ];
    const csvContent = [
      headers.join(","),
      ...bookings.map((b) => {
        const customer = b.userId ?? b.guestInfo;
        const firstName = customer?.firstName?.replace(/,/g, "") ?? "—";
        const lastName = customer?.lastName?.replace(/,/g, "") ?? "—";
        const email = customer?.email?.replace(/,/g, "") ?? "—";
        const phone = customer?.phone?.replace(/,/g, "") ?? "—";
        const birthdate = customer?.birthdate
          ? new Date(customer.birthdate).toLocaleDateString("en-IN")
          : "—";
        const keepUpdated = customer?.keepUpdated ? "Yes" : "No";
        const sendBestEvents = customer?.sendBestEvents ? "Yes" : "No";
        const eventTitle =
          (b.eventId as { title?: string })?.title?.replace(/,/g, "") ?? "—";
        return `${b.bookingId},${firstName},${lastName},${email},${phone},${birthdate},${keepUpdated},${sendBestEvents},${eventTitle},${b.totalAmount},${b.status},${new Date(b.createdAt).toLocaleDateString("en-IN")}`;
      }),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute(
      "download",
      `bookings_export_${new Date().toISOString().split("T")[0]}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-black text-white">Bookings</h1>
          <p className="text-text-muted text-sm mt-0.5">
            {pagination?.total ?? 0} total bookings
          </p>
        </div>
        <button
          onClick={handleExportCSV}
          disabled={bookings.length === 0}
          className="w-full sm:w-auto px-4 py-2 bg-white/5 hover:bg-white/10 border border-border-subtle rounded-xl text-sm font-semibold text-white transition-colors disabled:opacity-50"
        >
          Export CSV
        </button>
      </div>

      <div className="flex flex-wrap gap-3">
        <input
          type="search"
          aria-label="Search bookings"
          placeholder="Search by reference or email..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="flex-1 min-w-0 sm:min-w-48 px-4 py-2.5 rounded-xl bg-background-card border border-border-subtle text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-purple focus-visible:ring-2 focus-visible:ring-accent-purple"
        />
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
          className="px-4 py-2.5 rounded-xl bg-background-card border border-border-subtle text-sm text-text-primary focus:outline-none focus:border-accent-purple focus-visible:ring-2 focus-visible:ring-accent-purple"
        >
          <option value="">All Statuses</option>
          <option value="confirmed">Confirmed</option>
          <option value="pending">Pending</option>
          <option value="cancelled">Cancelled</option>
          <option value="failed">Failed</option>
        </select>
      </div>

      <div
        className="glass rounded-2xl border border-border-subtle overflow-hidden min-h-[360px]"
        aria-busy={isLoading}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-subtle">
                <th className="text-left text-text-muted font-medium py-3.5 px-5">
                  Reference
                </th>
                <th className="text-left text-text-muted font-medium py-3.5 px-4">
                  Customer
                </th>
                <th className="text-left text-text-muted font-medium py-3.5 px-4">
                  Event
                </th>
                <th className="text-left text-text-muted font-medium py-3.5 px-4">
                  Amount
                </th>
                <th className="text-left text-text-muted font-medium py-3.5 px-4">
                  Status
                </th>
                <th className="text-left text-text-muted font-medium py-3.5 px-4">
                  Date
                </th>
                <th className="text-right text-text-muted font-medium py-3.5 px-5">
                  Action
                </th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr
                    key={i}
                    className="border-b border-border-subtle/40 animate-pulse motion-reduce:animate-none"
                  >
                    {Array.from({ length: 7 }).map((__, j) => (
                      <td key={j} className="py-4 px-4">
                        <div className="h-3.5 bg-white/5 rounded w-20" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : bookings.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10">
                    <div className="min-h-[240px] flex flex-col items-center justify-center gap-3 text-center">
                      <p className="text-white text-sm font-medium">
                        No bookings found
                      </p>
                      <p className="text-text-muted text-xs">
                        Try adjusting search or status filters.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                bookings.map((booking) => {
                  const customer = booking.userId ?? booking.guestInfo;
                  const customerName =
                    (customer as { name?: string })?.name ?? "—";
                  const customerEmail =
                    (customer as { email?: string })?.email ?? "—";
                  return (
                    <tr
                      key={booking._id}
                      onClick={() => setSelectedBooking(booking)}
                      className="border-b border-border-subtle/40 hover:bg-white/2 cursor-pointer transition-colors"
                    >
                      <td className="py-4 px-5 font-mono text-xs text-accent-purple">
                        {booking.bookingId}
                      </td>
                      <td className="py-4 px-4">
                        <p className="text-text-primary text-sm">
                          {customerName}
                        </p>
                        <p className="text-text-muted text-xs">
                          {customerEmail}
                        </p>
                      </td>
                      <td className="py-4 px-4 text-text-secondary text-sm max-w-40 truncate">
                        {(booking.eventId as { title?: string })?.title ?? "—"}
                      </td>
                      <td className="py-4 px-4 text-text-primary font-medium">
                        ₹{booking.totalAmount.toLocaleString("en-IN")}
                      </td>
                      <td className="py-4 px-4">
                        <span
                          className={`text-xs px-2.5 py-1 rounded-full border font-medium ${STATUS_COLORS[booking.status] ?? "text-text-muted border-border-subtle"}`}
                        >
                          {booking.status}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-text-muted text-xs">
                        {new Date(booking.createdAt).toLocaleDateString(
                          "en-IN",
                        )}
                      </td>
                      <td className="py-4 px-5 text-right">
                        {booking.status === "confirmed" && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setCancelTarget(booking);
                            }}
                            className="px-3 py-1.5 text-xs glass border border-border-subtle rounded-lg text-text-muted hover:text-red-400 hover:border-red-500/40 transition-colors motion-reduce:transition-none"
                          >
                            Cancel
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        {pagination && pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-border-subtle">
            <p className="text-text-muted text-xs">
              Page {pagination.page} of {pagination.totalPages}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 text-xs glass border border-border-subtle rounded-lg disabled:opacity-40 text-text-secondary"
              >
                ← Prev
              </button>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={page >= pagination.totalPages}
                className="px-3 py-1.5 text-xs glass border border-border-subtle rounded-lg disabled:opacity-40 text-text-secondary"
              >
                Next →
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Cancel Modal */}
      <AnimatePresence>
        {cancelTarget && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 sm:p-6 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="glass-strong rounded-2xl border border-border-subtle p-4 sm:p-6 max-w-sm w-full space-y-4 my-auto max-h-[90vh] overflow-y-auto"
            >
              <h3 className="text-white font-bold">Cancel Booking</h3>
              <p className="text-text-secondary text-sm">
                Booking{" "}
                <span className="text-accent-purple font-mono">
                  {cancelTarget.bookingId}
                </span>{" "}
                will be cancelled.
              </p>
              <div className="space-y-1.5">
                <label className="text-sm text-text-secondary">
                  Reason (optional)
                </label>
                <input
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="Reason for cancellation..."
                  className="w-full px-4 py-2.5 rounded-xl bg-background border border-border-subtle text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-purple"
                />
              </div>
              <div className="flex flex-col-reverse sm:flex-row gap-3">
                <button
                  onClick={() => {
                    setCancelTarget(null);
                    setCancelReason("");
                  }}
                  className="flex-1 py-2.5 glass border border-border-subtle rounded-xl text-sm text-text-secondary"
                >
                  Cancel
                </button>
                <button
                  onClick={() =>
                    cancelMutation.mutate({
                      id: cancelTarget._id,
                      reason: cancelReason,
                    })
                  }
                  disabled={cancelMutation.isPending}
                  className="flex-1 py-2.5 bg-error/80 hover:bg-error rounded-xl text-white text-sm font-medium disabled:opacity-60"
                >
                  {cancelMutation.isPending
                    ? "Cancelling..."
                    : "Confirm Cancel"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Detail Modal */}
      <AnimatePresence>
        {selectedBooking &&
          (() => {
            const customer =
              selectedBooking.userId ?? selectedBooking.guestInfo;
            const email = customer?.email ?? "—";
            const phone = customer?.phone ?? "—";
            const birthdate = customer?.birthdate
              ? new Date(customer.birthdate).toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })
              : "—";
            const keepUpdated = customer?.keepUpdated ? "Yes" : "No";
            const sendBestEvents = customer?.sendBestEvents ? "Yes" : "No";

            return (
              <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-40 p-4 sm:p-6 overflow-y-auto">
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="glass-strong rounded-2xl border border-border-subtle p-4 sm:p-6 max-w-lg w-full space-y-6 overflow-y-auto max-h-[90vh] my-auto scrollbar-thin"
                >
                  <div className="flex items-center justify-between border-b border-white/10 pb-4">
                    <div>
                      <span className="text-xs text-text-muted font-mono uppercase tracking-wider">
                        Booking ID
                      </span>
                      <h3 className="text-white text-lg font-black font-mono mt-0.5">
                        {selectedBooking.bookingId}
                      </h3>
                    </div>
                    <span
                      className={`text-xs px-3 py-1 rounded-full border font-semibold ${STATUS_COLORS[selectedBooking.status] ?? "text-text-muted border-border-subtle"}`}
                    >
                      {selectedBooking.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                    <div>
                      <h4 className="text-text-muted font-medium text-xs uppercase tracking-wider mb-1">
                        Customer Info
                      </h4>
                      <p className="text-white font-semibold">
                        {customer?.name ?? "—"}
                      </p>
                      <p className="text-text-secondary text-xs mt-0.5">
                        {email}
                      </p>
                      <p className="text-text-secondary text-xs">{phone}</p>
                    </div>
                    <div>
                      <h4 className="text-text-muted font-medium text-xs uppercase tracking-wider mb-1">
                        Event
                      </h4>
                      <p className="text-white font-semibold">
                        {(selectedBooking.eventId as { title?: string })
                          ?.title ?? "—"}
                      </p>
                      <p className="text-text-secondary text-xs mt-0.5">
                        {selectedBooking.eventId?.startDate
                          ? new Date(
                              selectedBooking.eventId.startDate,
                            ).toLocaleDateString("en-IN", {
                              weekday: "short",
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })
                          : "—"}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm border-t border-white/5 pt-4">
                    <div>
                      <h4 className="text-text-muted font-medium text-xs uppercase tracking-wider mb-1">
                        Date of Birth
                      </h4>
                      <p className="text-white font-medium">{birthdate}</p>
                    </div>
                    <div>
                      <h4 className="text-text-muted font-medium text-xs uppercase tracking-wider mb-1">
                        Booking Mode
                      </h4>
                      <p className="text-white font-medium capitalize">
                        {selectedBooking.mode?.replace("_", " ")}
                      </p>
                    </div>
                  </div>

                  <div className="border-t border-white/5 pt-4 space-y-2">
                    <h4 className="text-text-muted font-medium text-xs uppercase tracking-wider mb-1">
                      Marketing Preferences
                    </h4>
                    <div className="flex items-center justify-between text-sm bg-white/5 rounded-xl px-4 py-3">
                      <span className="text-text-secondary">
                        Keep updated about event updates
                      </span>
                      <span
                        className={`text-xs px-2.5 py-0.5 rounded-md font-semibold ${customer?.keepUpdated ? "bg-green-500/10 text-green-400 border border-green-500/20" : "bg-white/5 text-text-muted border border-white/10"}`}
                      >
                        {keepUpdated}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm bg-white/5 rounded-xl px-4 py-3">
                      <span className="text-text-secondary">
                        Receive details on best events
                      </span>
                      <span
                        className={`text-xs px-2.5 py-0.5 rounded-md font-semibold ${customer?.sendBestEvents ? "bg-green-500/10 text-green-400 border border-green-500/20" : "bg-white/5 text-text-muted border border-white/10"}`}
                      >
                        {sendBestEvents}
                      </span>
                    </div>
                  </div>

                  <div className="border-t border-white/5 pt-4">
                    <h4 className="text-text-muted font-medium text-xs uppercase tracking-wider mb-3">
                      Ticket Details
                    </h4>
                    <div className="space-y-2">
                      {selectedBooking.tickets.map((t, idx) => (
                        <div
                          key={idx}
                          className="flex justify-between items-center text-sm"
                        >
                          <div>
                            <p className="text-white font-medium">
                              {t.tierName}
                            </p>
                            <p className="text-text-muted text-xs">
                              ₹{t.price.toLocaleString("en-IN")} × {t.quantity}
                            </p>
                          </div>
                          <span className="text-white font-semibold">
                            ₹{(t.price * t.quantity).toLocaleString("en-IN")}
                          </span>
                        </div>
                      ))}
                      <div className="flex justify-between items-center text-sm border-t border-white/5 pt-3 mt-3">
                        <span className="text-text-secondary font-medium">
                          Grand Total
                        </span>
                        <span className="text-accent-purple text-base font-black">
                          ₹{selectedBooking.totalAmount.toLocaleString("en-IN")}
                        </span>
                      </div>
                    </div>
                  </div>

                  {selectedBooking.status === "cancelled" &&
                    selectedBooking.cancellationReason && (
                      <div className="border-t border-white/5 pt-4">
                        <h4 className="text-red-400 font-medium text-xs uppercase tracking-wider mb-1">
                          Cancellation Detail
                        </h4>
                        <p className="text-text-secondary text-sm italic">
                          &ldquo;{selectedBooking.cancellationReason}&rdquo;
                        </p>
                      </div>
                    )}

                  <div className="flex gap-3 border-t border-white/10 pt-4">
                    <button
                      onClick={() => setSelectedBooking(null)}
                      className="flex-1 py-2.5 glass border border-border-subtle rounded-xl text-sm text-text-secondary hover:text-white transition-colors"
                    >
                      Close
                    </button>
                    {selectedBooking.status === "confirmed" && (
                      <button
                        onClick={() => {
                          setCancelTarget(selectedBooking);
                          setSelectedBooking(null);
                        }}
                        className="px-4 py-2.5 bg-error/80 hover:bg-error rounded-xl text-white text-sm font-semibold transition-colors"
                      >
                        Cancel Booking
                      </button>
                    )}
                  </div>
                </motion.div>
              </div>
            );
          })()}
      </AnimatePresence>
    </div>
  );
}
