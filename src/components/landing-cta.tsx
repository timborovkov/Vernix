"use client";

import { trackCtaClicked } from "@/lib/analytics";

interface LandingCtaProps {
  location: string;
  children: React.ReactNode;
}

export function LandingCta({ location, children }: LandingCtaProps) {
  return (
    <span onClick={() => trackCtaClicked(location)} role="presentation">
      {children}
    </span>
  );
}
