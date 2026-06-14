import React from 'react';

interface UserAlertBannerProps {
  successToast: string | null;
  errorToast: string | null;
}

export default function UserAlertBanner({
  successToast,
  errorToast,
}: UserAlertBannerProps) {
  return (
    <>
      {successToast && (
        <div className="fixed top-20 right-6 z-50 px-4 py-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs text-emerald-400 font-semibold shadow-glow-sm">
          {successToast}
        </div>
      )}
      {errorToast && (
        <div className="fixed top-20 right-6 z-50 px-4 py-3 bg-error/10 border border-error/30 rounded-xl text-xs text-red-400 font-semibold shadow-glow-sm">
          {errorToast}
        </div>
      )}
    </>
  );
}
