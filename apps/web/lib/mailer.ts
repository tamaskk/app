// Outgoing email. In development this just logs to the console so the dev
// flow works without an SMTP/Resend/SendGrid account. For production, wire
// up a real provider here — see TODO at the bottom of `sendMail`.

export interface OutgoingMail {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

export async function sendMail(mail: OutgoingMail): Promise<void> {
  const provider = process.env.MAIL_PROVIDER ?? "console";

  if (provider === "console") {
    // Console fallback — used in dev and when no provider is configured.
    // The reset link will be visible in the Next.js dev server output.
    console.log(
      [
        "",
        "─── outgoing mail (console provider) ───",
        `to:      ${mail.to}`,
        `subject: ${mail.subject}`,
        "",
        mail.text,
        "───────────────────────────────────────",
        "",
      ].join("\n"),
    );
    return;
  }

  // TODO: add a real provider when shipping forgot-password to production.
  //
  // Example with Resend (https://resend.com):
  //   import { Resend } from "resend";
  //   const resend = new Resend(process.env.RESEND_API_KEY!);
  //   await resend.emails.send({
  //     from: "HEFTOR <noreply@eronlet.app>",
  //     to: mail.to,
  //     subject: mail.subject,
  //     text: mail.text,
  //     html: mail.html ?? mail.text,
  //   });
  //
  // Don't forget: set MAIL_PROVIDER=resend and RESEND_API_KEY in .env.local,
  // and configure the sending domain with DKIM/SPF records.
  throw new Error(
    `Unknown MAIL_PROVIDER "${provider}" — wire it up in lib/mailer.ts`,
  );
}
