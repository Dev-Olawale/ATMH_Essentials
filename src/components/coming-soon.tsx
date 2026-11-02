import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { Divider } from "@/components/ui/divider";

export function StatusPage({
  label,
  title,
  message,
  href,
  action,
}: {
  label: string;
  title: string;
  message: string;
  href: string;
  action: string;
}) {
  return (
    <div className="mx-auto flex max-w-xl flex-col items-center gap-5 px-4 py-20 text-center">
      <p className="text-xs tracking-[0.25em] text-muted uppercase">{label}</p>
      <h1 className="text-4xl font-medium text-ink sm:text-5xl">{title}</h1>
      <Divider />
      <p className="text-muted">{message}</p>
      <Link href={href} className={buttonVariants({ variant: "rose" })}>
        {action}
      </Link>
    </div>
  );
}
