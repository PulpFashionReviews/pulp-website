import { supabase } from '@/lib/supabase';
import { adminClient } from '@/lib/supabase-admin';

// Visited once a day by a Vercel cron job (see vercel.json):
// 1. keeps the free Supabase project from being paused for inactivity;
// 2. deletes proof-of-purchase files 30 days after a review was decided, as the privacy page promises.
export const dynamic = 'force-dynamic';
const PROOF_BUCKET = 'purchase-proofs';

async function purgeExpiredProofs() {
  const admin = adminClient();
  if (!admin) return { skipped: 'SUPABASE_SERVICE_ROLE_KEY not set' };
  const { data: paths, error } = await admin.rpc('expired_proof_paths');
  if (error) return { error: error.message };
  const list = ((paths || []) as string[]).filter(Boolean);
  if (list.length) {
    const { error: rmError } = await admin.storage.from(PROOF_BUCKET).remove(list);
    if (rmError) return { error: rmError.message };
  }
  const { data: cleared, error: clearError } = await admin.rpc('clear_expired_proofs');
  if (clearError) return { error: clearError.message };
  return { deleted: list.length, cleared };
}

export async function GET() {
  if (!supabase) return Response.json({ ok: false, error: 'Database not configured' }, { status: 500 });
  const { error } = await supabase.from('fashion_brands').select('id').limit(1);
  if (error) return Response.json({ ok: false, error: error.message }, { status: 502 });
  const proofs = await purgeExpiredProofs();
  return Response.json({ ok: true, at: new Date().toISOString(), proofs }, { headers: { 'Cache-Control': 'no-store' } });
}
