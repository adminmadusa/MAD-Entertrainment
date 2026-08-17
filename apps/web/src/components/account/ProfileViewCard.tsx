'use client';

import React, { useRef, useState } from 'react';

import { extractApiError } from '@/lib/api/client';
import { publicUploadProfilePhoto, publicDeleteProfilePhoto } from '@/lib/api/public.service';
import { useAuth } from '@/providers/AuthProvider';
import type { AuthUser } from '@/types/auth';
import { Button } from '@mad/ui';

interface ProfileViewCardProps {
  user: AuthUser | null;
  onEditClick: () => void;
}

export function ProfileViewCard({ user, onEditClick }: ProfileViewCardProps) {
  const userName = user?.name || [user?.firstName, user?.lastName].filter(Boolean).join(' ') || 'Account User';
  const userPhone = user?.mobileNumber || user?.phone || 'Not Provided';
  const userEmail = user?.email || 'N/A';

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const { updateUser } = useAuth();

  const handlePhotoClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setErrorMsg('File size must be less than 5MB');
      return;
    }

    setIsUploading(true);
    setErrorMsg('');
    try {
      const data = await publicUploadProfilePhoto(file);
      updateUser({ picture: data.picture });
    } catch (err: unknown) {
      const apiErr = extractApiError(err);
      setErrorMsg(apiErr.message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeletePhoto = async () => {
    if (!confirm('Are you sure you want to delete your profile photo?')) return;
    setIsUploading(true);
    setErrorMsg('');
    try {
      await publicDeleteProfilePhoto();
      updateUser({ picture: undefined });
    } catch (err: unknown) {
      const apiErr = extractApiError(err);
      setErrorMsg(apiErr.message);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="flex flex-col items-center gap-1.5 flex-shrink-0">
            <div className="relative group">
              <button
                type="button"
                disabled={isUploading}
                onClick={handlePhotoClick}
                aria-label="Change profile photo"
                className="w-16 h-16 rounded-full overflow-hidden border border-white/10 focus:outline-none focus:ring-2 focus:ring-accent-purple relative flex items-center justify-center transition-all duration-300 hover:opacity-90 active:scale-95 disabled:opacity-50"
              >
                {user?.picture ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={user.picture}
                    alt={userName}
                    width={64}
                    height={64}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-brand flex items-center justify-center text-white text-2xl font-black shadow-glow-sm select-none">
                    {userName.charAt(0).toUpperCase()}
                  </div>
                )}
                {isUploading ? (
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  </div>
                ) : (
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity duration-300">
                    <span className="text-[10px] text-white font-bold uppercase tracking-wider text-center px-1">Change</span>
                  </div>
                )}
              </button>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/png, image/jpeg, image/webp"
                className="hidden"
              />
            </div>
            {user?.picture && !isUploading && (
              <button
                type="button"
                onClick={handleDeletePhoto}
                className="text-[10px] font-extrabold text-red-400 hover:text-red-300 transition-colors uppercase tracking-wider min-h-[20px] flex items-center justify-center"
              >
                Remove
              </button>
            )}
          </div>

          <div className="pt-1">
            <h2 className="text-white font-bold text-xl">Account Details</h2>
            <p className="text-text-secondary text-xs mt-1">Manage your account details and linked contact information</p>
            {errorMsg && <p className="text-red-400 text-[10px] font-semibold mt-1" role="alert">⚠️ {errorMsg}</p>}
          </div>
        </div>
        <div className="flex-shrink-0">
          <Button
            type="button"
            onClick={onEditClick}
            variant="outline"
            className="w-full sm:w-auto px-5 py-2.5 text-xs font-bold rounded-xl border border-white/10 text-white hover:bg-white/5 active:scale-95 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-purple focus-visible:ring-offset-2 focus-visible:ring-offset-background min-h-[44px] min-w-[120px]"
          >
            Edit Profile
          </Button>
        </div>
      </div>

      <div className="border-t border-border-subtle/30 pt-6 grid grid-cols-1 sm:grid-cols-2 gap-6 text-sm">
        <div className="space-y-1">
          <span className="text-[10px] text-text-muted uppercase tracking-wider block">First Name</span>
          <span className="text-white font-semibold block">{user?.firstName || '—'}</span>
        </div>
        <div className="space-y-1">
          <span className="text-[10px] text-text-muted uppercase tracking-wider block">Last Name</span>
          <span className="text-white font-semibold block">{user?.lastName || '—'}</span>
        </div>
        <div className="space-y-1">
          <span className="text-[10px] text-text-muted uppercase tracking-wider block">Email Address</span>
          <span className="text-white font-semibold block">{userEmail}</span>
        </div>
        <div className="space-y-1">
          <span className="text-[10px] text-text-muted uppercase tracking-wider block">Phone Number</span>
          <span className="text-white font-semibold block">{userPhone}</span>
        </div>
      </div>
    </div>
  );
}
