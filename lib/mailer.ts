import 'server-only';
import nodemailer from 'nodemailer';

/**
 * Sends email from the PULP Gmail account. Needs two Vercel environment variables:
 * GMAIL_USER (pulpfashionreviews@gmail.com) and GMAIL_APP_PASSWORD (a Google app password).
 * Swap the transport for Resend once PULP has its own domain.
 */
export function mailerReady() {
  return !!(process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD);
}

export async function sendMail(to: string, subject: string, html: string, text: string) {
  const user = process.env.GMAIL_USER!;
  const transport = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: { user, pass: process.env.GMAIL_APP_PASSWORD!.replace(/\s+/g, '') },
  });
  await transport.sendMail({ from: `PULP <${user}>`, to, subject, html, text });
}

export const escapeHtml = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
