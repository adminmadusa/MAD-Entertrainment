import { Metadata } from 'next';

import { ContactForm } from '@/components/support/ContactForm';

export const metadata: Metadata = {
  title: 'Contact Support | MAD Entertainment',
  description: 'Reach out to our support team for help with tickets, payments, and events.',
  alternates: {
    canonical: 'https://madentertainment.in/contact',
  },
};

export default function ContactPage() {
  return (
    <div className="container-mad pt-32 pb-20 min-h-screen">
      <div className="max-w-3xl mx-auto">
        <header className="text-center mb-12">
          <h1 className="text-white font-bold text-4xl sm:text-5xl tracking-tight mb-4">Contact Support</h1>
          <p className="text-text-secondary text-lg">
            Having an issue? Fill out the form below and our team will get back to you as soon as possible.
          </p>
        </header>

        <div className="glass-strong border border-border-subtle rounded-3xl p-6 sm:p-10 shadow-xl relative overflow-hidden">
          {/* Subtle Background Glow */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-accent-purple/5 blur-[100px] pointer-events-none" />

          <ContactForm />
        </div>

        <div className="mt-12 text-center">
          <p className="text-text-muted text-sm">
            Looking for quick answers? Check our <a href="/support" className="text-accent-purple hover:underline">Help Center</a>.
          </p>
        </div>
      </div>
    </div>
  );
}
