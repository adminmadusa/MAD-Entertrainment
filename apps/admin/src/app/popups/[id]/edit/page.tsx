'use client';

import { useParams } from 'next/navigation';

import { PopupFormContainer } from '@/components/popups/PopupFormContainer';

export default function EditPopupPage() {
  const params = useParams();
  const id = params.id as string;

  return <PopupFormContainer mode="edit" popupId={id} />;
}
