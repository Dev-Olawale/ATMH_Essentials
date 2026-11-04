import type { Metadata } from "next";

import { InfoPage, InfoSection, Placeholder } from "@/components/info-page";
import { whatsappHref } from "@/config/site";

export const metadata: Metadata = {
  title: "Contact Us",
  description: "Get in touch with ATMH Essentials about products, orders or delivery.",
  alternates: { canonical: "/contact" },
};

export default function ContactPage() {
  return (
    <InfoPage label="We are here to help" title="Contact Us">
      <p>Questions about a product, an order or delivery? We would love to hear from you.</p>
      <InfoSection title="WhatsApp">
        <p>
          <a href={whatsappHref} target="_blank" rel="noopener noreferrer" className="underline">
            Chat with us on WhatsApp
          </a>{" "}
          <Placeholder>real WhatsApp number; this link uses a dummy one</Placeholder>
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
