import { NextRequest } from 'next/server';
import { supabase } from '@/lib/supabase';

// Serves the sharpest icon a designer's own website offers, for their directory tile and page header.
// Order: the largest icon declared in the site's HTML (Shopify icons are re-requested at 192px),
// then /apple-touch-icon.png, then Google's favicon service. Fetching here keeps visitors' browsers
// away from third parties, and Vercel caches each answer for a week.
// SVG is never served: an SVG on our own domain could run scripts if opened directly.

const HOST = /^(?=.{3,253}$)([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,24}$/;
const WEEK = 60 * 60 * 24 * 7;
const RASTER = /^image\/(png|jpe?g|webp|gif|x-icon|vnd\.microsoft\.icon)$/;
const MAX_BYTES = 1024 * 1024;
const UA = 'Mozilla/5.0 (compatible; PULP-icon/1.0; +https://pulp-website.vercel.app)';

type Candidate = { url: string; score: number };

function attr(tag: string, name: string) {
  const m = tag.match(new RegExp(`\\b${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, 'i'));
  return m ? (m[1] ?? m[2] ?? m[3] ?? '').trim() : '';
}

/** Ask Shopify's image CDN for a larger copy of a small favicon. */
function upsize(url: URL) {
  if (/cdn\.shopify\.com$/i.test(url.hostname) || url.pathname.includes('/cdn/shop/')) {
    for (const p of ['width', 'height']) url.searchParams.set(p, '192');
    url.searchParams.delete('crop');
    return true;
  }
  return false;
}

function candidatesFrom(html: string, base: string): Candidate[] {
  const out: Candidate[] = [];
  for (const tag of html.match(/<link\b[^>]*>/gi) ?? []) {
    const rel = attr(tag, 'rel').toLowerCase();
    if (!rel.split(/\s+/).some((r) => r === 'icon' || r.startsWith('apple-touch-icon'))) continue;
    const href = attr(tag, 'href');
    if (!href || href.startsWith('data:')) continue;
    let url: URL;
    try { url = new URL(href.replace(/&amp;/g, '&'), base); } catch { continue; }
    if (!/^https?:$/.test(url.protocol) || /\.svg($|\?)/i.test(url.pathname) || attr(tag, 'type').includes('svg')) continue;
    const declared = Math.max(0, ...(attr(tag, 'sizes').match(/\d+/g) ?? []).map(Number));
    let score = declared || (rel.startsWith('apple-touch-icon') ? 180 : 32);
    if (upsize(url)) score = Math.max(score, 192);
    out.push({ url: url.toString(), score });
  }
  return out.sort((a, b) => b.score - a.score);
}

async function fetchImage(url: string) {
  try {
    const res = await fetch(url, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(6000), next: { revalidate: WEEK } });
    if (!res.ok) return null;
    let type = (res.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
    if (!type || type === 'application/octet-stream') type = /\.ico($|\?)/i.test(url) ? 'image/x-icon' : type;
    if (!RASTER.test(type)) return null;
    const body = await res.arrayBuffer();
    if (body.byteLength < 100 || body.byteLength > MAX_BYTES) return null;
    return { body, type };
  } catch {
    return null;
  }
}

async function bestIcon(host: string) {
  // 1. Icons declared on the homepage.
  try {
    const page = await fetch(`https://${host}/`, {
      headers: { 'User-Agent': UA, Accept: 'text/html' },
      signal: AbortSignal.timeout(6000),
      redirect: 'follow',
      next: { revalidate: WEEK },
    });
    if (page.ok) {
      const html = (await page.text()).slice(0, 400_000);
      const head = html.split(/<\/head>/i)[0];
      for (const c of candidatesFrom(head, page.url || `https://${host}/`).slice(0, 4)) {
        if (c.score < 64) break;
        const img = await fetchImage(c.url);
        if (img) return img;
      }
    }
  } catch { /* fall through */ }
  // 2. The conventional high-resolution icon.
  const touch = await fetchImage(`https://${host}/apple-touch-icon.png`);
  if (touch) return touch;
  // 3. Google's favicon service (often only 32px; the page shows a monogram if it's too small).
  return fetchImage(`https://www.google.com/s2/favicons?domain=${encodeURIComponent(host)}&sz=256`);
}

/** Only serve icons for websites that are actually in the directory, so this isn't an open proxy. */
async function isListed(host: string) {
  if (!supabase) return false;
  const { data } = await supabase.from('fashion_brands').select('id').ilike('Website', `%${host}%`).limit(1);
  return (data?.length ?? 0) > 0;
}

export async function GET(req: NextRequest) {
  const host = (req.nextUrl.searchParams.get('host') || '').toLowerCase();
  const miss = (status: number) => new Response(null, { status, headers: { 'Cache-Control': `public, s-maxage=${WEEK}` } });
  if (!HOST.test(host)) return miss(400);
  if (!(await isListed(host))) return miss(404);
  const icon = await bestIcon(host);
  if (!icon) return miss(404);
  return new Response(icon.body, {
    headers: {
      'Content-Type': icon.type,
      'Cache-Control': `public, max-age=86400, s-maxage=${WEEK}, stale-while-revalidate=${WEEK}`,
      'X-Content-Type-Options': 'nosniff',
      'Content-Security-Policy': "default-src 'none'",
    },
  });
}
