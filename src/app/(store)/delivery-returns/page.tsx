import type { Metadata } from "next";

import { InfoPage, InfoSection, Placeholder } from "@/components/info-page";

export const metadata: Metadata = {
  title: "Delivery & Returns",
  description: "How ATMH Essentials delivers your order, and what to do if something is not right.",
  alternates: { canonical: "/delivery-returns" },
};

export default function DeliveryReturnsPage() {
  return (
    <InfoPage label="Good to know" title="Delivery & Returns">
      <InfoSection title="Delivery">
        <p>We want your essentials with you quickly, so you never run out of what you need.</p>
        <p>
          <Placeholder>delivery areas, fee per zone and delivery times</Placeholder>
        </p>
      </InfoSection>
      <InfoSection title="Returns">
        <p>
          If something arrives damaged or is not what you ordered, please get in touch and we will
          help put it right.
        </p>
        <p>
          <Placeholder>return window, eligible items, and refund or exchange process</Placeholder>
        </p>
      </InfoSection>
    </InfoPage>
  );
}
