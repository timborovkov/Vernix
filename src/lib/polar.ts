import { Polar } from "@polar-sh/sdk";
import { getEnv } from "@/lib/env";

let _polar: Polar | null = null;

export function getPolar(): Polar {
  if (!_polar) {
    const env = getEnv();
    if (!env.POLAR_ACCESS_TOKEN) {
      throw new Error("POLAR_ACCESS_TOKEN is required for billing features");
    }
    _polar = new Polar({
      accessToken: env.POLAR_ACCESS_TOKEN,
      server: env.POLAR_SERVER,
    });
  }
  return _polar;
}

/** Returns true when Polar billing is configured */
export function isPolarEnabled(): boolean {
  return !!process.env.POLAR_ACCESS_TOKEN;
}
