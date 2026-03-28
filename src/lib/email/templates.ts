function getAppUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL ?? "https://vernix.app";
}

export function getWelcomeEmailHtml(name: string): string {
  const APP_URL = getAppUrl();
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f7f7f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
  <div style="max-width:560px;margin:40px auto;background:#fff;border-radius:12px;overflow:hidden">
    <div style="background:#242424;padding:32px;text-align:center">
      <h1 style="color:#fff;font-size:24px;margin:0">Welcome to Vernix</h1>
    </div>
    <div style="padding:32px">
      <p style="font-size:16px;color:#333;margin:0 0 16px">Hi ${escapeHtml(name)},</p>
      <p style="font-size:14px;color:#555;line-height:1.6;margin:0 0 16px">
        Thanks for signing up. Vernix joins your video calls, transcribes
        everything, and gives you searchable, actionable meeting intelligence.
      </p>
      <div style="background:#f0f0ff;border-radius:8px;padding:16px;margin:0 0 24px">
        <p style="font-size:13px;font-weight:600;color:#333;margin:0 0 8px">Start a free Pro trial to unlock:</p>
        <ul style="font-size:13px;color:#555;line-height:1.8;padding-left:18px;margin:0">
          <li>Connect tools like Slack, Linear, or your CRM for live data in meetings</li>
          <li>Voice agent that answers questions and takes action during calls</li>
          <li>Search across all your meetings and uploaded documents</li>
          <li>200 AI queries per day</li>
        </ul>
        <p style="font-size:12px;color:#888;margin:8px 0 0">14 days free, then &euro;29/mo. Cancel anytime.</p>
      </div>
      <p style="font-size:14px;font-weight:600;color:#333;margin:0 0 12px">Get started in 3 steps:</p>
      <ol style="font-size:14px;color:#555;line-height:1.8;padding-left:20px;margin:0 0 24px">
        <li>Paste a Zoom, Meet, Teams, or Webex link</li>
        <li>Vernix joins your call and transcribes everything</li>
        <li>Get a summary, action items, and searchable transcript</li>
      </ol>
      <div style="text-align:center;margin:32px 0">
        <a href="${APP_URL}/dashboard" style="display:inline-block;background:#242424;color:#fff;padding:12px 32px;border-radius:8px;text-decoration:none;font-size:14px;font-weight:600">
          Start Your First Meeting
        </a>
      </div>
      <p style="font-size:12px;color:#999;line-height:1.6;margin:0;text-align:center">
        Free plan includes 5 silent meetings per month.
        Start a Pro trial to connect your tools and unlock the voice agent.
      </p>
      <p style="font-size:12px;color:#999;margin:8px 0 0;text-align:center">
        Questions? Reply to this email or visit <a href="${APP_URL}/contact" style="color:#666">vernix.app/contact</a>
      </p>
    </div>
  </div>
</body>
</html>`;
}

export function getFreePlanUpgradeReminderHtml(name: string): string {
  const appUrl = getAppUrl();
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f7f7f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
  <div style="max-width:560px;margin:40px auto;background:#fff;border-radius:12px;overflow:hidden">
    <div style="background:#242424;padding:32px;text-align:center">
      <h1 style="color:#fff;font-size:24px;margin:0">Want Vernix to do more in your calls?</h1>
    </div>
    <div style="padding:32px">
      <p style="font-size:16px;color:#333;margin:0 0 16px">Hi ${escapeHtml(name)},</p>
      <p style="font-size:14px;color:#555;line-height:1.6;margin:0 0 16px">
        Upgrade to Pro to connect your tools and let Vernix answer live business questions during meetings.
      </p>
      <div style="background:#f0f0ff;border-radius:8px;padding:16px;margin:0 0 24px">
        <p style="font-size:13px;font-weight:600;color:#333;margin:0 0 8px">With Pro, you unlock:</p>
        <ul style="font-size:13px;color:#555;line-height:1.8;padding-left:18px;margin:0">
          <li>Integrations with tools like Slack, Linear, and GitHub</li>
          <li>Voice agent responses inside live calls</li>
          <li>Higher usage limits for docs and AI queries</li>
          <li>&euro;30 monthly meeting credit included</li>
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
    </div>
  </div>
</body>
</html>`;
}

export function getLastChanceRetentionHtml(
  name: string,
  accessEndsAt?: Date | null
): string {
  const appUrl = getAppUrl();
  const accessEndsLine = accessEndsAt
    ? `You still keep your current benefits until ${escapeHtml(accessEndsAt.toLocaleDateString())}.`
    : "You still keep your current benefits until your current period ends.";

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f7f7f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
  <div style="max-width:560px;margin:40px auto;background:#fff;border-radius:12px;overflow:hidden">
    <div style="background:#242424;padding:32px;text-align:center">
      <h1 style="color:#fff;font-size:24px;margin:0">Last chance to keep your Pro benefits</h1>
    </div>
    <div style="padding:32px">
      <p style="font-size:16px;color:#333;margin:0 0 16px">Hi ${escapeHtml(name)},</p>
      <p style="font-size:14px;color:#555;line-height:1.6;margin:0 0 16px">
        We noticed you canceled your subscription. ${accessEndsLine}
      </p>
      <div style="background:#f9f9f9;border-radius:8px;padding:16px;margin:0 0 24px">
        <p style="font-size:13px;font-weight:600;color:#333;margin:0 0 8px">If you stay on Pro, you keep:</p>
        <ul style="font-size:13px;color:#555;line-height:1.8;padding-left:18px;margin:0">
          <li>Tool integrations for live data in calls</li>
          <li>Voice agent responses during meetings</li>
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
    </div>
  </div>
</body>
</html>`;
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
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f7f7f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
  <div style="max-width:560px;margin:40px auto;background:#fff;border-radius:12px;overflow:hidden">
    <div style="background:#242424;padding:32px;text-align:center">
      <h1 style="color:#fff;font-size:24px;margin:0">Reset Your Password</h1>
    </div>
    <div style="padding:32px">
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
    </div>
  </div>
</body>
</html>`;
}

export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
