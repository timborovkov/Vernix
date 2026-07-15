import { getResend } from "./client";
import { filterSuppressedEmails } from "./suppression";

const FROM = "Vernix <hello@vernix.app>";

interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
  /** When provided, adds List-Unsubscribe header for email clients */
  unsubscribeUrl?: string;
  /** Stable key for safely retrying the same logical email with Resend */
  idempotencyKey?: string;
}

export type SendEmailResult =
  | { success: true; status: "sent" | "suppressed" | "skipped" }
  | { success: false; status: "failed" | "unknown"; error: string };

export async function sendEmail(
  options: SendEmailOptions
): Promise<SendEmailResult> {
  const resend = getResend();

  if (!resend) {
    console.log("[Email] Resend not configured, skipping:", options.subject);
    return { success: true, status: "skipped" };
  }

  const toList = Array.isArray(options.to) ? options.to : [options.to];

  // Fail-open on suppression-check errors: if the DB is unreachable we'd
  // rather send the email (risking a bounce) than drop it silently. Preserves
  // the never-throw contract of sendEmail.
  let allowed = toList;
  try {
    const result = await filterSuppressedEmails(toList);
    allowed = result.allowed;
    if (result.suppressed.length > 0) {
      console.log(
        `[Email] Skipping ${result.suppressed.length} suppressed recipient(s) (${options.subject})`
      );
    }
  } catch (err) {
    console.error(
      "[Email] Suppression check failed, sending to all recipients:",
      err
    );
  }

  if (allowed.length === 0) {
    return { success: true, status: "suppressed" };
  }

  try {
    const headers: Record<string, string> = {};
    if (options.unsubscribeUrl) {
      headers["List-Unsubscribe"] = `<${options.unsubscribeUrl}>`;
      headers["List-Unsubscribe-Post"] = "List-Unsubscribe=One-Click";
    }

    const payload = {
      from: FROM,
      to: allowed,
      subject: options.subject,
      html: options.html,
      text: options.text,
      replyTo: options.replyTo,
      ...(Object.keys(headers).length > 0 && { headers }),
    };
    const { error } = options.idempotencyKey
      ? await resend.emails.send(payload, {
          idempotencyKey: options.idempotencyKey,
        })
      : await resend.emails.send(payload);

    if (error) {
      console.error("[Email] Send failed:", error);
      return {
        success: false,
        status: "failed",
        error: error.message,
      };
    }

    return { success: true, status: "sent" };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[Email] Send error:", message);
    return {
      success: false,
      status: "unknown",
      error: message,
    };
  }
}
