"use client";

import { Artist } from "@mad/types";
import { useQuery, useMutation } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { useRouter, useParams } from "next/navigation";
import { useState, useEffect } from "react";

import { CloudinaryUpload } from "@/components/CloudinaryUpload";
import {
  adminGetArtist,
  adminUpdateArtist,
} from "@/lib/api/admin/artist.service";
import { extractApiError } from "@/lib/api/client";

interface CloudinaryAsset {
  url: string;
  publicId: string;
  alt?: string;
}

export default function EditArtistPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [bio, setBio] = useState("");
  const [genre, setGenre] = useState("");
  const [isActive, setIsActive] = useState(true);

  // Social Links
  const [instagram, setInstagram] = useState("");
  const [youtube, setYoutube] = useState("");
  const [spotify, setSpotify] = useState("");
  const [twitter, setTwitter] = useState("");
  const [facebook, setFacebook] = useState("");

  // Media
  const [profileImage, setProfileImage] = useState<CloudinaryAsset | null>(
    null,
  );
  const [galleryImages, setGalleryImages] = useState<CloudinaryAsset[]>([]);
  const [error, setError] = useState("");

  // Fetch current artist
  const { data: artist, isLoading } = useQuery({
    queryKey: ["admin-artist", id],
    queryFn: () => adminGetArtist(id),
    enabled: !!id,
  });

  // Prepopulate state
  useEffect(() => {
    if (artist) {
      setName(artist.name || "");
      setSlug(artist.slug || "");
      setBio(artist.bio || "");
      setGenre(artist.genre?.join(", ") || "");
      setIsActive(artist.isActive ?? true);

      const getSocialUrl = (platform: string) => {
        return (
          (artist.socialLinks as any)?.find(
            (link: any) => link.platform === platform,
          )?.url || ""
        );
      };
      setInstagram(getSocialUrl("instagram"));
      setYoutube(getSocialUrl("youtube"));
      setSpotify(getSocialUrl("spotify"));
      setTwitter(getSocialUrl("twitter"));
      setFacebook(getSocialUrl("facebook"));

      setProfileImage(artist.profileImage || null);
      setGalleryImages(artist.galleryImages || []);
    }
  }, [artist]);

  const updateMutation = useMutation({
    mutationFn: (payload: Partial<Artist>) => adminUpdateArtist(id, payload),
    onSuccess: () => router.push("/artists"),
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

    const genres = genre
      .split(",")
      .map((g) => g.trim())
      .filter(Boolean);
    const links = [
      ...(instagram.trim()
        ? [{ platform: "instagram", url: instagram.trim() }]
        : []),
      ...(youtube.trim() ? [{ platform: "youtube", url: youtube.trim() }] : []),
      ...(spotify.trim() ? [{ platform: "spotify", url: spotify.trim() }] : []),
      ...(twitter.trim() ? [{ platform: "twitter", url: twitter.trim() }] : []),
      ...(facebook.trim()
        ? [{ platform: "facebook", url: facebook.trim() }]
        : []),
    ];

    const payload: Partial<Artist> = {
      name: name.trim(),
      slug: cleanSlug,
      bio: bio.trim() || undefined,
      genre: genres.length > 0 ? genres : undefined,
      profileImage: profileImage as any,
      galleryImages,
      socialLinks: links.length > 0 ? links : undefined,
      isActive,
    };

    updateMutation.mutate(payload);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="text-white/40 text-sm animate-pulse">
          Loading artist parameters...
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white">Edit Artist</h1>
          <p className="text-text-muted text-sm mt-0.5">
            Modify artist details
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
              folder="artists"
              value={profileImage}
              onChange={setProfileImage}
              label="Profile Photo"
              aspectRatio="aspect-square"
              id="artist-profile-photo"
            />
          </div>
          <div className="glass rounded-2xl border border-border-subtle p-6 md:col-span-2 space-y-4">
            <h2 className="text-white font-semibold">Artist Gallery</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {galleryImages.map((img, index) => (
                <div key={img.publicId} className="relative">
                  <CloudinaryUpload
                    folder="artists"
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
                    folder="artists"
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
          <Field label="Artist Name *">
            <input
              id="artist-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Nucleya"
              required
              className={inputCls}
            />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Slug">
              <input
                id="artist-slug"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="e.g. nucleya"
                className={inputCls}
              />
            </Field>
            <Field label="Genres (comma-separated)">
              <input
                id="artist-genres"
                value={genre}
                onChange={(e) => setGenre(e.target.value)}
                placeholder="e.g. EDM, Dubstep, Bass"
                className={inputCls}
              />
            </Field>
          </div>
          <Field label="Bio (optional)">
            <textarea
              id="artist-bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Describe the artist biography, genres, and milestones..."
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
            <Field label="Spotify Artist URL">
              <input
                value={spotify}
                onChange={(e) => setSpotify(e.target.value)}
                placeholder="https://open.spotify.com/artist/..."
                className={inputCls}
              />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="YouTube Channel URL">
              <input
                value={youtube}
                onChange={(e) => setYoutube(e.target.value)}
                placeholder="https://youtube.com/..."
                className={inputCls}
              />
            </Field>
            <Field label="Twitter / X URL">
              <input
                value={twitter}
                onChange={(e) => setTwitter(e.target.value)}
                placeholder="https://x.com/..."
                className={inputCls}
              />
            </Field>
          </div>
          <Field label="Facebook URL">
            <input
              value={facebook}
              onChange={(e) => setFacebook(e.target.value)}
              placeholder="https://facebook.com/..."
              className={inputCls}
            />
          </Field>
          <div className="flex items-center gap-3 cursor-pointer select-none py-1">
            <input
              type="checkbox"
              id="artist-active"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="w-4 h-4 accent-accent-purple rounded"
            />
            <label
              htmlFor="artist-active"
              className="text-text-secondary text-sm"
            >
              Mark this artist as active for event lineups
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
            id="artist-submit"
            type="submit"
            disabled={updateMutation.isPending}
            className="flex-1 py-3 btn-gradient text-white font-bold rounded-xl shadow-glow-sm disabled:opacity-60 transition-all"
          >
            {updateMutation.isPending ? "Saving Changes..." : "Save Changes"}
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
