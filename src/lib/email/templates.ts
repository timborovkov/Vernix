import {
  DISPLAY,
  LIMITS,
  PLANS,
  MONTHLY_CREDIT,
  PRICING,
} from "@/lib/billing/constants";

function getAppUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL ?? "https://vernix.app";
}

function logoUrl(): string {
  return `${getAppUrl()}/brand/combo/horizontal-on-dark.png`;
}

/** Shared email shell: DOCTYPE + dark header with logo + white body + footer */
function emailShell(
  title: string,
  body: string,
  unsubscribeUrl?: string
): string {
  const APP_URL = getAppUrl();
  const unsubFooter = unsubscribeUrl
    ? `<p style="font-size:11px;color:#aaa;margin:16px 0 0;text-align:center"><a href="${escapeHtml(unsubscribeUrl)}" style="color:#aaa;text-decoration:underline">Unsubscribe</a> from these emails</p>`
    : "";
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f7f7f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
  <div style="max-width:560px;margin:40px auto;background:#fff;border-radius:12px;overflow:hidden">
    <div style="background:#242424;padding:32px;text-align:center">
      <a href="${APP_URL}" style="display:inline-block;margin:0 0 16px">
        <img src="${logoUrl()}" alt="Vernix" height="28" style="display:block;margin:0 auto" />
      </a>
      <h1 style="color:#fff;font-size:24px;margin:0">${title}</h1>
    </div>
    <div style="padding:32px">
      ${body}
    </div>
    <div style="padding:0 32px 24px;text-align:center">
      ${unsubFooter}
      <p style="font-size:12px;color:#999;margin:${unsubscribeUrl ? "8" : "0"}px 0 0">&copy; Vernix &middot; <a href="${APP_URL}/contact" style="color:#999;text-decoration:none">Contact</a></p>
    </div>
  </div>
</body>
</html>`;
}

export function getWelcomeEmailHtml(name: string): string {
  const APP_URL = getAppUrl();
  return emailShell(
    "Welcome to Vernix",
    `
      <p style="font-size:16px;color:#333;margin:0 0 16px">Hi ${escapeHtml(name)},</p>
      <p style="font-size:14px;color:#555;line-height:1.6;margin:0 0 16px">
        Thanks for signing up. Vernix joins your video calls, transcribes
        everything, and gives you searchable, actionable call intelligence.
      </p>
      <div style="background:#f0f0ff;border-radius:8px;padding:16px;margin:0 0 24px">
        <p style="font-size:13px;font-weight:600;color:#333;margin:0 0 8px">Start a free Pro trial to unlock:</p>
        <ul style="font-size:13px;color:#555;line-height:1.8;padding-left:18px;margin:0">
          <li>Connect tools like Slack, Linear, or your CRM for live data in calls</li>
          <li>Voice agent that answers questions and takes action during calls</li>
          <li>Search across all your calls and uploaded documents</li>
          <li>AI chat across all your calls</li>
        </ul>
        <p style="font-size:12px;color:#888;margin:8px 0 0">${DISPLAY.trialDays} days free, then &euro;${PRICING[PLANS.PRO].monthly}/mo. Cancel anytime.</p>
      </div>
      <p style="font-size:14px;font-weight:600;color:#333;margin:0 0 12px">Get started in 3 steps:</p>
      <ol style="font-size:14px;color:#555;line-height:1.8;padding-left:20px;margin:0 0 24px">
        <li>Paste a Zoom, Meet, Teams, or Webex link</li>
        <li>Vernix joins your call and transcribes everything</li>
        <li>Get a summary, action items, and searchable transcript</li>
      </ol>
      <div style="text-align:center;margin:32px 0">
        <a href="${APP_URL}/dashboard" style="display:inline-block;background:#242424;color:#fff;padding:12px 32px;border-radius:8px;text-decoration:none;font-size:14px;font-weight:600">
          Start Your First Call
        </a>
      </div>
      <p style="font-size:12px;color:#999;line-height:1.6;margin:0;text-align:center">
        Free plan includes ${LIMITS[PLANS.FREE].meetingsPerMonth} silent calls per month.
        Start a Pro trial to connect your tools and unlock the voice agent.
      </p>
  `
  );
}

export function getFreePlanUpgradeReminderHtml(
  name: string,
  unsubscribeUrl?: string
): string {
  const appUrl = getAppUrl();
  return emailShell(
    "Want Vernix to do more in your calls?",
    `
      <p style="font-size:16px;color:#333;margin:0 0 16px">Hi ${escapeHtml(name)},</p>
      <p style="font-size:14px;color:#555;line-height:1.6;margin:0 0 16px">
        Upgrade to Pro to connect your tools and let Vernix answer live business questions during calls.
      </p>
      <div style="background:#f0f0ff;border-radius:8px;padding:16px;margin:0 0 24px">
        <p style="font-size:13px;font-weight:600;color:#333;margin:0 0 8px">With Pro, you unlock:</p>
        <ul style="font-size:13px;color:#555;line-height:1.8;padding-left:18px;margin:0">
          <li>Integrations with tools like Slack, Linear, and GitHub</li>
          <li>Voice agent responses inside live calls</li>
          <li>Higher usage limits for docs and AI queries</li>
          <li>&euro;${MONTHLY_CREDIT[PLANS.PRO]} monthly call credit included</li>
        </ul>
      </div>
      <div style="text-align:center;margin:32px 0">
        <a href="${appUrl}/pricing" style="display:inline-block;background:#242424;color:#fff;padding:12px 32px;border-radius:8px;text-decoration:none;font-size:14px;font-weight:600">
          Upgrade to Pro
        </a>
      </div>
      <p style="font-size:12px;color:#999;line-height:1.6;margin:0;text-align:center">
        You're receiving this because your account is on the Free plan.
      </p>
  `,
    unsubscribeUrl
  );
}

export function getLastChanceRetentionHtml(
  name: string,
  accessEndsAt?: Date | null,
  unsubscribeUrl?: string
): string {
  const appUrl = getAppUrl();
  const accessEndsLine = accessEndsAt
    ? `You still keep your current benefits until ${escapeHtml(accessEndsAt.toLocaleDateString())}.`
    : "You still keep your current benefits until your current period ends.";

  return emailShell(
    "Last chance to keep your Pro benefits",
    `
      <p style="font-size:16px;color:#333;margin:0 0 16px">Hi ${escapeHtml(name)},</p>
      <p style="font-size:14px;color:#555;line-height:1.6;margin:0 0 16px">
        We noticed you canceled your subscription. ${accessEndsLine}
      </p>
      <div style="background:#f9f9f9;border-radius:8px;padding:16px;margin:0 0 24px">
        <p style="font-size:13px;font-weight:600;color:#333;margin:0 0 8px">If you stay on Pro, you keep:</p>
        <ul style="font-size:13px;color:#555;line-height:1.8;padding-left:18px;margin:0">
          <li>Tool integrations for live data in calls</li>
          <li>Voice agent responses during calls</li>
          <li>Higher limits for knowledge and AI usage</li>
        </ul>
      </div>
      <div style="text-align:center;margin:32px 0">
        <a href="${appUrl}/dashboard/settings?billing=manage" style="display:inline-block;background:#242424;color:#fff;padding:12px 32px;border-radius:8px;text-decoration:none;font-size:14px;font-weight:600">
          Keep Pro Benefits
        </a>
      </div>
      <p style="font-size:12px;color:#999;line-height:1.6;margin:0;text-align:center">
        If this was intentional, no action is needed.
      </p>
  `,
    unsubscribeUrl
  );
}

interface ContactNotificationData {
  topic: string;
  email: string;
  name?: string;
  company?: string;
  message: string;
}

export function getContactNotificationHtml(
  data: ContactNotificationData
): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
  <div style="max-width:560px;margin:20px auto;padding:24px">
    <h2 style="font-size:18px;color:#333;margin:0 0 16px">[${escapeHtml(data.topic)}] Contact Form Submission</h2>
    <table style="font-size:14px;color:#555;line-height:1.6;border-collapse:collapse;width:100%">
      <tr><td style="padding:4px 12px 4px 0;font-weight:600;vertical-align:top">From:</td><td>${escapeHtml(data.name || "—")} &lt;${escapeHtml(data.email)}&gt;</td></tr>
      ${data.company ? `<tr><td style="padding:4px 12px 4px 0;font-weight:600;vertical-align:top">Company:</td><td>${escapeHtml(data.company)}</td></tr>` : ""}
      <tr><td style="padding:4px 12px 4px 0;font-weight:600;vertical-align:top">Topic:</td><td>${escapeHtml(data.topic)}</td></tr>
    </table>
    <hr style="border:none;border-top:1px solid #eee;margin:16px 0">
    <p style="font-size:14px;color:#333;line-height:1.6;white-space:pre-wrap">${escapeHtml(data.message)}</p>
  </div>
</body>
</html>`;
}

