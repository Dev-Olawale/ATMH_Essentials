import type { Metadata } from "next";

import { InfoPage, InfoSection, Placeholder } from "@/components/info-page";

export const metadata: Metadata = {
  title: "FAQ",
  description: "Answers to common questions about shopping with ATMH Essentials.",
  alternates: { canonical: "/faq" },
};

export default function FaqPage() {
  return (
    <InfoPage label="Quick answers" title="Frequently Asked Questions">
      <InfoSection title="Can I order on WhatsApp?">
        <p>
          Yes. Every product page has an “Order on WhatsApp” button that starts the message for you
          with the product, option and quantity already filled in.
        </p>
      </InfoSection>
      <InfoSection title="Where do you deliver, and how much does it cost?">
        <p>
          <Placeholder>delivery areas and fees</Placeholder>
        </p>
      </InfoSection>
      <InfoSection title="How can I pay?">
        <p>
          <Placeholder>payment methods enabled at launch</Placeholder>
        </p>
      </InfoSection>
      <InfoSection title="Can I return an item?">
        <p>
          <Placeholder>returns summary</Placeholder>
        </p>
      </InfoSection>
    </InfoPage>
  );
}
