import type { Metadata } from "next";
import { getSsoConfig } from "@/lib/auth/sso-config";
import { SettingsForm } from "./settings-form";

export const metadata: Metadata = {
  title: "Settings",
};

export default function SettingsPage() {
  const sso = getSsoConfig();
  return <SettingsForm enableGoogle={sso.google} enableGithub={sso.github} />;
}
