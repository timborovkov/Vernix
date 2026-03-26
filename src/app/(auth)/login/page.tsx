import { Suspense } from "react";
import { getSsoConfig } from "../sso-config";
import { LoginForm } from "./login-form";

export default function LoginPage() {
  const sso = getSsoConfig();
  return (
    <Suspense>
      <LoginForm enableGoogle={sso.google} enableGithub={sso.github} />
    </Suspense>
  );
}
