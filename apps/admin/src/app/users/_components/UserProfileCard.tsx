import React, { useState } from 'react';
import { UserDetailResponse } from '@/lib/api/admin/user.service';
import { formatDateTime } from '@mad/utils';

interface UserProfileCardProps {
  profile: UserDetailResponse['data']['profile'];
  isToggleAllowed: boolean;
  isPending: boolean;
  onToggleClick: () => void;
}

export default function UserProfileCard({
  profile,
  isToggleAllowed,
  isPending,
  onToggleClick,
}: UserProfileCardProps) {
  // Copy feedback states local to the profile card
  const [emailCopied, setEmailCopied] = useState(false);
  const [phoneCopied, setPhoneCopied] = useState(false);

  const handleCopy = (text: string, type: 'email' | 'phone') => {
    if (!text || text === '—') return;
    navigator.clipboard.writeText(text);
    if (type === 'email') {
      setEmailCopied(true);
      setTimeout(() => setEmailCopied(false), 2000);
    } else {
      setPhoneCopied(true);
      setTimeout(() => setPhoneCopied(false), 2000);
    }
  };

  return (
    <div className="glass p-6 rounded-2xl border border-border-subtle/60 flex flex-col justify-between">
      <div className="space-y-4">
        <div>
          <span className="text-[10px] uppercase font-bold text-accent-purple tracking-wider">
            {profile.accountType === 'guest' ? 'Guest Customer' : 'Registered Customer'}
          </span>
          <h2 className="text-white font-black text-xl mt-1">{profile.name}</h2>
          {profile.id && <p className="text-text-muted text-xs font-mono mt-0.5">ID: {profile.id}</p>}
        </div>

        {/* Account Status controls (registered users only) */}
        {profile.accountType !== 'guest' && (
          <div className="flex items-center justify-between py-2 border-y border-white/5">
            <div>
              <p className="text-xs font-semibold text-text-primary">Account Status</p>
              <p className="text-[10px] text-text-muted">Registered via {profile.loginVia}</p>
            </div>
            <div className="flex items-center gap-3">
              <span className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold capitalize ${
                profile.isActive ? 'bg-green-500/10 border-green-500/30 text-green-400' : 'bg-red-500/10 border-red-500/30 text-red-400'
              }`}>
                {profile.isActive ? 'Active' : 'Suspended'}
              </span>
              {isToggleAllowed && (
                <button
                  onClick={onToggleClick}
                  disabled={isPending}
                  className={`text-xs font-bold px-3 py-1.5 rounded-lg border transition-all ${
                    profile.isActive
                      ? 'border-error/30 text-red-400 hover:bg-error/10'
                      : 'border-green-500/30 text-green-400 hover:bg-green-500/10'
                  }`}
                >
                  {profile.isActive ? 'Suspend' : 'Reactivate'}
                </button>
              )}
            </div>
          </div>
        )}

        {/* Details */}
        <div className="space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-text-muted">Email</span>
            <div className="flex items-center gap-1.5 font-mono">
              <span className="text-text-secondary">{profile.email}</span>
              <button
                onClick={() => handleCopy(profile.email, 'email')}
                className="p-1 hover:bg-white/5 rounded text-[10px] text-accent-purple"
              >
                {emailCopied ? 'Copied!' : 'Copy'}
              </button>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-text-muted">Mobile Number</span>
            <div className="flex items-center gap-1.5 font-mono">
              <span className="text-text-secondary">{profile.phone}</span>
              <button
                onClick={() => handleCopy(profile.phone, 'phone')}
                className="p-1 hover:bg-white/5 rounded text-[10px] text-accent-purple"
                disabled={profile.phone === '—'}
              >
                {phoneCopied ? 'Copied!' : 'Copy'}
              </button>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-text-muted">Created Date</span>
            <span className="text-text-secondary">
              {formatDateTime(profile.createdAt)}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-text-muted">Last Login</span>
            <span className="text-text-secondary">
              {profile.lastLogin ? formatDateTime(profile.lastLogin) : '—'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
