import 'server-only';
import { createClient } from '@supabase/supabase-js';

/**
 * Server-only client with the service key, for scheduled housekeeping (never sent to browsers).
 * Returns null until SUPABASE_SERVICE_ROLE_KEY is added in Vercel → Settings → Environment Variables.
 */
export function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/rest\/v1\/?$/, '');
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return url && key ? createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } }) : null;
}

/** A client that acts as the signed-in person who sent this request (for admin checks). */
export function clientForToken(token: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/rest\/v1\/?$/, '');
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
}
