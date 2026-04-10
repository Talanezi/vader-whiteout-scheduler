export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function emailShell({
  preheader,
  bodyHtml,
  ctaUrl,
  ctaText,
  firstName,
}: {
  preheader: string;
  bodyHtml: string;
  ctaUrl: string;
  ctaText: string;
  firstName: string;
}) {
  const safePreheader = escapeHtml(preheader);
  const safeUrl = escapeHtml(ctaUrl);
  const safeText = escapeHtml(ctaText);
  const safeFirstName = escapeHtml(firstName);

  return `<!doctype html>
<html>
  <body style="margin:0;padding:0;background-color:#262525;">
    <div style="display:none;font-size:1px;color:#262525;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">
      ${safePreheader}
    </div>

    <table role="presentation" border="0" width="100%" cellspacing="0" cellpadding="0" style="background-color:#262525;">
      <tbody>
        <tr>
          <td align="center" style="padding:24px 12px;">
            <table role="presentation" border="0" width="600" cellspacing="0" cellpadding="0" style="width:100%;max-width:600px;">
              <tbody>
                <tr>
                  <td style="background-color:#ffffff;border-top-left-radius:14px;border-top-right-radius:14px;overflow:hidden;">
                    <img
                      src="https://243d2d69-ba8b-44b7-a68c-c1693e4beb9b.b-cdn.net/e/8c979f97-d7c2-4d4c-9803-9856d1964496/65b78a1f-96d1-414b-b910-74b027484673.png"
                      alt="Vader: Whiteout"
                      width="600"
                      style="display:block;width:100%;height:auto;border:0;margin:0;padding:0;"
                    />
                  </td>
                </tr>

                <tr>
                  <td style="background-color:#ffffff;padding:32px 24px 28px;border-bottom-left-radius:14px;border-bottom-right-radius:14px;">
                    <p style="margin:0 0 18px;font-family:Roboto,Arial,Helvetica,sans-serif;font-size:20px;line-height:1.3;color:#222222;">
                      Hi ${safeFirstName},
                    </p>

                    ${bodyHtml}

                    <table role="presentation" border="0" cellspacing="0" cellpadding="0" style="margin:20px 0 12px;">
                      <tbody>
                        <tr>
                          <td align="left">
                            <a
                              href="${safeUrl}"
                              style="background-color:#333333;color:#ffffff;display:inline-block;font-family:Roboto,Arial,Helvetica,sans-serif;font-size:16px;font-weight:bold;line-height:44px;text-align:center;text-decoration:none;border-radius:6px;padding:0 18px;"
                            >
                              ${safeText}
                            </a>
                          </td>
                        </tr>
                      </tbody>
                    </table>

                    <p style="margin:16px 0 0;font-family:Roboto,Arial,Helvetica,sans-serif;font-size:16px;line-height:1.6;color:#333333;">
                      Best,<br />
                      <strong>Vader Whiteout Team</strong>
                    </p>
                  </td>
                </tr>

                <tr>
                  <td style="height:12px;line-height:12px;font-size:12px;">&nbsp;</td>
                </tr>
              </tbody>
            </table>
          </td>
        </tr>
      </tbody>
    </table>
  </body>
</html>`;
}
