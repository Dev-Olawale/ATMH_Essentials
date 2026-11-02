import { WhatsAppIcon } from "@/components/social-icons";
import { whatsappHref } from "@/config/site";

export function WhatsAppButton() {
  return (
    <a
      href={whatsappHref}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat with us on WhatsApp"
      className="fixed right-4 bottom-[calc(1rem+env(safe-area-inset-bottom))] z-30 flex size-13 items-center justify-center rounded-full bg-ink text-white shadow-lg transition-colors hover:bg-rose-dark focus-visible:ring-3 focus-visible:ring-ring focus-visible:outline-none"
    >
      <WhatsAppIcon className="size-6" />
    </a>
  );
}
