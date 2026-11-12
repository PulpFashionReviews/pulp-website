import { supabase } from '@/lib/supabase';

// Visited once a day by a Vercel cron job (see vercel.json) so the free Supabase
// project never counts as inactive and gets paused. Reads one row; changes nothing.
export const dynamic = 'force-dynamic';

export async function GET() {
  if (!supabase) return Response.json({ ok: false, error: 'Database not configured' }, { status: 500 });
  const { error } = await supabase.from('fashion_brands').select('id').limit(1);
  if (error) return Response.json({ ok: false, error: error.message }, { status: 502 });
  return Response.json({ ok: true, at: new Date().toISOString() }, { headers: { 'Cache-Control': 'no-store' } });
}
