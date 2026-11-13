import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { cache } from 'react';
import { supabase } from '@/lib/supabase';
import { BRAND_SELECT, BrandRow, Review, brandCategoryNames, designerHref, designerSlug, reviewCategories, websiteUrl } from '@/lib/designers';
import { SITE_URL } from '@/lib/site';
import { ReviewForm } from '@/components/review-form';
import { SiteFooter } from '@/components/site-footer';
import { facebookUrl, formatOrderMonth, instagramUrl, priceSymbol } from '@/lib/review-options';
import { AuthLinks } from '@/components/auth-links';
import { DesignerReply, Reply } from '@/components/designer-reply';
import { LogoManager } from '@/components/logo-manager';

export const revalidate = 60;

type PageProps = { params: Promise<{ slug: string }> };
type FeedReview = Review & { reviewer_key: string; reviewer_orders: number };

const RECENT_MONTHS = 12;
const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);

/** Each customer's newest review (rows must be newest-first). */
function latestPerCustomer(rows: FeedReview[]) {
  const seen = new Set<string>();
  return rows.filter((r) => (seen.has(r.reviewer_key) ? false : (seen.add(r.reviewer_key), true)));
}

/** Group a customer's reviews together, ordered by their newest review. */
function groupByCustomer(rows: FeedReview[]) {
  const groups = new Map<string, FeedReview[]>();
  for (const r of rows) groups.set(r.reviewer_key, [...(groups.get(r.reviewer_key) ?? []), r]);
  return [...groups.values()];
}

const getDesigner = cache(async (slug: string) => {
  if (!supabase) return null;
  const { data: brands } = await supabase
    .from('fashion_brands')
    .select(BRAND_SELECT)
    .order('id');
  const brand = ((brands || []) as unknown as BrandRow[]).find((b) => designerSlug(b) === slug);
  if (!brand) return null;
  // Approved reviews; reviewer_key groups one customer's reviews without exposing their account.
  const { data: reviews } = await supabase
    .from('review_feed')
    .select('*')
    .eq('brand_id', brand.id)
    .order('created_at', { ascending: false });
  const rows = (reviews || []) as FeedReview[];
  // Photos are private; /api/review-photo hands out a fresh viewing link for approved reviews' photos,
  // so they keep working however long this cached page is served.
  const photoUrls: Record<string, string> = {};
  for (const path of rows.flatMap((r) => r.photo_paths ?? [])) photoUrls[path] = `/api/review-photo?path=${encodeURIComponent(path)}`;
  // Designers' public replies (hidden ones are filtered out by the database).
  const { data: replyRows } = await supabase
    .from('review_replies')
    .select('id, review_id, body, created_at, updated_at')
    .eq('brand_id', brand.id);
  const replies: Record<number, Reply> = {};
  for (const r of (replyRows || []) as Reply[]) replies[r.review_id] = r;
  return { brand, categories: brandCategoryNames(brand), reviews: rows, photoUrls, replies };
});

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const designer = await getDesigner(slug);
  if (!designer) return { title: 'Designer not found — PULP', robots: { index: false } };
  const name = designer.brand.Brand || 'Designer';
  const n = designer.reviews.length;
  const description = n
    ? `Read ${n} real customer review${n === 1 ? '' : 's'} of ${name}, with photos of what arrived, sizing, delivery times and service. Shopping from the US, UK or Canada? See what other buyers say first.`
    : `${name} reviews from real shoppers outside Pakistan: photos of what arrived, sizing, delivery and service. Bought from ${name}? Be the first to review them on PULP.`;
  return {
    title: `${name} reviews: real customer photos & ratings | PULP`,
    description,
    alternates: { canonical: designerHref(designer.brand) },
    openGraph: { title: `${name} reviews | PULP`, description, url: designerHref(designer.brand), siteName: 'PULP', type: 'website' },
  };
}

function Stars({ value }: { value: number }) {
  const rounded = Math.round(value);
  return (
    <span className="rating" aria-label={`${value.toFixed(1)} out of 5 stars`}>
      {'★'.repeat(rounded)}
      <span className="muted-stars">{'★'.repeat(5 - rounded)}</span>
    </span>
  );
}

