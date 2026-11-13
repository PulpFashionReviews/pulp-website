import 'server-only';
import nodemailer from 'nodemailer';
import { CONTACT_EMAIL } from '@/lib/site';

/**
 * Sends PULP's own emails (e.g. "your review is live").
 * Uses Resend from noreply@pulpreviews.com when RESEND_API_KEY is set in Vercel;
 * otherwise falls back to the PULP Gmail account (GMAIL_USER + GMAIL_APP_PASSWORD).
 * Replies go to the PULP inbox either way.
 */
const FROM_DOMAIN = 'PULP <noreply@pulpreviews.com>';

export function mailerReady() {
  return !!(process.env.RESEND_API_KEY || (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD));
}

export async function sendMail(to: string, subject: string, html: string, text: string) {
  const resendKey = process.env.RESEND_API_KEY;
  if (resendKey) {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: FROM_DOMAIN, to: [to], reply_to: CONTACT_EMAIL, subject, html, text }),
    });
    if (!res.ok) throw new Error(`Resend ${res.status}: ${(await res.text()).slice(0, 200)}`);
    return;
  }
  const user = process.env.GMAIL_USER!;
  const transport = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: { user, pass: process.env.GMAIL_APP_PASSWORD!.replace(/\s+/g, '') },
  });
  await transport.sendMail({ from: `PULP <${user}>`, to, replyTo: CONTACT_EMAIL, subject, html, text });
}

export const escapeHtml = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
