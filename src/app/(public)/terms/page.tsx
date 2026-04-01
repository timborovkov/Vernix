import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of Service — Vernix",
  description:
    "Vernix Terms of Service — acceptable use, intellectual property, liability, and termination.",
};

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-24">
      <h1 className="mb-2 text-3xl font-bold">Terms of Service</h1>
      <p className="text-muted-foreground mb-12 text-sm">
        Last updated: April 2026
      </p>

      <div className="space-y-8">
        <section>
          <h2 className="mb-2 text-lg font-semibold">1. Acceptance of Terms</h2>
          <p className="text-muted-foreground text-sm">
            Vernix (&quot;the Service&quot;) is operated by Nyxone OÜ (registry
            code 16172329, VAT ID EE16172329), registered at Harju maakond,
            Tallinn, Kesklinna linnaosa, Narva mnt 5, 10117, Estonia. By
            accessing or using the Service, you agree to be bound by these Terms
            of Service and our{" "}
            <Link href="/privacy" className="text-foreground underline">
              Privacy Policy
            </Link>
            . If you do not agree, do not use the Service.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold">
            2. Description of Service
          </h2>
          <p className="text-muted-foreground text-sm">
            Vernix is an AI-powered meeting assistant that joins video calls
            (Zoom, Google Meet, Microsoft Teams, Webex), transcribes
            conversations, generates summaries, and provides AI-powered question
            answering. The Service relies on third-party sub-processors
            including Recall.ai for call capture, OpenAI for AI capabilities,
            and Railway for hosting. The availability and functionality of the
            Service is dependent on the continued operation of these third-party
            services.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold">3. User Accounts</h2>
          <p className="text-muted-foreground text-sm">
            You are responsible for maintaining the confidentiality of your
            account credentials and for all activities that occur under your
            account. You must provide accurate and complete information when
            creating an account. You agree to notify us immediately at{" "}
            <a
              href="mailto:hello@vernix.app"
              className="text-foreground underline"
            >
              hello@vernix.app
            </a>{" "}
            upon becoming aware of any unauthorised use of your account.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold">
            4. Recording Consent and Acceptable Use
          </h2>
          <p className="text-muted-foreground mb-3 text-sm">
            The Service records video of meetings by default and stores
            recordings for up to 90 days, after which they are automatically
            deleted. You may disable recording storage on a per-meeting basis
            before the meeting starts. Even when recording storage is disabled,
            the Service still processes audio for real-time transcription and
            summary generation.
          </p>
          <p className="text-muted-foreground mb-3 text-sm">
            You are solely responsible for complying with all applicable laws
            regarding the recording and transcription of conversations,
            including but not limited to obtaining informed consent from all
            meeting participants before using the Service. Many jurisdictions
            require all-party consent for recording. Failure to obtain required
            consent may result in civil or criminal liability for which Vernix
            bears no responsibility.
          </p>
          <p className="text-muted-foreground mb-3 text-sm">
            You agree not to use the Service:
          </p>
          <ul className="text-muted-foreground list-disc space-y-1 pl-5 text-sm">
            <li>
              For any unlawful purpose or in violation of any applicable law.
            </li>
            <li>
              To record or transcribe conversations without the consent required
              by applicable law.
            </li>
            <li>
              To transmit harmful, threatening, abusive, or otherwise
              objectionable content.
            </li>
            <li>
              To attempt to gain unauthorised access to, interfere with, or
              disrupt the Service or its infrastructure.
            </li>
            <li>
              To deploy automated tools (bots, scrapers) on non-API portions of
              the Service.
            </li>
            <li>
              To reverse-engineer, decompile, or otherwise attempt to derive the
              source code of the Service.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold">
            5. Fair Use and Service Limits
          </h2>
          <p className="text-muted-foreground mb-3 text-sm">
            Each plan is subject to published usage limits, including meeting
            minutes, knowledge base storage, API request quotas, and concurrent
            meeting caps. The free plan includes a fixed monthly allowance of
            silent meeting minutes. Paid plans include a monthly usage credit
            that covers meeting time at published per-hour rates. Usage beyond
            the included credit is billed as overage at the same per-hour rates.
            Credits do not roll over between billing cycles.
          </p>
          <p className="text-muted-foreground mb-3 text-sm">
            You may set an optional monthly spending cap to limit overage
            charges. If a spending cap is reached, the current meeting will be
            allowed to finish, but new meetings cannot be started until the next
            billing cycle or the cap is raised.
          </p>
          <p className="text-muted-foreground mb-3 text-sm">
            All plans are subject to anti-abuse limits on the number of meetings
            per month. These limits are set well above normal usage and exist to
            prevent automated misuse. You may not use the Service in a manner
            that places disproportionate load on our infrastructure or that of
            our sub-processors — for example, running an excessive number of
            concurrent meeting bots, recording calls continuously around the
            clock, or programmatically creating meetings at a volume
            inconsistent with normal human use.
          </p>
          <p className="text-muted-foreground text-sm">
            We reserve the right to define, publish, and update specific usage
            thresholds at any time. If your usage materially exceeds fair-use
            limits, we will attempt to notify you and work towards a resolution
            before taking action. However, we may throttle, suspend, or
            terminate access to the Service at our discretion if excessive usage
            threatens service quality for other users or results in
            unsustainable costs.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold">
            6. API Access and MCP Server
          </h2>
          <p className="text-muted-foreground mb-3 text-sm">
            The Service provides a public REST API and MCP (Model Context
            Protocol) server for programmatic access to your meeting data,
            transcripts, tasks, knowledge base, and agent control. API access
            requires a Pro plan and authentication via API keys generated in
            your account settings.
          </p>
          <p className="text-muted-foreground mb-3 text-sm">
            API keys are secrets. You are responsible for keeping them
            confidential and secure. Do not share API keys in public
            repositories, client-side code, or with unauthorized parties. You
            are liable for all actions performed using your API keys. If you
            believe a key has been compromised, revoke it immediately in your
            account settings.
          </p>
          <p className="text-muted-foreground mb-3 text-sm">
            API usage is subject to per-key rate limits and daily request quotas
            as published in our{" "}
            <Link href="/docs" className="text-foreground underline">
              API documentation
            </Link>
            . We may throttle or block requests that exceed these limits.
            Automated access must respect rate limit headers returned in API
            responses.
          </p>
          <p className="text-muted-foreground text-sm">
            The MCP server allows AI assistants (such as Claude Desktop, Cursor,
            and similar tools) to access your Vernix data on your behalf. By
            connecting an AI assistant to the Vernix MCP server, you authorize
            that assistant to read and modify your meeting data, tasks, and
            knowledge base within the limits of your plan. You are responsible
            for the actions performed by any AI assistant connected to your
            account.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold">
            7. AI-Generated Content Disclaimer
          </h2>
          <p className="text-muted-foreground text-sm">
            The Service uses artificial intelligence to produce transcripts,
            summaries, action items, and voice-agent responses. AI-generated
            outputs may be inaccurate, incomplete, or misleading. You
            acknowledge that such outputs are provided for informational
            purposes only and do not constitute professional, legal, medical, or
            financial advice. You are responsible for reviewing and verifying
            all AI-generated content before relying on it.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold">
            8. Third-Party Platforms, Sub-Processors, and Integrations
          </h2>
          <p className="text-muted-foreground text-sm">
            The Service integrates with third-party video conferencing platforms
            (Zoom, Google Meet, Microsoft Teams, Webex) and relies on
            sub-processors as described in our{" "}
            <Link href="/privacy" className="text-foreground underline">
              Privacy Policy
            </Link>
            . We do not control and are not responsible for the availability,
            accuracy, or policies of these third-party services. Your use of
            third-party platforms is governed by their respective terms of
            service. We disclaim all liability arising from the operation,
            downtime, or policy changes of any third-party platform or
            sub-processor.
          </p>
          <p className="text-muted-foreground mt-3 text-sm">
            The Service may also connect to user-enabled third-party
            integrations (including MCP servers) via OAuth credentials, API
            keys, or other authentication methods you provide or approve. By
            connecting an integration, you instruct us to access and process
            data from that service, and to send data to that service when
            requested by you or your configured workflows.
          </p>
          <ul className="text-muted-foreground mt-3 list-disc space-y-1 pl-5 text-sm">
            <li>
              You are responsible for selecting integrations, reviewing and
              approving requested permission scopes, and ensuring you are
              authorised to grant access for the relevant third-party account or
              workspace.
            </li>
            <li>
              You remain responsible for actions performed through connected
              integrations, including reading, creating, updating, or deleting
              third-party data via the Service.
            </li>
            <li>
              Integration availability and behavior may change at any time due
              to third-party outages, API changes, policy updates, token expiry,
              revocation, or rate limits. We do not guarantee uninterrupted
              access to any integration and disclaim liability for such
              third-party changes.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold">
            9. Intellectual Property
          </h2>
          <p className="text-muted-foreground text-sm">
            You retain all ownership rights in your content, including meeting
            recordings, transcripts, uploaded documents, and any data you
            provide to the Service. You grant Vernix a limited, non-exclusive
            licence to process your content solely for the purpose of providing
            and improving the Service. Vernix retains all rights in the Service
            itself, including its software, design, branding, and proprietary
            algorithms.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold">
            10. Fees, Pricing, and Plan Changes
          </h2>
          <p className="text-muted-foreground mb-3 text-sm">
            The Service offers a free plan with limited usage and a paid Pro
            plan. The Pro plan includes a base monthly subscription fee and a
            usage credit. Meeting time consumed beyond the included credit is
            billed as overage at published per-hour rates. All fees — including
            base subscription and overage charges — are stated on our pricing
            page and are non-refundable except where required by applicable law.
          </p>
          <p className="text-muted-foreground mb-3 text-sm">
            Subscription payments are processed by our billing provider
            (Polar.sh), which acts as merchant of record. Overage charges are
            invoiced at the end of each billing cycle based on actual usage.
          </p>
          <p className="text-muted-foreground mb-3 text-sm">
            We reserve the right to change pricing, usage rates, included credit
            amounts, or the features included in any plan at any time. For
            existing subscribers, price changes will take effect at the start of
            the next billing cycle following at least 30 days&apos; prior notice
            via email or in-app notification. If you do not agree to a price
            change, you may cancel your subscription before the new pricing
            takes effect.
          </p>
          <p className="text-muted-foreground mb-3 text-sm">
            New users receive a free trial of the Pro plan with a limited
            allowance of meeting minutes. The trial activates on signup and
            expires after the stated duration or when the trial minutes are
            exhausted, whichever comes first. After the trial, the account
            reverts to the free plan unless the user subscribes to Pro.
          </p>
          <p className="text-muted-foreground text-sm">
            Free plans, trials, and promotional offers are provided at our
            discretion and may be modified or discontinued at any time without
            prior notice.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold">
            11. Data Processing and Privacy
          </h2>
          <p className="text-muted-foreground mb-3 text-sm">
            Your data is processed in accordance with our{" "}
            <Link href="/privacy" className="text-foreground underline">
              Privacy Policy
            </Link>
            , which describes the personal data we collect, the legal bases for
            processing, sub-processor arrangements, international data
            transfers, retention periods, and your rights. By using the Service,
            you acknowledge that your data — including meeting audio and
            transcripts — will be transmitted to and processed by our
            sub-processors (Recall.ai, OpenAI, Railway, Sentry) in the United
            States.
          </p>
          <p className="text-muted-foreground text-sm">
            Meeting recordings are automatically deleted after 90 days. You may
            also delete individual meeting recordings at any time by deleting
            the meeting. When a meeting is deleted, all associated data —
            including recordings, transcripts, and summaries — is removed from
            our systems and third-party sub-processors.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold">
            12. Limitation of Liability
          </h2>
          <p className="text-muted-foreground text-sm">
            To the maximum extent permitted by applicable law, the Service is
            provided &quot;as is&quot; and &quot;as available&quot; without
            warranties of any kind, whether express, implied, or statutory,
            including but not limited to implied warranties of merchantability,
            fitness for a particular purpose, and non-infringement. Vernix shall
            not be liable for any indirect, incidental, special, consequential,
            or punitive damages, including but not limited to loss of profits,
            data, or business opportunities, arising from your use of the
            Service. In any event, our total aggregate liability shall not
            exceed the amounts you have paid to Vernix in the twelve (12) months
            preceding the claim.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold">13. Indemnification</h2>
          <p className="text-muted-foreground text-sm">
            You agree to indemnify, defend, and hold harmless Vernix, its
            officers, directors, employees, and agents from and against any
            claims, liabilities, damages, losses, and expenses (including
            reasonable legal fees) arising out of or in connection with: (a)
            your use of the Service; (b) your violation of these Terms; (c) your
            violation of any applicable law, including recording consent laws;
            or (d) your infringement of any third-party rights.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold">
            14. Suspension and Termination
          </h2>
          <p className="text-muted-foreground mb-3 text-sm">
            We may, at our sole discretion and without liability, suspend or
            terminate your account and access to the Service, with or without
            notice, for any of the following reasons:
          </p>
          <ul className="text-muted-foreground list-disc space-y-1 pl-5 text-sm">
            <li>
              Breach of these Terms, including the Acceptable Use or Fair Use
              policies.
            </li>
            <li>
              Exceeding fair-use limits after a reasonable opportunity to
              remedy.
            </li>
            <li>Non-payment of applicable fees.</li>
            <li>
              Conduct that we reasonably believe is harmful to other users, our
              infrastructure, or our sub-processors.
            </li>
            <li>
              A request or order from a law-enforcement or regulatory authority.
            </li>
            <li>
              Extended periods of inactivity (90 days or more for free
              accounts). Data for inactive accounts may be archived after 90
              days and deleted after 180 days, with prior email notice.
            </li>
          </ul>
          <p className="text-muted-foreground mt-3 text-sm">
            You may cancel your subscription or delete your account at any time
            through the Service. If you cancel a paid subscription, your account
            reverts to the free plan. Existing data above free-plan limits
            becomes read-only for 30 days, after which it may be archived. Upon
            account deletion — whether by you or by us — your data will be
            removed in accordance with the retention schedule described in our{" "}
            <Link href="/privacy" className="text-foreground underline">
              Privacy Policy
            </Link>
            . Sections 7, 9, 12, 13, and 15 survive termination.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold">
            15. Governing Law and Disputes
          </h2>
          <p className="text-muted-foreground text-sm">
            These Terms shall be governed by and construed in accordance with
            the laws of the Republic of Estonia, without regard to
            conflict-of-law principles. Any dispute arising from these Terms or
            the Service shall be subject to the exclusive jurisdiction of the
            courts of the Republic of Estonia. If you are a consumer habitually
            resident in the European Union, you additionally retain the
            protection of mandatory provisions of the consumer-protection laws
            of your member state of residence.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold">16. Changes to Terms</h2>
          <p className="text-muted-foreground text-sm">
            We may update these Terms from time to time. Material changes will
            be communicated by posting the updated Terms on the Service and
            updating the &quot;Last updated&quot; date above. Continued use of
            the Service after such changes constitutes acceptance of the revised
            Terms.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold">17. Contact</h2>
          <p className="text-muted-foreground text-sm">
            For questions about these Terms, contact us at{" "}
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
