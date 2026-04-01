interface EmailLayoutOptions {
  title: string;
  body: string;
  unsubscribeUrl?: string;
}

/**
 * Shared email layout wrapper. All email templates should use this
 * to ensure consistent branding (dark header, white card, system fonts).
 */
export function wrapEmailLayout({
  title,
  body,
  unsubscribeUrl,
}: EmailLayoutOptions): string {
  const unsubscribeFooter = unsubscribeUrl
    ? `<div style="padding:16px 32px 24px;text-align:center">
        <p style="font-size:11px;color:#aaa;margin:0">
          <a href="${unsubscribeUrl}" style="color:#aaa;text-decoration:underline">Unsubscribe</a> from these emails
        </p>
      </div>`
    : "";

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f7f7f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
  <div style="max-width:560px;margin:40px auto;background:#fff;border-radius:12px;overflow:hidden">
    <div style="background:#242424;padding:32px;text-align:center">
      <h1 style="color:#fff;font-size:24px;margin:0">${title}</h1>
    </div>
    <div style="padding:32px">
      ${body}
    </div>
    ${unsubscribeFooter}
    <div style="padding:0 32px 24px;text-align:center">
      <p style="font-size:12px;color:#999;margin:0">&copy; Vernix &middot; AI meeting intelligence</p>
    </div>
  </div>
</body>
</html>`;
}
