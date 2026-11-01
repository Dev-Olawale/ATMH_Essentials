import { Heart } from "lucide-react";

export function Divider() {
  return (
    <div aria-hidden="true" className="flex items-center justify-center gap-3 text-rose">
      <span className="h-px w-16 bg-current" />
      <Heart className="size-3 fill-current" />
      <span className="h-px w-16 bg-current" />
    </div>
  );
}