export function getPasswordResetEmailHtml(
  name: string,
  resetUrl: string
): string {
  return emailShell(
    "Reset Your Password",
    `
      <p style="font-size:16px;color:#333;margin:0 0 16px">Hi ${escapeHtml(name)},</p>
      <p style="font-size:14px;color:#555;line-height:1.6;margin:0 0 24px">
        We received a request to reset your password. Click the button below to choose a new one.
      </p>
      <div style="text-align:center;margin:32px 0">
        <a href="${escapeHtml(resetUrl)}" style="display:inline-block;background:#242424;color:#fff;padding:12px 32px;border-radius:8px;text-decoration:none;font-size:14px;font-weight:600">
          Reset Password
        </a>
      </div>
      <p style="font-size:12px;color:#999;line-height:1.6;margin:0 0 8px">
        This link expires in 60 minutes. After that, you'll need to request a new one.
      </p>
      <p style="font-size:12px;color:#999;line-height:1.6;margin:0">
        If you didn't request this, you can safely ignore this email. Your password won't change.
      </p>
  `
  );
}

export function getEmailVerificationHtml(
  name: string,
  verifyUrl: string
): string {
  return emailShell(
    "Verify Your Email",
    `
      <p style="font-size:16px;color:#333;margin:0 0 16px">Hi ${escapeHtml(name)},</p>
      <p style="font-size:14px;color:#555;line-height:1.6;margin:0 0 24px">
        Please verify your email address to complete your Vernix account setup.
      </p>
      <div style="text-align:center;margin:32px 0">
        <a href="${escapeHtml(verifyUrl)}" style="display:inline-block;background:#242424;color:#fff;padding:12px 32px;border-radius:8px;text-decoration:none;font-size:14px;font-weight:600">
          Verify Email
        </a>
      </div>
      <p style="font-size:12px;color:#999;line-height:1.6;margin:0 0 8px">
        This link expires in 24 hours.
      </p>
      <p style="font-size:12px;color:#999;line-height:1.6;margin:0">
        If you didn't create an account on Vernix, you can safely ignore this email.
      </p>
  `
  );
}

