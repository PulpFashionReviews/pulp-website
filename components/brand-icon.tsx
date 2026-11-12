'use client';

import { useEffect, useRef, useState } from 'react';
import { logoUrl } from '@/lib/designers';

// Social and link-in-bio hosts would show the platform's icon, not the designer's.
const NOT_OWN_SITE = /(^|\.)(instagram\.com|facebook\.com|fb\.com|tiktok\.com|linktr\.ee|wa\.me|whatsapp\.com|youtube\.com|pinterest\.com|twitter\.com|x\.com)$/;
const SMALL_WORDS = new Set(['by', 'the', 'of', 'and', '&', 'house', 'studio', 'atelier', 'label', 'collection', 'pk', 'official']);

/** The designer's own website hostname, or null if they have no website of their own. */
export function siteHost(website: string | null | undefined) {
  if (!website) return null;
  try {
    const url = new URL(/^https?:\/\//i.test(website.trim()) ? website.trim() : `https://${website.trim().replace(/^https?:\s*\/*/i, '')}`);
    const host = url.hostname.toLowerCase().replace(/^www\./, '');
    return host.includes('.') && !NOT_OWN_SITE.test(host) ? host : null;
  } catch {
    return null;
  }
}

/** Up to two initials, skipping filler words: "Maria B" → "MB", "House of Huda" → "H". */
export function initials(name: string | null | undefined) {
  const words = (name || 'P').replace(/[^\p{L}\p{N}&\s]/gu, ' ').split(/\s+/).filter(Boolean);
  const main = words.filter((w) => !SMALL_WORDS.has(w.toLowerCase()));
  const picked = (main.length ? main : words).slice(0, 2);
  return picked.map((w) => w[0]).join('').toUpperCase() || 'P';
}

/** Uploaded logo, else the designer's own site icon, else a monogram. */
export function BrandIcon({ name, website, logoPath, tone }: { name: string | null; website: string | null; logoPath: string | null | undefined; tone: number }) {
  const uploaded = logoUrl(logoPath);
  const host = uploaded ? null : siteHost(website);
  const [iconFailed, setIconFailed] = useState(false);
  const src = uploaded ?? (host && !iconFailed ? `/api/site-icon?host=${encodeURIComponent(host)}` : null);
  const letters = initials(name);

  return (
    <div className={`brand-monogram tone-${tone}${uploaded ? ' has-logo' : ''}${src && !uploaded ? ' has-icon' : ''}`}>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={uploaded ? `${name} logo` : ''}
          loading="lazy"
          onError={() => setIconFailed(true)}
          // Icons under 64px look fuzzy when enlarged, so use the monogram for those.
          onLoad={(e) => { if (!uploaded && e.currentTarget.naturalWidth < 64) setIconFailed(true); }}
        />
      ) : (
        <>
          <span className={letters.length > 1 ? 'two' : undefined}>{letters}</span>
          <i>✳</i>
        </>
      )}
    </div>
  );
}

/** Round site icon or monogram for a designer's page header, used until the designer uploads a logo. */
export function DesignerIcon({ name, website }: { name: string; website: string | null }) {
  const host = siteHost(website);
  const [failed, setFailed] = useState(false);
  const img = useRef<HTMLImageElement>(null);
  // The page is rendered on the server, so the image may finish (or fail) loading before React attaches its handlers.
  useEffect(() => {
    const el = img.current;
    if (el?.complete && el.naturalWidth < 64) setFailed(true);
  }, []);
  if (host && !failed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        ref={img}
        className="designer-logo site-icon"
        src={`/api/site-icon?host=${encodeURIComponent(host)}`}
        alt=""
        onError={() => setFailed(true)}
        onLoad={(e) => { if (e.currentTarget.naturalWidth < 64) setFailed(true); }}
      />
    );
  }
  return <span className="designer-logo monogram" aria-hidden="true">{initials(name)}</span>;
}
