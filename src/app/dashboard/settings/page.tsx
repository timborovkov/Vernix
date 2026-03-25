import { getSsoConfig } from "@/lib/auth/sso-config";
import { SettingsForm } from "./settings-form";

export default function SettingsPage() {
  const sso = getSsoConfig();
  return <SettingsForm enableGoogle={sso.google} enableGithub={sso.github} />;
}
