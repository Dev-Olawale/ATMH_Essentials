import { Breadcrumbs } from "@/components/breadcrumbs";
import { SectionHeading } from "@/components/ui/section-heading";

export function InfoPage({
  title,
  label,
  children,
}: {
  title: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-6 lg:py-8">
      <Breadcrumbs items={[{ label: title }]} />
      <div className="my-8">
        <SectionHeading as="h1" label={label} title={title} />
      </div>
      <div className="flex flex-col gap-8 text-sm leading-relaxed text-ink sm:text-base">
        {children}
      </div>
    </div>
  );
}

export function InfoSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-2xl font-medium text-ink">{title}</h2>
      {children}
    </section>
  );
}

/** Marks copy the owner must supply before launch, so it is impossible to miss. */
export function Placeholder({ children }: { children: React.ReactNode }) {
  return (
    <mark className="rounded bg-blush-deep px-1 text-ink">[PLACEHOLDER: {children}]</mark>
  );
}
