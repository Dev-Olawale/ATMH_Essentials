import { WhatsAppIcon } from "@/components/social-icons";
import { getPublicSettings } from "@/lib/settings";
import { whatsappHref } from "@/lib/whatsapp";

export async function WhatsAppButton() {
  const { whatsappNumber } = await getPublicSettings();
  return (
    // A labelled landmark, so screen-reader users can find it and every element sits in a region.
    <aside aria-label="WhatsApp chat">
      <a
        href={whatsappHref(whatsappNumber)}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Chat with us on WhatsApp"
        className="fixed right-4 bottom-[calc(1rem+env(safe-area-inset-bottom))] z-30 flex size-13 items-center justify-center rounded-full bg-ink text-white shadow-lg transition-colors hover:bg-ink/80 focus-visible:ring-3 focus-visible:ring-ring focus-visible:outline-none"
      >
        <WhatsAppIcon className="size-6" />
      </a>
    </aside>
  );
}
