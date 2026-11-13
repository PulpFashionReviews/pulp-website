import { NextRequest } from 'next/server';
import { clientForToken } from '@/lib/supabase-admin';
import { escapeHtml, mailerReady, sendMail } from '@/lib/mailer';
import { designerHref } from '@/lib/designers';
import { SITE_URL } from '@/lib/site';

// Emails a reviewer when an admin approves their review. Called by the admin dashboard.
export async function POST(req: NextRequest) {
  const token = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  const { reviewId } = (await req.json().catch(() => ({}))) as { reviewId?: number };
  const db = token ? clientForToken(token) : null;
  if (!db || !reviewId) return Response.json({ sent: false, reason: 'bad request' }, { status: 400 });

  const { data: isAdmin } = await db.rpc('is_admin');
  if (isAdmin !== true) return Response.json({ sent: false, reason: 'not authorized' }, { status: 403 });
  if (!mailerReady()) return Response.json({ sent: false, reason: 'email not set up' });

  const { data, error } = await db.rpc('admin_review_notice', { p_id: reviewId });
  const row = (data as { email: string | null; brand_id: number; brand_name: string | null; status: string; already_emailed: boolean }[] | null)?.[0];
  if (error || !row) return Response.json({ sent: false, reason: error?.message ?? 'review not found' }, { status: 404 });
  if (row.status !== 'approved') return Response.json({ sent: false, reason: 'not approved' });
  if (row.already_emailed) return Response.json({ sent: false, reason: 'already emailed' });
  if (!row.email) return Response.json({ sent: false, reason: 'no email on file' });

  const brand = row.brand_name || 'the designer';
  const link = `${SITE_URL}${designerHref({ id: row.brand_id, Brand: row.brand_name })}`;
  const b = escapeHtml(brand);
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:520px;color:#252321;line-height:1.6">
      <h2 style="font-family:Georgia,serif;font-weight:500">Your review is live 🎉</h2>
      <p>Thank you for sharing your experience with <b>${b}</b>. Your review has been approved and is now on PULP, where it will help other shoppers decide before they order.</p>
      <p><a href="${link}" style="display:inline-block;background:#6e233b;color:#ffffff;padding:12px 20px;text-decoration:none;font-weight:600">See your review</a></p>
      <p>Bought from another Pakistani designer? Your next review helps just as much.</p>
      <p style="color:#77716a;font-size:13px">PULP · Real reviews of Pakistani designers</p>
    </div>`;
  const text = `Your review of ${brand} is live on PULP.\n\nThank you for sharing your experience. See it here: ${link}\n\nPULP · Real reviews of Pakistani designers`;

  try {
    await sendMail(row.email, `Your review of ${brand} is live on PULP`, html, text);
  } catch (e) {
    return Response.json({ sent: false, reason: e instanceof Error ? e.message : 'send failed' }, { status: 502 });
  }
  await db.rpc('admin_mark_review_emailed', { p_id: reviewId });
  return Response.json({ sent: true });
}
