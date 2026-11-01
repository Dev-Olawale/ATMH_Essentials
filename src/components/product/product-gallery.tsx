"use client";

import Image from "next/image";
import { useState } from "react";

import { CategoryIcon, type CategoryIconName } from "@/components/category-icon";

export function ProductGallery({
  images,
  name,
  icon,
}: {
  images: string[];
  name: string;
  icon: CategoryIconName;
}) {
  const [selected, setSelected] = useState(0);
  const current = images[selected];

  return (
    <div className="flex flex-col gap-3">
      <div className="relative aspect-square overflow-hidden rounded-2xl bg-blush-deep">
        {current ? (
          <Image
            src={current}
            alt={name}
            fill
            preload
            sizes="(min-width: 1024px) 50vw, 100vw"
            className="object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-rose-dark">
            <CategoryIcon name={icon} className="size-24" strokeWidth={0.75} />
          </div>
        )}
      </div>
      {images.length > 1 && (
        <ul className="flex gap-2 overflow-x-auto pb-1">
          {images.map((image, index) => (
            <li key={image} className="shrink-0">
              <button
                type="button"
                aria-label={`Show image ${index + 1} of ${images.length}`}
                aria-current={index === selected}
                onClick={() => setSelected(index)}
                className={`relative block size-16 overflow-hidden rounded-lg border-2 ${
                  index === selected ? "border-ink" : "border-transparent"
                }`}
              >
                <Image src={image} alt="" fill sizes="4rem" className="object-cover" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
