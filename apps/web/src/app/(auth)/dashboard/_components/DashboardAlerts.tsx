import React from 'react';

export interface DashboardAlertsProps {
  errorMsg?: string;
  infoMsg?: string;
}

export function DashboardAlerts({ errorMsg, infoMsg }: DashboardAlertsProps) {
  if (!errorMsg && !infoMsg) return null;

  return (
    <>
      {errorMsg && (
        <div className="p-4 bg-error/10 border border-error/30 rounded-2xl text-xs text-red-400 text-center">
          {errorMsg}
        </div>
      )}
      {infoMsg && (
        <div className="p-4 bg-accent-purple/10 border border-accent-purple/30 rounded-2xl text-xs text-purple-300 text-center animate-in fade-in duration-300">
          {infoMsg}
        </div>
      )}
    </>
  );
}
