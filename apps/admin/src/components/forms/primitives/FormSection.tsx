export function FormSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="glass rounded-2xl border border-border-subtle p-4 sm:p-6 space-y-4 sm:space-y-5">
      <h2 className="text-white font-semibold">{title}</h2>
      {children}
    </div>
  );
}