export function getFirstMeetingEmailHtml(
  name: string,
  meetingTitle: string,
  summaryUrl: string,
  unsubscribeUrl?: string
): string {
  return emailShell(
    "Your First Meeting Summary Is Ready",
    `
      <p style="font-size:16px;color:#333;margin:0 0 16px">Hi ${escapeHtml(name)},</p>
      <p style="font-size:14px;color:#555;line-height:1.6;margin:0 0 16px">
        Your meeting <strong>${escapeHtml(meetingTitle)}</strong> has been processed. You now have a full transcript, summary, and extracted action items ready to review.
      </p>
      <div style="background:#f0f0ff;border-radius:8px;padding:16px;margin:0 0 24px">
        <p style="font-size:13px;font-weight:600;color:#333;margin:0 0 8px">Start a free Pro trial to unlock:</p>
        <ul style="font-size:13px;color:#555;line-height:1.8;padding-left:18px;margin:0">
          <li>Voice agent that answers questions during calls</li>
          <li>Connect tools like Slack, Linear, and GitHub</li>
          <li>Search across all your calls and documents</li>
        </ul>
        <p style="font-size:12px;color:#888;margin:8px 0 0">${DISPLAY.trialDays} days free, then &euro;${PRICING[PLANS.PRO].monthly}/mo.</p>
      </div>
      <div style="text-align:center;margin:32px 0">
        <a href="${escapeHtml(summaryUrl)}" style="display:inline-block;background:#242424;color:#fff;padding:12px 32px;border-radius:8px;text-decoration:none;font-size:14px;font-weight:600">
          View Summary
        </a>
      </div>
  `,
    unsubscribeUrl
  );
}

