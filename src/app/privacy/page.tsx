import type { Metadata } from "next";

import { InfoPage, InfoSection, Placeholder } from "@/components/info-page";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How ATMH Essentials handles your personal information.",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <InfoPage label="Your information" title="Privacy Policy">
      <p>
        <Placeholder>
          full privacy policy, reviewed by a legal adviser for Nigerian data protection requirements
        </Placeholder>
      </p>
      <InfoSection title="On this device">
        <p>
          Your cart is saved in your own browser so it is still there when you come back. It is not
          sent to us until checkout is available.
        </p>
      </InfoSection>
      <InfoSection title="Contact">
        <p>
          <Placeholder>who to contact about personal data</Placeholder>
        </p>
      </InfoSection>
    </InfoPage>
  );
}
