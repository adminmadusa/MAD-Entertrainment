'use client';

import { useMutation, type QueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import {
  adminDrainQueue,
  adminGetDlqJobPayload,
  adminPauseQueue,
  adminRepairConsistency,
  adminResumeQueue,
  adminRetryAllDlqJobs,
  adminRetryDlqJob,
  type DeadLetterJobDetails,
  type DeadLetterJobMetadata,
} from '@/lib/api/admin/diagnostics.service';
import { QUERY_KEYS } from '@mad/shared';

interface UseDiagnosticsActionsOptions {
  queryClient: QueryClient;
  refetchDlq: () => void;
}

export function useDiagnosticsActions({
  queryClient,
  refetchDlq,
}: UseDiagnosticsActionsOptions) {
  // Inspections and dialogs state
  const [inspectingJobId, setInspectingJobId] = useState<string | null>(null);
  const [inspectedJob, setInspectedJob] = useState<DeadLetterJobDetails | null>(null);
  const [isInspectLoading, setIsInspectLoading] = useState(false);
  const [inspectError, setInspectError] = useState<string | null>(null);

  // Single job retry confirmation modal
  const [confirmRetryJob, setConfirmRetryJob] = useState<DeadLetterJobMetadata | null>(null);

  // Bulk retry safety dialog
  const [confirmRetryAll, setConfirmRetryAll] = useState(false);

  // Queue controls state
  const [drainTargetQueue, setDrainTargetQueue] = useState<string | null>(null);

  // Consistency repair mutation
  const repairMutation = useMutation({
    mutationFn: adminRepairConsistency,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.admin.diagnostics.consistency() });
      queryClient.invalidateQueries({ queryKey: ['admin', 'diagnostics', 'health'] });
    },
  });

  // Single job retry mutation
  const retryMutation = useMutation({
    mutationFn: adminRetryDlqJob,
    onSuccess: () => {
      setConfirmRetryJob(null);
      refetchDlq();
      queryClient.invalidateQueries({ queryKey: ['admin', 'diagnostics', 'health'] });
    },
  });

  // Retry all jobs mutation
  const retryAllMutation = useMutation({
    mutationFn: adminRetryAllDlqJobs,
    onSuccess: () => {
      setConfirmRetryAll(false);
      refetchDlq();
      queryClient.invalidateQueries({ queryKey: ['admin', 'diagnostics', 'health'] });
    },
  });

  // Queue mutations
  const pauseMutation = useMutation({
    mutationFn: adminPauseQueue,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'diagnostics', 'queue-controls'] });
    },
  });

  const resumeMutation = useMutation({
    mutationFn: adminResumeQueue,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'diagnostics', 'queue-controls'] });
    },
  });

  const drainMutation = useMutation({
    mutationFn: adminDrainQueue,
    onSuccess: () => {
      setDrainTargetQueue(null);
      queryClient.invalidateQueries({ queryKey: ['admin', 'diagnostics', 'queue-controls'] });
    },
  });

  // Lazy inspect handler
  const handleInspect = async (id: string) => {
    setInspectingJobId(id);
    setIsInspectLoading(true);
    setInspectError(null);
    setInspectedJob(null);
    try {
      const details = await adminGetDlqJobPayload(id);
      setInspectedJob(details);
    } catch (err: any) {
      setInspectError(err.response?.data?.message || err.message || 'Failed to retrieve payload');
    } finally {
      setIsInspectLoading(false);
    }
  };

  const handleCopyPayload = () => {
    if (inspectedJob) {
      navigator.clipboard.writeText(JSON.stringify(inspectedJob.data, null, 2));
    }
  };

  const handleCloseInspector = () => {
    setInspectingJobId(null);
    setInspectedJob(null);
  };

  const handleRetryInspectorJob = (job: DeadLetterJobMetadata) => {
    setConfirmRetryJob(job);
    setInspectingJobId(null);
    setInspectedJob(null);
  };

  return {
    inspectingJobId,
    inspectedJob,
    isInspectLoading,
    inspectError,
    confirmRetryJob,
    confirmRetryAll,
    drainTargetQueue,
    repairMutation,
    retryMutation,
    retryAllMutation,
    pauseMutation,
    resumeMutation,
    drainMutation,
    handleInspect,
    handleCopyPayload,
    handleCloseInspector,
    handleRetryInspectorJob,
    setConfirmRetryJob,
    setConfirmRetryAll,
    setDrainTargetQueue,
  };
}