export function getTrialStartedEmailHtml(
  name: string,
  trialEndsAt: Date,
  unsubscribeUrl?: string
): string {
  const APP_URL = getAppUrl();
  const endDate = trialEndsAt.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  return emailShell(
    "Your Pro Trial Has Started",
    `
      <p style="font-size:16px;color:#333;margin:0 0 16px">Hi ${escapeHtml(name)},</p>
      <p style="font-size:14px;color:#555;line-height:1.6;margin:0 0 16px">
        You now have full access to Vernix Pro until <strong>${endDate}</strong>. Here's what you've unlocked:
      </p>
      <div style="background:#f0f0ff;border-radius:8px;padding:16px;margin:0 0 24px">
        <ul style="font-size:13px;color:#555;line-height:1.8;padding-left:18px;margin:0">
          <li>Voice agent responds to questions during your calls</li>
          <li>Connect tools like Slack, Linear, GitHub, and CRMs</li>
          <li>Higher limits for documents, AI queries, and storage</li>
          <li>REST API and MCP server access</li>
        </ul>
      </div>
      <p style="font-size:14px;font-weight:600;color:#333;margin:0 0 12px">Get the most out of your trial:</p>
      <ol style="font-size:14px;color:#555;line-height:1.8;padding-left:20px;margin:0 0 24px">
        <li><a href="${APP_URL}/dashboard/integrations" style="color:#333">Connect your tools</a> for live data in calls</li>
        <li>Upload documents to the <a href="${APP_URL}/dashboard/knowledge" style="color:#333">knowledge base</a></li>
        <li>Start a call and try the voice agent</li>
      </ol>
      <div style="text-align:center;margin:32px 0">
        <a href="${APP_URL}/dashboard" style="display:inline-block;background:#242424;color:#fff;padding:12px 32px;border-radius:8px;text-decoration:none;font-size:14px;font-weight:600">
          Go to Dashboard
        </a>
      </div>
  `,
    unsubscribeUrl
  );
}

export function getTrialExpiredEmailHtml(
  name: string,
  unsubscribeUrl?: string
): string {
  const APP_URL = getAppUrl();
  return emailShell(
    "Your Pro Trial Has Ended",
    `
      <p style="font-size:16px;color:#333;margin:0 0 16px">Hi ${escapeHtml(name)},</p>
      <p style="font-size:14px;color:#555;line-height:1.6;margin:0 0 16px">
        Your Vernix Pro trial has ended and your account has been moved to the Free plan. Your data is still safe — nothing has been deleted.
      </p>
      <div style="background:#f9f9f9;border-radius:8px;padding:16px;margin:0 0 24px">
        <p style="font-size:13px;font-weight:600;color:#333;margin:0 0 8px">What you no longer have access to:</p>
        <ul style="font-size:13px;color:#555;line-height:1.8;padding-left:18px;margin:0">
          <li>Tool integrations (Slack, Linear, GitHub)</li>
          <li>Voice agent during calls</li>
          <li>Higher usage limits and API/MCP access</li>
        </ul>
      </div>
      <p style="font-size:14px;color:#555;line-height:1.6;margin:0 0 24px">
        Upgrade to Pro to restore access to everything. Plans start at &euro;${PRICING[PLANS.PRO].monthly}/mo.
      </p>
      <div style="text-align:center;margin:32px 0">
        <a href="${APP_URL}/pricing" style="display:inline-block;background:#242424;color:#fff;padding:12px 32px;border-radius:8px;text-decoration:none;font-size:14px;font-weight:600">
          Upgrade to Pro
        </a>
      </div>
  `,
    unsubscribeUrl
  );
}

