"use client";

import { Minus, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";

export function QuantityStepper({
  value,
  max,
  min = 1,
  label,
  onChange,
}: {
  value: number;
  max: number;
  min?: number;
  label: string;
  onChange: (value: number) => void;
}) {
  return (
    <div
      role="group"
      aria-label={`Quantity for ${label}`}
      className="inline-flex items-center rounded-full border border-blush-deep bg-white"
    >
      <Button
        variant="ghost"
        size="icon"
        aria-label="Decrease quantity"
        disabled={value <= min}
        onClick={() => onChange(value - 1)}
      >
        <Minus />
      </Button>
      <span aria-live="polite" className="w-8 text-center text-sm font-medium text-ink">
        {value}
      </span>
      <Button
        variant="ghost"
        size="icon"
        aria-label="Increase quantity"
        disabled={value >= max}
        onClick={() => onChange(value + 1)}
      >
        <Plus />
      </Button>
    </div>
  );
}
