import { useProfile } from "./use-profile";

/**
 * Returns the user's preferred IANA timezone string.
 * Falls back to the browser's detected timezone when the user hasn't set one.
 */
export function useTimezone(): string {
  const { profile } = useProfile();
  return profile?.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone;
}