function ReviewCard({ r, photoUrls, reply, brandName }: { r: FeedReview; photoUrls: Record<string, string>; reply: Reply | null; brandName: string }) {
  const photos = (r.photo_paths ?? []).filter((path) => photoUrls[path]);
  return (
    <article className="modal-review">
      <div className="review-card-top">
        <Stars value={r.rating} />
        {r.verified_purchase && <span className="verified-badge" title="PULP checked this reviewer’s proof of purchase">✓ Verified purchase</span>}
      </div>
      {(r.item_type || r.shipped_to || r.order_month) && (
        <p className="review-facts">
          {[r.item_type, r.shipped_to && `Shipped to ${r.shipped_to}`, formatOrderMonth(r.order_month) && `Ordered ${formatOrderMonth(r.order_month)}`]
            .filter(Boolean)
            .join(' · ')}
        </p>
      )}
      <p>{r.review_text}</p>
      {photos.length > 0 && (
        <div className="review-photos">
          {photos.map((path, i) => (
            <a key={path} href={photoUrls[path]} target="_blank" rel="noreferrer" aria-label={`Open photo ${i + 1}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photoUrls[path]} alt={`Customer photo ${i + 1}`} loading="lazy" />
            </a>
          ))}
        </div>
      )}
      <small>{new Date(r.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}{r.updated_at && r.updated_at !== r.created_at ? ' · edited' : ''}</small>
      {r.website_photo_url && <a href={r.website_photo_url} target="_blank" rel="noreferrer">Website photo ↗</a>}
      {r.received_photo_url && <a href={r.received_photo_url} target="_blank" rel="noreferrer">What arrived ↗</a>}
      <DesignerReply reviewId={r.id} brandId={r.brand_id} brandName={brandName} initial={reply} />
    </article>
  );
}

export default async function DesignerPage({ params }: PageProps) {
  const { slug } = await params;
  const designer = await getDesigner(slug);
  if (!designer) notFound();
  const { brand, categories, reviews, photoUrls, replies } = designer;
  const brandName = brand.Brand || 'the designer';

  // Fair scores: every customer counts once, using their latest review.
  const latest = latestPerCustomer(reviews);
  const average = avg(latest.map((r) => r.rating));
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - RECENT_MONTHS);
  const recent = latestPerCustomer(reviews.filter((r) => new Date(r.created_at) > cutoff));
  const recentAverage = avg(recent.map((r) => r.rating));
  const groups = groupByCustomer(reviews);
  const categoryAverages = reviewCategories
    .map((category) => {
      const scores = latest.map((r) => r.category_ratings?.[category]).filter((n): n is number => typeof n === 'number' && n > 0);
      return { category, score: avg(scores) };
    })
    .filter((c) => c.score !== null) as { category: string; score: number }[];
  const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

  return (
    <main>
      <header className="topbar">
        <Link href="/" className="wordmark" aria-label="PULP home">PULP</Link>
        <nav>
          <Link href="/#how-it-works">How It Works</Link>
          <Link href="/#designers">Find a Designer</Link>
          <a className="nav-cta" href="#write-review">Review a Designer</a>
        </nav>
        <AuthLinks />
      </header>

      <section className="designer-hero">
        <Link href="/#designers" className="designer-back">← Back to directory</Link>
        <div className="designer-hero-grid">
          <div>
            <span className="section-kicker">DESIGNER PROFILE</span>
            <div className="designer-title">
              <LogoManager brandId={brand.id} brandName={brand.Brand || 'Designer'} initialPath={brand.logo_path ?? null} website={brand.Website ?? null} />
              <h1>{brand.Brand}</h1>
            </div>
            {brand.claimed_at && <p className="claimed-label" title="This designer has verified their PULP page and can reply to reviews">✓ Claimed by designer</p>}
            <p className="designer-meta">
              {categories.length ? categories.join(' · ') : 'Pakistani fashion'}
              {brand.Price_Range ? ` · ${priceSymbol(brand.Price_Range)}` : ''}
            </p>
            <div className="designer-links">
              {brand.Website && <a href={websiteUrl(brand.Website)} target="_blank" rel="noreferrer">Visit website ↗</a>}
              {brand.instagram && <a href={instagramUrl(brand.instagram)} target="_blank" rel="noreferrer">Instagram ↗</a>}
              {brand.facebook && <a href={facebookUrl(brand.facebook)} target="_blank" rel="noreferrer">Facebook ↗</a>}
              {brand.Contact_Number && <span>Contact: {brand.Contact_Number}</span>}
            </div>
            {brand.ships_to && brand.ships_to.length > 0 && <p className="designer-ships">Ships to {brand.ships_to.join(' · ')}</p>}
            {!brand.claimed_at && <Link className="claim-link" href={`/claim?designer=${brand.id}`}>Are you {brand.Brand}? Claim this page free →</Link>}
          </div>
          <div className="designer-score">
            {average !== null ? (
              <>
                <strong>{average.toFixed(1)}</strong>
                <Stars value={average} />
                <span>{plural(latest.length, 'customer')} · {plural(reviews.length, 'review')}</span>
                {recentAverage !== null && (
                  <span className="designer-recent">
                    Last {RECENT_MONTHS} months: <b>{recentAverage.toFixed(1)}</b> from {plural(recent.length, 'customer')}
                  </span>
                )}
                {recentAverage === null && <span className="designer-recent">No reviews in the last {RECENT_MONTHS} months</span>}
              </>
            ) : (
              <>
                <strong>—</strong>
                <span>No reviews yet</span>
              </>
            )}
          </div>
        </div>
      </section>

      <div className="designer-body section-pad">
        <section className="designer-reviews" id="designer-reviews" aria-labelledby="reviews-heading">
          {categoryAverages.length > 0 && (
            <div className="designer-breakdown">
              <h2 className="designer-subhead">The details</h2>
              <ul>
                {categoryAverages.map((c) => (
                  <li key={c.category}>
                    <span>{c.category}</span>
                    <span className="designer-bar" aria-hidden="true"><i style={{ width: `${(c.score / 5) * 100}%` }} /></span>
                    <strong>{c.score.toFixed(1)}</strong>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="modal-review-head">
            <h2 id="reviews-heading" className="designer-subhead">Customer reviews</h2>
            <span>{plural(latest.length, 'customer')} · {plural(reviews.length, 'review')}</span>
          </div>
          {reviews.length ? (
            groups.map((group) =>
              group.length > 1 ? (
                <div className="repeat-customer" key={group[0].reviewer_key}>
                  <p className="repeat-label">Repeat customer · {group.length} orders</p>
                  {group.map((r) => <ReviewCard key={r.id} r={r} photoUrls={photoUrls} reply={replies[r.id] ?? null} brandName={brandName} />)}
                </div>
              ) : (
                <ReviewCard key={group[0].id} r={group[0]} photoUrls={photoUrls} reply={replies[group[0].id] ?? null} brandName={brandName} />
              )
            )
          ) : (
            <p className="empty-state">No approved reviews yet. Be the first to share your experience.</p>
          )}
        </section>

        <aside id="write-review" className="designer-form-wrap">
          <ReviewForm brandId={brand.id} brandName={brand.Brand || 'this designer'} />
        </aside>
      </div>

      {average !== null && (
        <script
          type="application/ld+json"
          // Lets search engines show the rating (e.g. ★★★★☆ 12 reviews) next to this page in results.
          dangerouslySetInnerHTML={{ __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Organization',
            name: brandName,
            url: `${SITE_URL}${designerHref(brand)}`,
            ...(brand.Website ? { sameAs: [websiteUrl(brand.Website)] } : {}),
            aggregateRating: { '@type': 'AggregateRating', ratingValue: average.toFixed(1), bestRating: 5, worstRating: 1, ratingCount: latest.length, reviewCount: reviews.length },
            review: reviews.slice(0, 10).map((r) => ({
              '@type': 'Review',
              reviewRating: { '@type': 'Rating', ratingValue: r.rating, bestRating: 5, worstRating: 1 },
              author: { '@type': 'Person', name: 'PULP shopper' },
              datePublished: r.created_at.slice(0, 10),
              reviewBody: r.review_text,
            })),
          }).replace(/</g, '\\u003c') }}
        />
      )}
      <SiteFooter />
    </main>
  );
}
