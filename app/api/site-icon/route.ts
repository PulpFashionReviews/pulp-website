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
// Many shop platforms turn away unfamiliar bots, so identify as an ordinary browser.
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36';

type Candidate = { url: string; score: number };

function attr(tag: string, name: string) {
  const m = tag.match(new RegExp(`\\b${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, 'i'));
  return m ? (m[1] ?? m[2] ?? m[3] ?? '').trim() : '';
}

/** Ask Shopify's image CDN for a larger copy (it never enlarges beyond the original file). */
function upsize(url: URL, width: number, square: boolean) {
  if (/cdn\.shopify\.com$/i.test(url.hostname) || url.pathname.includes('/cdn/shop/')) {
    url.searchParams.set('width', String(width));
    if (square) url.searchParams.set('height', String(width)); else url.searchParams.delete('height');
    url.searchParams.delete('crop');
  }
}

function toUrl(href: string, base: string) {
  if (!href || href.startsWith('data:')) return null;
  try {
    const url = new URL(href.replace(/&amp;/g, '&').replace(/^\/\//, 'https://'), base);
    if (!/^https?:$/.test(url.protocol) || /\.svg($|\?)/i.test(url.pathname)) return null;
    return url;
  } catch {
    return null;
  }
}

/** Square icons from <link> tags, plus the site's own logo (structured data, or a header image named "logo"). */
function candidatesFrom(html: string, base: string): Candidate[] {
  const out: Candidate[] = [];
  const head = html.split(/<\/head>/i)[0];
  for (const tag of head.match(/<link\b[^>]*>/gi) ?? []) {
    const rel = attr(tag, 'rel').toLowerCase();
    if (!rel.split(/\s+/).some((r) => r === 'icon' || r.startsWith('apple-touch-icon'))) continue;
    if (attr(tag, 'type').includes('svg')) continue;
    const url = toUrl(attr(tag, 'href'), base);
    if (!url) continue;
    const declared = Math.max(0, ...(attr(tag, 'sizes').match(/\d+/g) ?? []).map(Number));
    upsize(url, 192, true);
    out.push({ url: url.toString(), score: declared || (rel.startsWith('apple-touch-icon') ? 180 : 32) });
  }
  // Organization logo in JSON-LD: "logo": "…" or "logo": { "url": "…" }
  for (const m of html.matchAll(/"logo"\s*:\s*(?:\{[^}]*?"url"\s*:\s*)?"([^"]+)"/g)) {
    const url = toUrl(m[1].replace(/\\\//g, '/'), base);
    if (url) { upsize(url, 400, false); out.push({ url: url.toString(), score: 150 }); }
  }
  // A header image whose class, alt or file name says "logo".
  for (const tag of (html.slice(0, 200_000).match(/<img\b[^>]*>/gi) ?? []).slice(0, 40)) {
    if (!/logo/i.test(`${attr(tag, 'class')} ${attr(tag, 'alt')} ${attr(tag, 'src')}`)) continue;
    const url = toUrl(attr(tag, 'src') || attr(tag, 'data-src'), base);
    if (url) { upsize(url, 400, false); out.push({ url: url.toString(), score: 140 }); break; }
  }
  const seen = new Set<string>();
  return out.sort((a, b) => b.score - a.score).filter((c) => (seen.has(c.url) ? false : (seen.add(c.url), true)));
}

/** Pixel width of a PNG, GIF, JPEG, WebP or ICO image (0 if unknown). */
function widthOf(buf: ArrayBuffer) {
  const b = new Uint8Array(buf);
  const dv = new DataView(buf);
  if (b[0] === 0x89 && b[1] === 0x50) return dv.getUint32(16);
  if (b[0] === 0x47 && b[1] === 0x49) return dv.getUint16(6, true);
  if (b[0] === 0 && b[1] === 0 && b[2] === 1 && b[3] === 0) {
    let max = 0;
    for (let i = 0, n = dv.getUint16(4, true); i < n && 6 + i * 16 < b.length; i++) max = Math.max(max, b[6 + i * 16] || 256);
    return max;
  }
  if (b[0] === 0x52 && b[8] === 0x57) {
    const kind = String.fromCharCode(b[12], b[13], b[14], b[15]);
    if (kind === 'VP8X') return 1 + (b[24] | (b[25] << 8) | (b[26] << 16));
    if (kind === 'VP8L') return 1 + (((b[22] & 0x3f) << 8) | b[21]);
    if (kind === 'VP8 ') return dv.getUint16(26, true) & 0x3fff;
  }
  if (b[0] === 0xff && b[1] === 0xd8) {
    for (let i = 2; i < b.length - 9;) {
      if (b[i] !== 0xff) { i++; continue; }
      const marker = b[i + 1];
      if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) return dv.getUint16(i + 7);
      i += 2 + dv.getUint16(i + 2);
    }
  }
  return 0;
}

let trace: string[] | null = null;
const note = (m: string) => { if (trace) trace.push(m); };

async function fetchImage(url: string) {
  try {
    const res = await fetch(url, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(6000), next: { revalidate: WEEK } });
    note(`${res.status} ${res.headers.get('content-type')} ${url}`);
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

const SHARP = 96;

async function bestIcon(host: string) {
  const tried: string[] = [];
  let fallback: { body: ArrayBuffer; type: string; width: number } | null = null;
  const consider = async (url: string) => {
    if (tried.includes(url) || tried.length >= 6) return null;
    tried.push(url);
    const img = await fetchImage(url);
    if (!img) return null;
    const width = widthOf(img.body);
    note(`width ${width}`);
    if (width >= SHARP) return img;
    if (!fallback || width > fallback.width) fallback = { ...img, width };
    return null;
  };
  // 1. Icons and logos declared on the homepage.
  try {
    const page = await fetch(`https://${host}/`, {
      headers: { 'User-Agent': UA, Accept: 'text/html' },
      signal: AbortSignal.timeout(6000),
      redirect: 'follow',
      next: { revalidate: WEEK },
    });
    note(`page ${page.status} ${page.url}`);
    if (page.ok) {
      const html = (await page.text()).slice(0, 600_000);
      const cands = candidatesFrom(html, page.url || `https://${host}/`);
      note(`candidates ${JSON.stringify(cands.slice(0, 6))}`);
      for (const c of cands.filter((c) => c.score >= 64)) {
        const img = await consider(c.url);
        if (img) return img;
      }
      // Small declared icons last, in case one is bigger than it says.
      for (const c of cands.filter((c) => c.score < 64)) {
        const img = await consider(c.url);
        if (img) return img;
      }
    }
  } catch (e) { note(`page error ${String(e)}`); }
  // 2. The conventional high-resolution icon, then Google's larger favicon service.
  for (const url of [
    `https://${host}/apple-touch-icon.png`,
    `https://t3.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=${encodeURIComponent(`https://${host}`)}&size=128`,
  ]) {
    const img = await consider(url);
    if (img) return img;
  }
  // Nothing sharp: hand back the best small one (the page shows a monogram instead of enlarging it).
  return fallback as { body: ArrayBuffer; type: string } | null;
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
  if (req.nextUrl.searchParams.get('debug') === '1') {
    trace = [];
    const icon = await bestIcon(host);
    const out = { trace, bytes: icon?.body.byteLength ?? 0, type: icon?.type ?? null };
    trace = null;
    return Response.json(out, { headers: { 'Cache-Control': 'no-store' } });
  }
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
