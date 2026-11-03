import type { Metadata } from "next";

import { InfoPage, InfoSection, Placeholder } from "@/components/info-page";

export const metadata: Metadata = {
  title: "About Us",
  description: "ATMH Essentials brings home, beauty and everyday essentials together in one place.",
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
  return (
    <InfoPage label="Our story" title="About Us">
      <p>
        ATMH Essentials exists for one simple reason: the things your home runs on should be easy
        to find, fair to buy and quick to reorder. From detergent and dish liquid to skincare and
        baby care, everything you need is in one place.
      </p>
      <InfoSection title="Our story">
        <p>
          <Placeholder>owner&apos;s story, founding year and location</Placeholder>
        </p>
      </InfoSection>
      <InfoSection title="What we promise">
        <p>
          Quality products, affordable prices, fast and reliable delivery, and your satisfaction as
          our priority. That is how we want every order to feel.
        </p>
      </InfoSection>
    </InfoPage>
  );
}
