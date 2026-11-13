import { NextRequest } from 'next/server';
import { adminClient } from '@/lib/supabase-admin';
import { escapeHtml, mailerReady, sendMail } from '@/lib/mailer';

// "Email me a link" for guest reviews. PULP creates the one-click link and sends the email
// itself, so the wording is ours ("Confirm your email") rather than Supabase's "sign in".
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as { email?: string; path?: string; draft?: unknown };
  const email = (body.email || '').trim().toLowerCase();
  const path = typeof body.path === 'string' && body.path.startsWith('/') && !body.path.startsWith('//') ? body.path : '/';
  if (!EMAIL.test(email) || email.length > 200) return Response.json({ error: 'Please enter a valid email address.' }, { status: 400 });

  const admin = adminClient();
  if (!admin || !mailerReady()) return Response.json({ fallback: true }); // the form falls back to Supabase's own email

  const { data: allowed } = await admin.rpc('guest_link_allowed', { p_email: email });
  if (allowed !== true) return Response.json({ error: 'We’ve sent several links to this address recently. Please check your inbox (and spam), or try again in an hour.' }, { status: 429 });

  const draft = body.draft && typeof body.draft === 'object' && JSON.stringify(body.draft).length < 12000 ? body.draft : null;
  const redirectTo = `${req.nextUrl.origin}${path}${path.includes('?') ? '&' : '?'}guest=1`;

  const { data: found } = await admin.rpc('auth_user_by_email', { p_email: email });
  const existing = (found as { id: string; has_password: boolean }[] | null)?.[0];

  let link: string | undefined;
  if (!existing) {
    // New guest: an invite creates the account (no password) and confirms the email when clicked.
    const { data, error } = await admin.auth.admin.generateLink({ type: 'invite', email, options: { redirectTo, data: { guest: true, draft } } });
    if (error) return Response.json({ error: error.message }, { status: 500 });
    link = data.properties?.action_link;
  } else {
    const { data, error } = await admin.auth.admin.generateLink({ type: 'magiclink', email, options: { redirectTo } });
    if (error) return Response.json({ error: error.message }, { status: 500 });
    link = data.properties?.action_link;
    // Keep their answers with the link, so they survive another browser or device.
    if (draft && data.user) {
      await admin.auth.admin.updateUserById(data.user.id, { user_metadata: { ...(data.user.user_metadata || {}), draft } });
    }
  }
  if (!link) return Response.json({ error: 'Couldn’t create your link. Please try again.' }, { status: 500 });

  const href = escapeHtml(link);
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:520px;color:#252321;line-height:1.6">
      <h2 style="font-family:Georgia,serif;font-weight:500">Confirm your email</h2>
      <p>Thanks for sharing your experience on PULP. Click the button below to confirm your email address. You’ll go straight back to your review, with your answers saved.</p>
      <p><a href="${href}" style="display:inline-block;background:#6e233b;color:#ffffff;padding:12px 20px;text-decoration:none;font-weight:600">Confirm my email</a></p>
      <p style="color:#77716a;font-size:13px">This link works once and expires after a while. Didn’t request it? You can safely ignore this email.</p>
      <p style="color:#77716a;font-size:13px">PULP · Real reviews of Pakistani designers</p>
    </div>`;
  const text = `Confirm your email for PULP\n\nClick this link to confirm your email and go back to your review (your answers are saved):\n${link}\n\nDidn't request this? You can ignore this email.\n\nPULP · Real reviews of Pakistani designers`;
  try {
    await sendMail(email, 'Confirm your email for PULP', html, text);
  } catch {
    return Response.json({ error: 'We couldn’t send the email just now. Please try again in a minute.' }, { status: 502 });
  }
  return Response.json({ sent: true });
}
