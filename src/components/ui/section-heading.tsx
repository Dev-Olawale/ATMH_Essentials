export function SectionHeading({ label, title }: { label: string; title: string }) {
  return (
    <div className="flex flex-col items-center gap-2 text-center">
      <p className="text-xs tracking-[0.25em] text-muted uppercase">{label}</p>
      <h2 className="text-3xl font-medium text-ink sm:text-4xl">{title}</h2>
      <span aria-hidden="true" className="mt-1 h-px w-16 bg-gold" />
    </div>
  );
}
