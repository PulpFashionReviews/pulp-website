import { NextRequest } from 'next/server';

// Serves a designer's own site icon (favicon) via Google's public favicon service.
// Fetching it here keeps visitors' browsers from contacting Google, and Vercel caches the result.
const HOST = /^(?=.{3,253}$)([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,24}$/;
const WEEK = 60 * 60 * 24 * 7;

export async function GET(req: NextRequest) {
  const host = (req.nextUrl.searchParams.get('host') || '').toLowerCase();
  if (!HOST.test(host)) return new Response('Bad host', { status: 400 });
  try {
    const res = await fetch(`https://www.google.com/s2/favicons?domain=${encodeURIComponent(host)}&sz=128`, {
      next: { revalidate: WEEK },
    });
    const type = res.headers.get('content-type') || '';
    if (!res.ok || !type.startsWith('image/')) {
      return new Response('No icon', { status: 404, headers: { 'Cache-Control': `public, s-maxage=${WEEK}` } });
    }
    return new Response(await res.arrayBuffer(), {
      headers: { 'Content-Type': type, 'Cache-Control': `public, max-age=86400, s-maxage=${WEEK}, stale-while-revalidate=${WEEK}` },
    });
  } catch {
    return new Response('No icon', { status: 404 });
  }
}