export function getMidTrialCheckinHtml(
  name: string,
  daysLeft: number,
  unsubscribeUrl?: string
): string {
  const APP_URL = getAppUrl();
  return emailShell(
    "How&#39;s Your Trial Going?",
    `
      <p style="font-size:16px;color:#333;margin:0 0 16px">Hi ${escapeHtml(name)},</p>
      <p style="font-size:14px;color:#555;line-height:1.6;margin:0 0 16px">
        You're one week into your Pro trial with ${daysLeft} days left. Have you had a chance to set everything up?
      </p>
      <div style="background:#f0f0ff;border-radius:8px;padding:16px;margin:0 0 24px">
        <p style="font-size:13px;font-weight:600;color:#333;margin:0 0 8px">Quick setup checklist:</p>
        <ul style="font-size:13px;color:#555;line-height:1.8;padding-left:18px;margin:0">
          <li><a href="${APP_URL}/dashboard/integrations" style="color:#333">Connect your tools</a> — Slack, Linear, GitHub, CRMs</li>
          <li><a href="${APP_URL}/dashboard/knowledge" style="color:#333">Upload documents</a> — product docs, FAQs, playbooks</li>
          <li>Start a call and try the voice agent</li>
        </ul>
      </div>
      <div style="text-align:center;margin:32px 0">
        <a href="${APP_URL}/dashboard" style="display:inline-block;background:#242424;color:#fff;padding:12px 32px;border-radius:8px;text-decoration:none;font-size:14px;font-weight:600">
          Go to Dashboard
        </a>
      </div>
  `,
    unsubscribeUrl
  );
}

export function getTrialWarningHtml(
  name: string,
  daysLeft: number,
  unsubscribeUrl?: string
): string {
  const APP_URL = getAppUrl();
  const dayText = daysLeft === 1 ? "1 day" : `${daysLeft} days`;
  return emailShell(
    `Your Trial Ends in ${dayText}`,
    `
      <p style="font-size:16px;color:#333;margin:0 0 16px">Hi ${escapeHtml(name)},</p>
      <p style="font-size:14px;color:#555;line-height:1.6;margin:0 0 16px">
        Your Vernix Pro trial ends in ${dayText}. Upgrade now to keep access to all Pro features without interruption.
      </p>
      <div style="background:#f0f0ff;border-radius:8px;padding:16px;margin:0 0 24px">
        <p style="font-size:13px;font-weight:600;color:#333;margin:0 0 8px">With Pro, you keep:</p>
        <ul style="font-size:13px;color:#555;line-height:1.8;padding-left:18px;margin:0">
          <li>Tool integrations for live data in calls</li>
          <li>Voice agent responses during calls</li>
          <li>Higher limits and API/MCP access</li>
          <li>&euro;${MONTHLY_CREDIT[PLANS.PRO]} monthly call credit</li>
        </ul>
      </div>
      <div style="text-align:center;margin:32px 0">
        <a href="${APP_URL}/pricing" style="display:inline-block;background:#242424;color:#fff;padding:12px 32px;border-radius:8px;text-decoration:none;font-size:14px;font-weight:600">
          Upgrade to Pro
        </a>
      </div>
  `,
    unsubscribeUrl
  );
}

export function getWinBackEmailHtml(
  name: string,
  unsubscribeUrl?: string
): string {
  const APP_URL = getAppUrl();
  return emailShell(
    "We&#39;d Love to Have You Back",
    `
      <p style="font-size:16px;color:#333;margin:0 0 16px">Hi ${escapeHtml(name)},</p>
      <p style="font-size:14px;color:#555;line-height:1.6;margin:0 0 16px">
        It's been a while since you used Vernix Pro. Your meetings, transcripts, and documents are still here, waiting for you.
      </p>
      <div style="background:#f0f0ff;border-radius:8px;padding:16px;margin:0 0 24px">
        <p style="font-size:13px;font-weight:600;color:#333;margin:0 0 8px">Re-subscribe to unlock:</p>
        <ul style="font-size:13px;color:#555;line-height:1.8;padding-left:18px;margin:0">
          <li>Voice agent that answers questions during your calls</li>
          <li>Tool integrations for live context in meetings</li>
          <li>Full API and MCP access</li>
        </ul>
      </div>
      <div style="text-align:center;margin:32px 0">
        <a href="${APP_URL}/pricing" style="display:inline-block;background:#242424;color:#fff;padding:12px 32px;border-radius:8px;text-decoration:none;font-size:14px;font-weight:600">
          Re-subscribe to Pro
        </a>
      </div>
  `,
    unsubscribeUrl
  );
}

export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
