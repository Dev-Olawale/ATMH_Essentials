import type { Metadata } from "next";

import { InfoPage, Placeholder } from "@/components/info-page";

export const metadata: Metadata = {
  title: "Terms & Conditions",
  description: "The terms that apply when you shop with ATMH Essentials.",
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
  return (
    <InfoPage label="The fine print" title="Terms & Conditions">
      <p>
        <Placeholder>
          full terms covering orders, pricing, payment, delivery, returns and liability, reviewed by
          a legal adviser
        </Placeholder>
      </p>
    </InfoPage>
  );
}
