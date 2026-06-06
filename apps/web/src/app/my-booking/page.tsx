import { redirect } from 'next/navigation';

interface Props {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function MyBookingPage({ searchParams }: Props) {
  const params = await searchParams;
  const ref = params.ref;

  if (typeof ref === 'string' && ref.trim()) {
    redirect(`/tickets?ref=${encodeURIComponent(ref.trim())}`);
  }

  redirect('/tickets');
}
