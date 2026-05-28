"use client";

import { Venue } from "@mad/types";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { adminCreateVenue } from "@/lib/api/admin/venue.service";
import { venueQueryKey } from "@/lib/query/venue-query-key";
import { extractApiError } from "@/lib/api/client";

export default function CreateVenuePage() {
  const router = useRouter();

  // Basic Info
  const [name, setName] = useState("");
  const [capacity, setCapacity] = useState<number | "">("");

  // Address
  const [street, setStreet] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [pincode, setPincode] = useState("");
  const [country, setCountry] = useState("India");

  // Coordinates
  const [lat, setLat] = useState<number | "">("");
  const [lng, setLng] = useState<number | "">("");

  const [error, setError] = useState("");

  const qc = useQueryClient();
  const createMutation = useMutation({
    mutationFn: adminCreateVenue,
    onSuccess: () => {
      // Invalidate the venue list cache (default filters) so the new venue appears immediately
      qc.invalidateQueries({
        queryKey: venueQueryKey({ page: 1, search: "", city: "" }),
      });
      router.push("/venues");
    },
    onError: (err) => setError(extractApiError(err).message),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (
      !name.trim() ||
      !city.trim() ||
      !state.trim() ||
      !pincode.trim() ||
      capacity === ""
    ) {
      setError("Name, city, state, pincode, and capacity are required.");
      return;
    }

    const payload: Partial<Venue> = {
      name: name.trim(),
      city: city.trim() || undefined,
      state: state.trim() || undefined,
      address: street.trim() || undefined,
      capacity: Number(capacity),
    };

    createMutation.mutate(payload);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white">Add Venue</h1>
          <p className="text-text-muted text-sm mt-0.5">
            Register a new event venue
          </p>
        </div>
        <button
          onClick={() => router.back()}
          className="text-text-muted text-sm hover:text-text-secondary transition-colors flex items-center gap-1.5"
        >
          ← Back
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Error notification */}
        {error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="px-4 py-3 bg-error/10 border border-error/30 rounded-xl text-sm text-red-400"
          >
            {error}
          </motion.div>
        )}

        {/* Basic Info */}
        <div className="glass rounded-2xl border border-border-subtle p-6 space-y-5">
          <h2 className="text-white font-semibold">Basic Information</h2>
          <Field label="Venue Name *">
            <input
              id="venue-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. NSCI Dome, Worli"
              required
              className={inputCls}
            />
          </Field>
          <Field label="Total Capacity *">
            <input
              id="venue-capacity"
              type="number"
              min="1"
              value={capacity}
              onChange={(e) =>
                setCapacity(e.target.value === "" ? "" : Number(e.target.value))
              }
              placeholder="e.g. 5000"
              required
              className={inputCls}
            />
          </Field>
        </div>

        {/* Address */}
        <div className="glass rounded-2xl border border-border-subtle p-6 space-y-5">
          <h2 className="text-white font-semibold">Location / Address</h2>
          <Field label="Street / Area">
            <input
              id="venue-street"
              value={street}
              onChange={(e) => setStreet(e.target.value)}
              placeholder="e.g. Lala Lajpatrai Marg, Lotus Colony"
              className={inputCls}
            />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="City *">
              <input
                id="venue-city"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="e.g. Mumbai"
                required
                className={inputCls}
              />
            </Field>
            <Field label="State *">
              <input
                id="venue-state"
                value={state}
                onChange={(e) => setState(e.target.value)}
                placeholder="e.g. Maharashtra"
                required
                className={inputCls}
              />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Pincode *">
              <input
                id="venue-pincode"
                value={pincode}
                onChange={(e) => setPincode(e.target.value)}
                placeholder="e.g. 400018"
                required
                className={inputCls}
              />
            </Field>
            <Field label="Country">
              <input
                id="venue-country"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className={inputCls}
              />
            </Field>
          </div>
        </div>

        {/* Coordinates */}
        <div className="glass rounded-2xl border border-border-subtle p-6 space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-white font-semibold">Coordinates (optional)</h2>
            <span className="text-[10px] text-text-muted">
              Used for map pins
            </span>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Latitude">
              <input
                type="number"
                step="any"
                min="-90"
                max="90"
                value={lat}
                onChange={(e) =>
                  setLat(e.target.value === "" ? "" : Number(e.target.value))
                }
                placeholder="e.g. 18.9902"
                className={inputCls}
              />
            </Field>
            <Field label="Longitude">
              <input
                type="number"
                step="any"
                min="-180"
                max="180"
                value={lng}
                onChange={(e) =>
                  setLng(e.target.value === "" ? "" : Number(e.target.value))
                }
                placeholder="e.g. 72.8130"
                className={inputCls}
              />
            </Field>
          </div>
        </div>

        {/* Submit Actions */}
        <div className="flex gap-4 pb-6">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex-1 py-3 glass border border-border-subtle rounded-xl text-text-secondary font-medium hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            id="venue-submit"
            type="submit"
            disabled={createMutation.isPending}
            className="flex-1 py-3 btn-gradient text-white font-bold rounded-xl shadow-glow-sm disabled:opacity-60 transition-colors"
          >
            {createMutation.isPending ? "Creating..." : "Create Venue"}
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-text-secondary text-sm font-medium block">
        {label}
      </label>
      {children}
    </div>
  );
}

const inputCls =
  "w-full px-4 py-2.5 rounded-xl bg-background border border-border-subtle text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-purple transition-colors";
