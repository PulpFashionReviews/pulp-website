import { NextResponse, type NextRequest } from 'next/server';

// The old address forwards to pulpreviews.com, so Google and visitors see one official site.
const OLD_HOSTS = new Set(['pulp-website.vercel.app', 'pulp-website-pulp1.vercel.app', 'pulpreviews.com']);

export function middleware(req: NextRequest) {
  const host = (req.headers.get('host') || '').toLowerCase();
  if (OLD_HOSTS.has(host) && !req.nextUrl.pathname.startsWith('/api/')) {
    const url = new URL(req.nextUrl.pathname + req.nextUrl.search, 'https://www.pulpreviews.com');
    return NextResponse.redirect(url, 308);
  }
  return NextResponse.next();
}

export const config = { matcher: ['/((?!_next/|favicon|.*\\.(?:png|jpg|jpeg|svg|ico|webp)$).*)'] };
