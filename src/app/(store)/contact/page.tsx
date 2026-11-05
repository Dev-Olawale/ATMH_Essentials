import type { Metadata } from "next";

import { InfoPage, InfoSection, Placeholder } from "@/components/info-page";
import { getPublicSettings } from "@/lib/settings";
import { whatsappHref } from "@/lib/whatsapp";

export const metadata: Metadata = {
  title: "Contact Us",
  description: "Get in touch with ATMH Essentials about products, orders or delivery.",
  alternates: { canonical: "/contact" },
};

/** "2348116336407" → "+234 811 633 6407" */
function displayNumber(digits: string): string {
  const match = /^234(\d{3})(\d{3})(\d{4})$/.exec(digits);
  return match ? `+234 ${match[1]} ${match[2]} ${match[3]}` : `+${digits}`;
}

export default async function ContactPage() {
  const { whatsappNumber } = await getPublicSettings();
  return (
    <InfoPage label="We are here to help" title="Contact Us">
      <p>Questions about a product, an order or delivery? We would love to hear from you.</p>
      <InfoSection title="WhatsApp">
        <p>
          <a href={whatsappHref(whatsappNumber)} target="_blank" rel="noopener noreferrer" className="underline">
            Chat with us on WhatsApp: {displayNumber(whatsappNumber)}
          </a>
        </p>
      </InfoSection>
      <InfoSection title="Phone and email">
        <p>
          <Placeholder>phone number and email address</Placeholder>
        </p>
      </InfoSection>
      <InfoSection title="Find us">
        <p>
          <Placeholder>address and opening hours</Placeholder>
        </p>
      </InfoSection>
    </InfoPage>
  );
}
