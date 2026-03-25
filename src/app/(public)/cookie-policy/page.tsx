import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Cookie Policy - Vernix",
  description:
    "Vernix Cookie Policy - which cookies and similar technologies we use, why we use them, and how you can manage your consent preferences.",
};

export default function CookiePolicyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-24">
      <h1 className="mb-2 text-3xl font-bold">Cookie Policy</h1>
      <p className="text-muted-foreground mb-12 text-sm">
        Last updated: March 2026
      </p>

      <div className="space-y-8">
        <section>
          <h2 className="mb-2 text-lg font-semibold">1. What are cookies?</h2>
          <p className="text-muted-foreground text-sm">
            Cookies are small text files stored on your device. They help
            websites remember preferences, maintain sessions, and understand how
            users interact with pages. We also use similar browser storage and
            telemetry technologies for security and reliability monitoring.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold">
            2. Cookies we use at Vernix
          </h2>
          <p className="text-muted-foreground text-sm">
            We use three categories of cookies and similar technologies:
          </p>
          <ul className="text-muted-foreground mt-3 list-disc space-y-2 pl-5 text-sm">
            <li>
              <strong>Essential cookies</strong>: required for sign-in,
              security, and core product functionality. These are always active.
            </li>
            <li>
              <strong>Essential monitoring technologies</strong>: used by Sentry
              to detect errors, monitor performance, and keep the service
              reliable. These are not used for advertising personalization.
            </li>
            <li>
              <strong>Analytics cookies</strong>: optional cookies used by
              Google Analytics to measure product usage and help us improve
              Vernix.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold">
            3. Google Analytics and Consent Mode v2
          </h2>
          <p className="text-muted-foreground text-sm">
            Vernix uses Google Analytics with Consent Mode v2. By default,
            analytics consent is denied. Analytics storage is only granted after
            you explicitly accept analytics cookies in our consent banner.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold">
            4. Managing your preferences
          </h2>
          <p className="text-muted-foreground text-sm">
            You can update your choice at any time by selecting{" "}
            <strong>Cookie Preferences</strong> in the website footer. You can
            also clear browser cookies and local storage to reset your consent
            state.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold">5. Contact</h2>
          <p className="text-muted-foreground text-sm">
            If you have questions about this Cookie Policy, contact us at{" "}
            <a
              href="mailto:hello@vernix.app"
              className="text-foreground underline"
            >
              hello@vernix.app
            </a>
            .
          </p>
        </section>
      </div>
    </div>
  );
}
