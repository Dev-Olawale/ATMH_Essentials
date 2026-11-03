"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { setProductActive } from "@/app/admin/actions/products";
import { Button } from "@/components/ui/button";

export function ArchiveButton({ productId, active }: { productId: string; active: boolean }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();
  const toggle = () =>
    startTransition(async () => {
      await setProductActive(productId, !active);
      setConfirming(false);
      router.refresh();
    });

  if (!active) {
    return (
      <Button type="button" variant="outline" disabled={pending} onClick={toggle}>
        Restore to store
      </Button>
    );
  }
  return confirming ? (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-sm text-ink">Hide from shoppers?</span>
      <Button type="button" disabled={pending} onClick={toggle}>
        Yes, archive
      </Button>
      <Button type="button" variant="ghost" onClick={() => setConfirming(false)}>
        Cancel
      </Button>
    </div>
  ) : (
    <Button type="button" variant="outline" onClick={() => setConfirming(true)}>
      Archive
    </Button>
  );
}
