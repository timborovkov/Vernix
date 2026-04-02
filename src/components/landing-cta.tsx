"use client";

import { trackCtaClicked } from "@/lib/analytics";

interface LandingCtaProps {
  location: string;
  children: React.ReactNode;
}

export function LandingCta({ location, children }: LandingCtaProps) {
  return (
    <div onClick={() => trackCtaClicked(location)} className="contents">
      {children}
    </div>
  );
}
