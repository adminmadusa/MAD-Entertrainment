'use client';

import { useQuery, useMutation } from '@tanstack/react-query';
import { useRouter, useParams } from 'next/navigation';
import { useState } from 'react';

import { DJOperatorForm } from '@/components/dj-operators/DJOperatorForm';
import { formatApiError } from '@/components/dj-operators/utils';
import { adminGetDJ, adminUpdateDJ } from '@/lib/api/admin/dj.service';
import type { DJOperator } from '@mad/types';

export default function EditDJPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const [error, setError] = useState<string | null>(null);

  // Fetch current DJ
  const { data: dj, isLoading } = useQuery({
    queryKey: ['admin-dj', id],
    queryFn: () => adminGetDJ(id),
    enabled: !!id,
  });

  const updateMutation = useMutation({
    mutationFn: (payload: Partial<DJOperator>) => adminUpdateDJ(id, payload),
    onSuccess: () => router.push('/dj-operators'),
    onError: (err) => {
      setError(formatApiError(err));
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="text-white/40 text-sm animate-pulse">Loading DJ parameters...</div>
      </div>
    );
  }

  return (
    <DJOperatorForm
      title="Edit DJ Operator"
      subtitle="Modify DJ particulars"
      initialData={dj}
      onSubmit={updateMutation.mutate}
      isPending={updateMutation.isPending}
      error={error}
      submitLabel="Save Changes"
      pendingLabel="Saving Changes..."
      isEdit={true}
    />
  );
}
