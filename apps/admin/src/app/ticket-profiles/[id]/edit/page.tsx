'use client';

import { useParams } from 'next/navigation';

import { TicketProfileFormContainer } from '@/components/ticket-profiles/TicketProfileFormContainer';

export default function EditTicketProfilePage() {
  const params = useParams();
  const id = params.id as string;

  return <TicketProfileFormContainer mode="edit" profileId={id} />;
}
