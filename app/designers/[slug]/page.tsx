import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { cache } from 'react';
import { supabase } from '@/lib/supabase';
import { BRAND_SELECT, BrandRow, Review, brandCategoryNames, designerSlug, reviewCategories, websiteUrl } from '@/lib/designers';
import { ReviewForm } from '@/components/review-form';
import { SiteFooter } from '@/components/site-footer';
import { PHOTO_BUCKET, facebookUrl, formatOrderMonth, instagramUrl, priceSymbol } from '@/lib/review-options';
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
  // Photos are private; approved reviews' photos get short-lived viewing links.
  const paths = rows.flatMap((r) => r.photo_paths ?? []);
  const photoUrls: Record<string, string> = {};
  if (paths.length) {
    const { data: signed } = await supabase.storage.from(PHOTO_BUCKET).createSignedUrls(paths, 60 * 60 * 2);
    (signed || []).forEach((item, i) => { if (item.signedUrl) photoUrls[paths[i]] = item.signedUrl; });
  }
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
  if (!designer) return { title: 'Designer not found — PULP' };
  const name = designer.brand.Brand || 'Designer';
  return {
    title: `${name} reviews — PULP`,
    description: `Read ${designer.reviews.length} real customer reviews of ${name}, with photos and detailed ratings, on PULP.`,
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
        <Link href="/" className="wordmark" aria-label="PULP home">PULP<span>®</span></Link>
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

      <SiteFooter />
    </main>
  );
}
