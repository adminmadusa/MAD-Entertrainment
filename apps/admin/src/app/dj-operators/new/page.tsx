"use client";

import { DJOperator } from "@mad/types";
import { useMutation } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { CloudinaryUpload } from "@/components/CloudinaryUpload";
import { adminCreateDJ } from "@/lib/api/admin/dj-operator.service";
import { extractApiError } from "@/lib/api/client";

interface CloudinaryAsset {
  url: string;
  publicId: string;
  alt?: string;
}

export default function CreateDJPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [bio, setBio] = useState("");
  const [specialties, setSpecialties] = useState("");
  const [isActive, setIsActive] = useState(true);

  // Social Links
  const [instagram, setInstagram] = useState("");
  const [soundcloud, setSoundcloud] = useState("");
  const [youtube, setYoutube] = useState("");

  // Media
  const [profileImage, setProfileImage] = useState<CloudinaryAsset | null>(
    null,
  );
  const [galleryImages, setGalleryImages] = useState<CloudinaryAsset[]>([]);
  const [error, setError] = useState("");

  const createMutation = useMutation({
    mutationFn: adminCreateDJ,
    onSuccess: () => router.push("/dj-operators"),
    onError: (err) => {
      const apiErr = extractApiError(err);
      if (apiErr.errors) {
        const details = Object.entries(apiErr.errors)
          .map(([field, msgs]) => `${field}: ${msgs.join(", ")}`)
          .join("; ");
        setError(`Validation failed — ${details}`);
      } else {
        setError(apiErr.message);
      }
    },
  });

  const handleImageChange = (index: number, asset: CloudinaryAsset | null) => {
    if (asset === null) {
      setGalleryImages((prev) => prev.filter((_, idx) => idx !== index));
    } else {
      setGalleryImages((prev) =>
        prev.map((img, idx) => (idx === index ? asset : img)),
      );
    }
  };

  const handleAddImage = (asset: CloudinaryAsset | null) => {
    if (asset) {
      setGalleryImages((prev) => [...prev, asset]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!name.trim()) {
      setError("Name is required.");
      return;
    }

    const cleanSlug = slug.trim()
      ? slug
          .trim()
          .toLowerCase()
          .replace(/[^a-z0-9-]/g, "-")
      : name
          .trim()
          .toLowerCase()
          .replace(/[^a-z0-9-]/g, "-")
          .replace(/-+/g, "-")
          .replace(/^-|-$/g, "");

    const specs = specialties
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const links = [
      ...(instagram.trim()
        ? [{ platform: "instagram", url: instagram.trim() }]
        : []),
      ...(soundcloud.trim()
        ? [{ platform: "soundcloud", url: soundcloud.trim() }]
        : []),
      ...(youtube.trim() ? [{ platform: "youtube", url: youtube.trim() }] : []),
    ];

    const payload: Partial<DJOperator> = {
      name: name.trim(),
      slug: cleanSlug,
      bio: bio.trim() || undefined,
      specialties: specs.length > 0 ? specs : undefined,
      profileImage: profileImage ?? undefined,
      galleryImages,
      socialLinks: links.length > 0 ? links : undefined,
      isActive,
    };

    createMutation.mutate(payload);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white">Add DJ Operator</h1>
          <p className="text-text-muted text-sm mt-0.5">
            Register a new DJ or resident artist
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
        {error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="px-4 py-3 bg-error/10 border border-error/30 rounded-xl text-sm text-red-400"
          >
            {error}
          </motion.div>
        )}

        {/* Profile Image & Gallery */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="glass rounded-2xl border border-border-subtle p-6 md:col-span-1">
            <CloudinaryUpload
              folder="dj-operators"
              value={profileImage}
              onChange={setProfileImage}
              label="Profile Photo"
              aspectRatio="aspect-square"
              id="dj-profile-photo"
            />
          </div>
          <div className="glass rounded-2xl border border-border-subtle p-6 md:col-span-2 space-y-4">
            <h2 className="text-white font-semibold">DJ Gallery</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {galleryImages.map((img, index) => (
                <div key={img.publicId} className="relative">
                  <CloudinaryUpload
                    folder="dj-operators"
                    value={img}
                    onChange={(asset) => handleImageChange(index, asset)}
                    aspectRatio="aspect-video"
                    label=""
                  />
                </div>
              ))}
              {galleryImages.length < 10 && (
                <div>
                  <CloudinaryUpload
                    folder="dj-operators"
                    value={null}
                    onChange={handleAddImage}
                    aspectRatio="aspect-video"
                    label="Add Gallery Photo"
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Basic Info */}
        <div className="glass rounded-2xl border border-border-subtle p-6 space-y-5">
          <h2 className="text-white font-semibold">Basic Information</h2>
          <Field label="DJ Name / Stage Name *">
            <input
              id="dj-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. DJ Shaan"
              required
              className={inputCls}
            />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Slug (optional)">
              <input
                id="dj-slug"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="e.g. dj-shaan"
                className={inputCls}
              />
            </Field>
            <Field label="Specialties / Genres (comma-separated)">
              <input
                id="dj-specialties"
                value={specialties}
                onChange={(e) => setSpecialties(e.target.value)}
                placeholder="e.g. Techno, House, Progressive"
                className={inputCls}
              />
            </Field>
          </div>
          <Field label="Bio (optional)">
            <textarea
              id="dj-bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Describe the DJ's profile, residency status, and gigs..."
              rows={4}
              className={`${inputCls} resize-none`}
            />
          </Field>
        </div>

        {/* Social Links */}
        <div className="glass rounded-2xl border border-border-subtle p-6 space-y-5">
          <h2 className="text-white font-semibold">
            Social & Streaming Profiles
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Instagram URL">
              <input
                value={instagram}
                onChange={(e) => setInstagram(e.target.value)}
                placeholder="https://instagram.com/..."
                className={inputCls}
              />
            </Field>
            <Field label="SoundCloud Profile URL">
              <input
                value={soundcloud}
                onChange={(e) => setSoundcloud(e.target.value)}
                placeholder="https://soundcloud.com/..."
                className={inputCls}
              />
            </Field>
          </div>
          <Field label="YouTube Channel URL">
            <input
              value={youtube}
              onChange={(e) => setYoutube(e.target.value)}
              placeholder="https://youtube.com/..."
              className={inputCls}
            />
          </Field>
          <div className="flex items-center gap-3 cursor-pointer select-none py-1">
            <input
              type="checkbox"
              id="dj-active"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="w-4 h-4 accent-accent-purple rounded"
            />
            <label htmlFor="dj-active" className="text-text-secondary text-sm">
              Mark this DJ as active for event lineups
            </label>
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
            id="dj-submit"
            type="submit"
            disabled={createMutation.isPending}
            className="flex-1 py-3 btn-gradient text-white font-bold rounded-xl shadow-glow-sm disabled:opacity-60 transition-all"
          >
            {createMutation.isPending ? "Creating..." : "Create DJ Operator"}
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
