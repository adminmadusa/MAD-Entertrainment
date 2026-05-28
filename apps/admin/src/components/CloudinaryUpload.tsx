"use client";

import { useState, useRef, useCallback } from "react";

import { adminApiClient } from "@/lib/api/client";

interface CloudinaryAsset {
  url: string;
  publicId: string;
  alt?: string;
}

interface CloudinaryUploadProps {
  folder?: "events" | "venues" | "artists" | "dj-operators" | "popups";
  value?: CloudinaryAsset | null;
  onChange: (asset: CloudinaryAsset | null) => void;
  label?: string;
  aspectRatio?: string;
  maxSizeMB?: number;
  id?: string;
}

type UploadState = "idle" | "uploading" | "success" | "error";

export function CloudinaryUpload({
  folder = "events",
  value,
  onChange,
  label = "Upload Image",
  aspectRatio = "aspect-video",
  maxSizeMB = 5,
  id,
}: CloudinaryUploadProps) {
  const [uploadState, setUploadState] = useState<UploadState>("idle");
  const [progress, setProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const uploadFile = useCallback(
    async (file: File) => {
      // Validate type
      if (!file.type.startsWith("image/")) {
        setErrorMessage("Only image files are allowed");
        setUploadState("error");
        return;
      }

      // Validate size
      if (file.size > maxSizeMB * 1024 * 1024) {
        setErrorMessage(`File too large. Max ${maxSizeMB}MB allowed.`);
        setUploadState("error");
        return;
      }

      setUploadState("uploading");
      setProgress(0);
      setErrorMessage("");

      try {
        const formData = new FormData();
        formData.append("image", file);

        const { data: uploadRes } = await adminApiClient.post<{
          data: { url: string; publicId: string };
        }>(`/admin/uploads/image?folder=${folder}`, formData, {
          headers: {
            "Content-Type": "multipart/form-data",
          },
          onUploadProgress: (progressEvent) => {
            if (progressEvent.total) {
              setProgress(
                Math.round((progressEvent.loaded / progressEvent.total) * 100),
              );
            }
          },
        });

        onChange({
          url: uploadRes.data.url,
          publicId: uploadRes.data.publicId,
        });
        setUploadState("success");
      } catch (err) {
        console.error("[CloudinaryUpload] Upload failed:", err);
        setErrorMessage("Upload failed. Please try again.");
        setUploadState("error");
      }
    },
    [folder, maxSizeMB, onChange],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) uploadFile(file);
    },
    [uploadFile],
  );

  const handleRemove = useCallback(async () => {
    if (value?.publicId) {
      // Optionally delete from Cloudinary (fire and forget)
      adminApiClient
        .delete("/admin/uploads", { data: { publicId: value.publicId } })
        .catch(() => {});
    }
    onChange(null);
    setUploadState("idle");
    setProgress(0);
  }, [value, onChange]);

  return (
    <div className="space-y-2">
      {label && (
        <label className="text-sm font-medium text-text-secondary block">
          {label}
        </label>
      )}

      {/* Preview */}
      {value?.url ? (
        <div
          className={`relative ${aspectRatio} min-h-[140px] rounded-xl overflow-hidden border border-border-subtle bg-white/2 group`}
        >
          <div className="absolute inset-0 animate-pulse motion-reduce:animate-none bg-white/5" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={value.url}
            alt={value.alt ?? "Uploaded image"}
            loading="lazy"
            decoding="async"
            className="relative z-[1] w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              aria-label="Replace image"
              className="px-3 py-2 bg-white/20 backdrop-blur text-white text-xs font-medium rounded-lg hover:bg-white/30 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80"
            >
              Replace
            </button>
            <button
              type="button"
              onClick={handleRemove}
              aria-label="Remove image"
              className="px-3 py-2 bg-error/70 backdrop-blur text-white text-xs font-medium rounded-lg hover:bg-error transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80"
            >
              Remove
            </button>
          </div>
        </div>
      ) : (
        /* Drop zone */
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() =>
            uploadState !== "uploading" && inputRef.current?.click()
          }
          className={[
            `${aspectRatio} min-h-[140px] rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-3`,
            "cursor-pointer transition-colors motion-reduce:transition-none duration-200",
            isDragging
              ? "border-accent-purple bg-accent-purple/10"
              : "border-border-subtle hover:border-accent-purple/50 hover:bg-white/2",
            uploadState === "error" ? "border-error/50" : "",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-purple",
          ].join(" ")}
          role="button"
          tabIndex={uploadState === "uploading" ? -1 : 0}
          aria-label={label ? `Upload image for ${label}` : "Upload image"}
          onKeyDown={(e) => {
            if (
              uploadState !== "uploading" &&
              (e.key === "Enter" || e.key === " ")
            ) {
              e.preventDefault();
              inputRef.current?.click();
            }
          }}
        >
          {uploadState === "uploading" ? (
            <div className="text-center space-y-3 px-4">
              <div className="w-full h-1.5 bg-background-card rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-brand rounded-full transition-[width] motion-reduce:transition-none duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-text-muted text-sm">
                Uploading... {progress}%
              </p>
            </div>
          ) : (
            <>
              <div className="w-10 h-10 rounded-xl bg-accent-purple/10 flex items-center justify-center text-accent-purple">
                <UploadIcon />
              </div>
              <div className="text-center">
                <p className="text-text-secondary text-sm font-medium">
                  Drop image here or{" "}
                  <span className="text-accent-purple">browse</span>
                </p>
                <p className="text-text-muted text-xs mt-1">
                  JPG, PNG, WEBP — max {maxSizeMB}MB
                </p>
              </div>
              {uploadState === "error" && (
                <p className="text-error text-xs">{errorMessage}</p>
              )}
            </>
          )}
        </div>
      )}

      <input
        ref={inputRef}
        id={id}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) uploadFile(file);
          e.target.value = "";
        }}
      />
    </div>
  );
}

function UploadIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  );
}
