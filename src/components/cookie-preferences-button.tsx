"use client";

import { Button } from "@/components/ui/button";
import { OPEN_PREFERENCES_EVENT } from "@/components/cookie-consent-banner";

export function CookiePreferencesButton() {
  return (
    <Button
      variant="link"
      size="sm"
      className="text-muted-foreground hover:text-foreground h-auto p-0 text-sm"
      onClick={() => {
        window.dispatchEvent(new Event(OPEN_PREFERENCES_EVENT));
      }}
    >
      Cookie Preferences
    </Button>
  );
}
