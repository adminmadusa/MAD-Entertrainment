import { LegalSidebar } from './components/LegalSidebar';

export default function LegalCenterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="container-mad pt-32 md:pt-40 pb-20">
      <div className="flex flex-col md:flex-row gap-8 lg:gap-16 relative">
        <LegalSidebar />
        <main className="flex-1 w-full max-w-full md:max-w-[calc(100%-280px-2rem)] lg:max-w-[calc(100%-280px-4rem)]">
          {children}
        </main>
      </div>
    </div>
  );
}
