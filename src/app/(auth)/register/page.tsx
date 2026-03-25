import { getSsoConfig } from "../sso-config";
import { RegisterForm } from "./register-form";

export default function RegisterPage() {
  const sso = getSsoConfig();
  return <RegisterForm enableGoogle={sso.google} enableGithub={sso.github} />;
}
