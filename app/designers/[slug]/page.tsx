import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { cache } from 'react';
import { supabase } from '@/lib/supabase';
import { Brand, Review, designerSlug, reviewCategories, websiteUrl } from '@/lib/designers';
import { DesignerReviewForm } from '@/components/designer-review-form';

export const revalidate = 60;

type PageProps = { params: Promise<{ slug: string }> };

const getDesigner = cache(async (slug: string) => {
  if (!supabase) return null;
  const { data: brands } = await supabase
    .from('fashion_brands')
    .select('id, Brand, Category, Price_Range, Website, Contact_Number')
    .order('id');
  const brand = ((brands || []) as Brand[]).find((b) => designerSlug(b) === slug);
  if (!brand) return null;
  const { data: reviews } = await supabase
    .from('reviews')
    .select('id, brand_id, rating, review_text, created_at, website_photo_url, received_photo_url, category_ratings')
    .eq('brand_id', brand.id)
    .eq('status', 'approved')
    .order('created_at', { ascending: false });
  return { brand, reviews: (reviews || []) as Review[] };
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

export default async function DesignerPage({ params }: PageProps) {
  const { slug } = await params;
  const designer = await getDesigner(slug);
  if (!designer) notFound();
  const { brand, reviews } = designer;

  const average = reviews.length ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length : null;
  const categoryAverages = reviewCategories
    .map((category) => {
      const scores = reviews.map((r) => r.category_ratings?.[category]).filter((n): n is number => typeof n === 'number' && n > 0);
      return { category, score: scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : null };
    })
    .filter((c) => c.score !== null) as { category: string; score: number }[];

  return (
    <main>
      <header className="topbar">
        <Link href="/" className="wordmark" aria-label="PULP home">PULP<span>®</span></Link>
        <nav>
          <Link href="/#designers">Designers</Link>
          <Link href="/#how-it-works">How it works</Link>
          <a href="#designer-reviews">Reviews</a>
        </nav>
        <a className="nav-cta" href="#write-review">Write a review <span>↗</span></a>
      </header>

      <section className="designer-hero">
        <Link href="/#designers" className="designer-back">← Back to directory</Link>
        <div className="designer-hero-grid">
          <div>
            <span className="section-kicker">DESIGNER PROFILE</span>
            <h1>{brand.Brand}</h1>
            <p className="designer-meta">
              {brand.Category || 'Pakistani fashion'}
              {brand.Price_Range ? ` · ${brand.Price_Range}` : ''}
            </p>
            <div className="designer-links">
              {brand.Website && <a href={websiteUrl(brand.Website)} target="_blank" rel="noreferrer">Visit website ↗</a>}
              {brand.Contact_Number && <span>Contact: {brand.Contact_Number}</span>}
            </div>
          </div>
          <div className="designer-score">
            {average !== null ? (
              <>
                <strong>{average.toFixed(1)}</strong>
                <Stars value={average} />
                <span>{reviews.length} approved {reviews.length === 1 ? 'review' : 'reviews'}</span>
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
            <span>{reviews.length} approved</span>
          </div>
          {reviews.length ? (
            reviews.map((r) => (
              <article className="modal-review" key={r.id}>
                <Stars value={r.rating} />
                <p>{r.review_text}</p>
                <small>{new Date(r.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</small>
                {r.website_photo_url && <a href={r.website_photo_url} target="_blank" rel="noreferrer">Website photo ↗</a>}
                {r.received_photo_url && <a href={r.received_photo_url} target="_blank" rel="noreferrer">What arrived ↗</a>}
              </article>
            ))
          ) : (
            <p className="empty-state">No approved reviews yet. Be the first to share your experience.</p>
          )}
        </section>

        <aside id="write-review" className="designer-form-wrap">
          <DesignerReviewForm brandId={brand.id} brandName={brand.Brand || 'this designer'} />
        </aside>
      </div>

      <footer>
        <Link href="/" className="wordmark footer-logo">PULP<span>®</span></Link>
        <p>Fashion reviews, from the people who know.</p>
        <div>
          <Link href="/#designers">Directory</Link>
          <a href="#write-review">Write a review</a>
          <a href="mailto:hello@pulp.example">Contact</a>
        </div>
        <small>© {new Date().getFullYear()} PULP. Real experiences. Real photos.</small>
      </footer>
    </main>
  );
}
