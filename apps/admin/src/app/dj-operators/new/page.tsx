'use client';

import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { DJOperatorForm } from '@/components/dj-operators/DJOperatorForm';
import { formatApiError } from '@/components/dj-operators/types';
import { adminCreateDJ } from '@/lib/api/admin/dj.service';

export default function CreateDJPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  const createMutation = useMutation({
    mutationFn: adminCreateDJ,
    onSuccess: () => router.push('/dj-operators'),
    onError: (err) => {
      setError(formatApiError(err));
    },
  });

  return (
    <DJOperatorForm
      title="Add DJ Operator"
      subtitle="Register a new DJ or resident artist"
      onSubmit={createMutation.mutate}
      isPending={createMutation.isPending}
      error={error}
      submitLabel="Create DJ Operator"
      pendingLabel="Creating..."
    />
  );
}
