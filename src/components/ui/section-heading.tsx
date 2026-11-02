export function SectionHeading({
  label,
  title,
  as: Heading = "h2",
}: {
  label: string;
  title: string;
  as?: "h1" | "h2";
}) {
  return (
    <div className="flex flex-col items-center gap-2 text-center">
      <p className="text-xs tracking-[0.25em] text-muted uppercase">{label}</p>
      <Heading className="text-3xl font-medium text-ink sm:text-4xl">{title}</Heading>
      <span aria-hidden="true" className="mt-1 h-px w-16 bg-gold" />
    </div>
  );
}
