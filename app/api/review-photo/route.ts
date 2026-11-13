import { NextRequest } from 'next/server';
import { supabase } from '@/lib/supabase';
import { PHOTO_BUCKET } from '@/lib/review-options';

// Photos of approved reviews, served through a short-lived private link that's made fresh
// whenever needed. Designer pages are cached, so linking here (rather than to a link made
// when the page was built) means photos never break on quiet pages.
const LINK_SECONDS = 60 * 60;   // each private link works for an hour
const CACHE_SECONDS = 60 * 30;  // reuse a link for at most half that time

export async function GET(req: NextRequest) {
  const path = req.nextUrl.searchParams.get('path') || '';
  if (!supabase || !path || path.length > 300 || path.includes('..')) return new Response(null, { status: 404 });
  // Only photos that belong to an approved review (the public feed shows nothing else).
  const { data: rows } = await supabase.from('review_feed').select('id').contains('photo_paths', [path]).limit(1);
  if (!rows?.length) return new Response(null, { status: 404, headers: { 'Cache-Control': 'public, s-maxage=60' } });
  const { data, error } = await supabase.storage.from(PHOTO_BUCKET).createSignedUrl(path, LINK_SECONDS);
  if (error || !data?.signedUrl) return new Response(null, { status: 404, headers: { 'Cache-Control': 'public, s-maxage=60' } });
  return new Response(null, {
    status: 302,
    headers: { Location: data.signedUrl, 'Cache-Control': `public, max-age=${CACHE_SECONDS}, s-maxage=${CACHE_SECONDS}` },
  });
}
