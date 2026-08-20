'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import React from 'react';

interface DashboardOperationalAlertsProps {
  pendingRefundsCount?: number;
  showDiagnosticsAlerts: boolean;
  failedPaymentRecoveryCount: number;
  isDeliveryLoading: boolean;
  totalDeliveryIssues: number;
}

export function DashboardOperationalAlerts({
  pendingRefundsCount,
  showDiagnosticsAlerts,
  failedPaymentRecoveryCount,
  isDeliveryLoading,
  totalDeliveryIssues,
}: DashboardOperationalAlertsProps) {
  return (
    <div className="space-y-4">
      {pendingRefundsCount && pendingRefundsCount > 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Link
            href="/refunds"
            className="flex items-center justify-between p-4 bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded-xl text-sm font-semibold hover:bg-amber-500/15 transition-all"
          >
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 bg-amber-500 rounded-full animate-pulse" />
              <span>Pending Actions Required: You have {pendingRefundsCount} refund request{pendingRefundsCount > 1 ? 's' : ''} awaiting review.</span>
            </div>
            <span className="text-xs font-bold underline bg-amber-500/20 px-2.5 py-1.5 rounded">Process →</span>
          </Link>
        </motion.div>
      ) : null}

      {showDiagnosticsAlerts && (
        <>
          {failedPaymentRecoveryCount > 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <Link
                href="/diagnostics"
                className="flex items-center justify-between p-4 bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl text-sm font-semibold hover:bg-red-500/15 transition-all"
              >
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse" />
                  <span>Action Required: You have {failedPaymentRecoveryCount} payment recovery drift{failedPaymentRecoveryCount > 1 ? 's' : ''} requiring investigation.</span>
                </div>
                <span className="text-xs font-bold underline bg-red-500/20 px-2.5 py-1.5 rounded">Investigate →</span>
              </Link>
            </motion.div>
          ) : null}

          {isDeliveryLoading ? (
            <div className="text-text-secondary text-xs animate-pulse p-4 bg-white/5 rounded-xl border border-border-subtle">Checking system delivery logs...</div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              {totalDeliveryIssues === 0 ? (
                <div className="flex items-center gap-2 bg-emerald-500/5 border border-emerald-500/10 text-emerald-400 rounded-xl p-4 text-sm font-semibold">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>System deliverability is operating normally. 0 active transmission issues detected.</span>
                </div>
              ) : (
                <Link
                  href="/diagnostics"
                  className="flex items-center justify-between p-4 bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl text-sm font-semibold hover:bg-red-500/15 transition-all"
                >
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse" />
                    <span>Action Recommended: {totalDeliveryIssues} system delivery issue{totalDeliveryIssues > 1 ? 's' : ''} require{totalDeliveryIssues === 1 ? 's' : ''} attention.</span>
                  </div>
                  <span className="text-xs font-bold underline bg-red-500/20 px-2.5 py-1.5 rounded">Resolve in Diagnostics →</span>
                </Link>
              )}
            </motion.div>
          )}
        </>
      )}
    </div>
  );
}
