import "server-only";

import nodemailer, { type Transporter } from "nodemailer";

import type { Email } from "@/lib/email/templates";

/**
 * Sends email through any SMTP service (the same one Supabase Auth uses, e.g. Resend).
 * Env: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, EMAIL_FROM.
 * When they are missing, emails are skipped (logged by template name only) so orders still work.
 * Logs never include addresses, order contents or bank details.
 */
let transporter: Transporter | null = null;

export function mailerConfigured(): boolean {
  const { SMTP_HOST, SMTP_USER, SMTP_PASSWORD, EMAIL_FROM } = process.env;
  return Boolean(SMTP_HOST && SMTP_USER && SMTP_PASSWORD && EMAIL_FROM);
}

function transport(): Transporter {
  if (!transporter) {
    const port = Number(process.env.SMTP_PORT || 465);
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure: port === 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD },
    });
  }
  return transporter;
}

export type SendResult = "sent" | "skipped" | "failed";

export async function sendEmail(template: string, to: string[], email: Email): Promise<SendResult> {
  const recipients = [...new Set(to.map((address) => address.trim()).filter(Boolean))];
  if (recipients.length === 0) return "skipped";
  if (!mailerConfigured()) {
    console.info(`[email] SMTP not configured; skipped "${template}"`);
    return "skipped";
  }
  try {
    await transport().sendMail({
      from: process.env.EMAIL_FROM,
      to: recipients,
      subject: email.subject,
      html: email.html,
      text: email.text,
    });
    return "sent";
  } catch (error) {
    const code = (error as { code?: string; responseCode?: number }).code ?? (error as { responseCode?: number }).responseCode;
    console.error(`[email] "${template}" failed`, code ?? "unknown error");
    return "failed";
  }
}
