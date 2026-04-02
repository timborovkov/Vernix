import type { Metadata } from "next";
import Link from "next/link";

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
        Last updated: April 2026
      </p>

      <div className="space-y-8">
        <section>
          <h2 className="mb-2 text-lg font-semibold">1. What Are Cookies?</h2>
          <p className="text-muted-foreground text-sm">
            Cookies are small text files stored on your device by your browser.
            They help websites maintain sessions, remember preferences, and
            understand usage patterns. We also use similar technologies such as
            local storage and browser telemetry for security, reliability, and
            error monitoring.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold">
            2. Cookies and Technologies We Use
          </h2>
          <p className="text-muted-foreground mb-3 text-sm">
            We use three categories of cookies and similar technologies:
          </p>

          <div className="overflow-x-auto">
            <table className="text-muted-foreground w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="pr-4 pb-2 font-semibold">Category</th>
                  <th className="pr-4 pb-2 font-semibold">Provider</th>
                  <th className="pr-4 pb-2 font-semibold">Purpose</th>
                  <th className="pr-4 pb-2 font-semibold">Legal Basis</th>
                  <th className="pb-2 font-semibold">Duration</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                <tr>
                  <td className="py-2 pr-4 font-medium">Essential</td>
                  <td className="py-2 pr-4">Vernix (NextAuth)</td>
                  <td className="py-2 pr-4">
                    Authentication, session management, CSRF protection
                  </td>
                  <td className="py-2 pr-4">
                    Strictly necessary (no consent required)
                  </td>
                  <td className="py-2">Session / 30 days</td>
                </tr>
                <tr>
                  <td className="py-2 pr-4 font-medium">
                    Essential monitoring
                  </td>
                  <td className="py-2 pr-4">
                    <a
                      href="https://sentry.io/privacy/"
                      className="text-foreground underline"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Sentry
                    </a>
                  </td>
                  <td className="py-2 pr-4">
                    Error tracking, performance monitoring, session replay for
                    incident diagnosis
                  </td>
                  <td className="py-2 pr-4">
                    Legitimate interest (Art. 6(1)(f))
                  </td>
                  <td className="py-2">Up to 90 days</td>
                </tr>
                <tr>
                  <td className="py-2 pr-4 font-medium">Analytics</td>
                  <td className="py-2 pr-4">
                    <a
                      href="https://policies.google.com/privacy"
                      className="text-foreground underline"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Google Analytics
                    </a>
                  </td>
                  <td className="py-2 pr-4">
                    Pseudonymised usage measurement, page views, feature
                    interactions
                  </td>
                  <td className="py-2 pr-4">Consent (Art. 6(1)(a))</td>
                  <td className="py-2">Up to 14 months</td>
                </tr>
                <tr>
                  <td className="py-2 pr-4 font-medium">Analytics</td>
                  <td className="py-2 pr-4">
                    <a
                      href="https://contentsquare.com/privacy-center/"
                      className="text-foreground underline"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Contentsquare
                    </a>
                  </td>
                  <td className="py-2 pr-4">
                    Heatmaps, session replays, click tracking, and UX analytics
                  </td>
                  <td className="py-2 pr-4">Consent (Art. 6(1)(a))</td>
                  <td className="py-2">Up to 13 months</td>
                </tr>
              </tbody>
            </table>
          </div>

          <p className="text-muted-foreground mt-3 text-sm">
            Our sub-processors (Recall.ai, OpenAI, Railway) do not set cookies
            on your device through the Vernix Service. Their processing of
            personal data is described in our{" "}
            <Link href="/privacy" className="text-foreground underline">
              Privacy Policy
            </Link>
            .
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold">
            3. Google Analytics and Consent Mode v2
          </h2>
          <p className="text-muted-foreground text-sm">
            Vernix uses Google Analytics 4 with Consent Mode v2. By default, all
            analytics storage is denied. Analytics cookies are only set after
            you explicitly accept them in our consent banner. When consent is
            denied, Google Analytics operates in cookieless ping mode and does
            not store identifiers on your device. IP anonymisation is enabled
            regardless of consent state. Data is transferred to Google servers
            in the United States and/or the EU under Google&apos;s Data
            Processing Terms and Standard Contractual Clauses.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold">
            4. Sentry Monitoring Technologies
          </h2>
          <p className="text-muted-foreground text-sm">
            Sentry uses local storage and browser APIs to capture errors,
            performance data, and session replays. This data is used solely for
            maintaining service reliability and diagnosing incidents — it is
            never used for advertising, profiling, or cross-site tracking.
            Sentry processes data in the United States under a Data Processing
            Agreement with Standard Contractual Clauses. Data is retained for up
            to 90 days.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold">5. Contentsquare</h2>
          <p className="text-muted-foreground text-sm">
            Contentsquare provides heatmaps, session replays, and UX analytics
            to help us understand how visitors interact with pages. The
            Contentsquare tag is only loaded after you explicitly accept
            analytics cookies in our consent banner — it does not load or
            collect any data before consent. Data may be transferred to
            Contentsquare servers in the EU and the United States under Standard
            Contractual Clauses. Data is retained for up to 13 months. You can
            learn more about Contentsquare&apos;s data practices in their{" "}
            <a
              href="https://contentsquare.com/privacy-center/"
              className="text-foreground underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              Privacy Center
            </a>
            .
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold">
            6. Managing Your Preferences
          </h2>
          <p className="text-muted-foreground text-sm">
            You can update your cookie choices at any time by selecting{" "}
            <strong>Cookie Preferences</strong> in the website footer. You can
            also clear cookies and local storage in your browser settings to
            reset your consent state. Blocking essential cookies may prevent the
            Service from functioning correctly.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold">
            7. International Transfers
          </h2>
          <p className="text-muted-foreground text-sm">
            Cookie and telemetry data may be transferred to the United States by
            Google, Contentsquare, and Sentry. These transfers are governed by
            Standard Contractual Clauses and, where applicable, adequacy
            decisions. For further details, see Section 7 of our{" "}
            <Link href="/privacy" className="text-foreground underline">
              Privacy Policy
            </Link>
            .
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold">8. Contact</h2>
          <p className="text-muted-foreground text-sm">
            If you have questions about this Cookie Policy, contact Nyxone OÜ
            (registry code 16172329), Harju maakond, Tallinn, Kesklinna
            linnaosa, Narva mnt 5, 10117, Estonia, at{" "}
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
