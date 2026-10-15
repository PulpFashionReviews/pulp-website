'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';

type Brand = { id: number; Brand: string | null; Category: string | null; Price_Range: string | null; Website: string | null; Contact_Number: string | null };
type Review = { id: number; brand_id: number; rating: number; review_text: string; created_at: string; website_photo_url: string | null; received_photo_url: string | null; category_ratings: Record<string, number> | null };
const reviewCategories = ['Customer service', 'Communication', 'Product quality', 'Accuracy to photos', 'Delivery', 'Value for money'];

export default function Home() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [search, setSearch] = useState('');
  const [categories, setCategories] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState('popular');
  const [selected, setSelected] = useState<Brand | null>(null);
  const [email, setEmail] = useState('');
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [rating, setRating] = useState(5);
  const [reviewText, setReviewText] = useState('');
  const [categoryRatings, setCategoryRatings] = useState<Record<string, number>>({});
  const [websitePhoto, setWebsitePhoto] = useState('');
  const [receivedPhoto, setReceivedPhoto] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(true);
  const [authLoading, setAuthLoading] = useState(false);

  useEffect(() => {
    async function load() {
      if (!supabase) { setLoading(false); return; }
      const [{ data: brandData }, { data: reviewData }, { data: authData }] = await Promise.all([
        supabase.from('fashion_brands').select('id, Brand, Category, Price_Range, Website, Contact_Number').order('Brand'),
        supabase.from('reviews').select('id, brand_id, rating, review_text, created_at, website_photo_url, received_photo_url, category_ratings').eq('status', 'approved').order('created_at', { ascending: false }),
        supabase.auth.getUser(),
      ]);
      setBrands((brandData || []) as Brand[]);
      setReviews((reviewData || []) as Review[]);
      setUserEmail(authData.user?.email || null);
      setLoading(false);
    }
    load();
    if (!supabase) return;
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => setUserEmail(session?.user?.email || null));
    return () => listener.subscription.unsubscribe();
  }, []);

  


  const normalizedCategory = (value: string) => {
    const cleaned = value.trim().toLowerCase();

    const labels: Record<string, string> = {
      bridal: 'Bridal',
      couture: 'Couture',
      'luxury pret': 'Luxury Pret',
      pret: 'Pret',
      'ready-to-wear unstitched': 'Ready-to-Wear Unstitched',
      'designer women\'s wear': 'Designer Women\'s Wear',
      'women\'s apparel lifestyle': 'Women\'s Apparel Lifestyle',
      womenswear: 'Womenswear',
      studio: 'Studio',
      festive: 'Festive',
      formal: 'Formal',
      lawn: 'Lawn',
      unstitched: 'Unstitched',
      'wedding wear': 'Wedding Wear',
      basics: 'Basics',
      collection: 'Collection',
      'eastern wear': 'Eastern Wear',
    };

    return labels[cleaned] ??
      cleaned.replace(/\b\w/g, (letter) => letter.toUpperCase());
  };

  const availableCategories = Array.from(
    new Set(
      brands.flatMap((brand) =>
        (brand.Category || '')
          .split(',')
          .map(normalizedCategory)
          .filter(Boolean)
      )
    )
  ).sort();

  const filteredBrands = useMemo(() => {
    const matching = brands.filter((brand) => {
      const matchesSearch = (brand.Brand || '')
        .toLowerCase()
        .includes(search.toLowerCase());

      const brandCategories = (brand.Category || '')
        .split(',')
        .map(normalizedCategory);

      const matchesCategory =
        categories.length === 0 ||
        categories.some((selectedCategory) =>
          brandCategories.includes(selectedCategory)
        );

      return matchesSearch && matchesCategory;
    });

    const reviewCount = (brandId: number) =>
      reviews.filter((r) => r.brand_id === brandId).length;

    const averageRating = (brandId: number) => {
      const rows = reviews.filter((r) => r.brand_id === brandId);
      return rows.length
        ? rows.reduce((sum, r) => sum + r.rating, 0) / rows.length
        : 0;
    };

    return matching.sort((a, b) => {
      const countDifference = reviewCount(b.id) - reviewCount(a.id);
      const ratingDifference = averageRating(b.id) - averageRating(a.id);

      if (sortBy === 'alphabetical') {
        return (a.Brand || '').localeCompare(b.Brand || '');
      }

      if (sortBy === 'highest-rated') {
        return ratingDifference || countDifference ||
          (a.Brand || '').localeCompare(b.Brand || '');
      }

      if (sortBy === 'most-reviewed') {
        return countDifference ||
          (a.Brand || '').localeCompare(b.Brand || '');
      }

      return countDifference || ratingDifference ||
        (a.Brand || '').localeCompare(b.Brand || '');
    });
  }, [brands, reviews, search, categories, sortBy]);



  const brandReviews = selected ? reviews.filter((r) => r.brand_id === selected.id) : [];
  const averageFor = (brandId: number) => {
    const rows = reviews.filter((r) => r.brand_id === brandId);
    return rows.length ? (rows.reduce((sum, r) => sum + r.rating, 0) / rows.length).toFixed(1) : null;
  };

  async function signIn(event: FormEvent) {
    event.preventDefault();
    if (!supabase) { setNotice('Add your Supabase project URL and publishable key to enable sign-in.'); return; }
    setAuthLoading(true); setNotice('');
    const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: window.location.origin } });
    setNotice(error ? error.message : 'Check your email for your secure sign-in link.');
    setAuthLoading(false);
  }

  async function signOut() {
    if (supabase) await supabase.auth.signOut();
    setNotice('You have signed out.');
  }

  async function submitReview(event: FormEvent) {
    event.preventDefault();
    if (!supabase) { setNotice('Connect Supabase before submitting a review.'); return; }
    if (!selected) return;
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) { setNotice('Please sign in with your email before submitting a review.'); return; }
    const { error } = await supabase.from('reviews').insert({
      brand_id: selected.id, user_id: userData.user.id, rating, review_text: reviewText,
      category_ratings: categoryRatings, website_photo_url: websitePhoto || null,
      received_photo_url: receivedPhoto || null, status: 'pending'
    });
    if (error) setNotice(error.message);
    else { setNotice('Thank you! Your review has been submitted for moderation before it appears publicly.'); setReviewText(''); setWebsitePhoto(''); setReceivedPhoto(''); }
  }

  return <main>
    <header className="topbar"><a href="#top" className="wordmark" aria-label="PULP home">PULP<span>®</span></a><nav><a href="#designers">Designers</a><a href="#how-it-works">How it works</a><a href="#reviews">Reviews</a></nav><a className="nav-cta" href="#write-review">Write a review <span>↗</span></a></header>
    <section className="hero" id="top">
      <div className="hero-copy"><p className="eyebrow"><span className="eyebrow-line" /> THE CUSTOMER-LED FASHION DIRECTORY</p><h1>Love the look.<br /><em>Know the truth.</em></h1><p className="hero-intro">Real experiences from women who have actually shopped Pakistani fashion. Honest reviews, real photos, and the details you wish you knew before you ordered.</p><div className="hero-actions"><a className="button-primary" href="#designers">Find a designer <span>↗</span></a><a className="text-link" href="#write-review">Share your experience <span>→</span></a></div><div className="hero-proof"><div className="proof-avatars"><span>F</span><span>A</span><span>S</span></div><p>A community built on <strong>real experiences</strong></p></div></div>
      <div className="hero-art" aria-label="Editorial fashion-inspired still life"><div className="art-glow" /><div className="art-label">THE CUSTOMER<br />COMES FIRST <span>✳</span></div><div className="fabric fabric-back" /><div className="fabric fabric-front" /><div className="vase"><div className="vase-neck" /><div className="vase-body" /><div className="vase-base" /></div><div className="art-caption"><span>01 / 03</span><span>Fashion, with the full picture.</span></div></div>
      <div className="hero-bottom"><span>FOR THE WOMEN WHO WANT TO KNOW</span><span>HONESTY LOOKS GOOD ON YOU&nbsp; ↘</span></div>
    </section>

    <section className="promise-strip" id="how-it-works"><div className="promise-heading"><span className="section-kicker">THE PULP PROMISE</span><h2>Shop with <em>confidence.</em></h2></div><div className="promise-item"><span className="promise-icon">✳</span><div><h3>Real customers</h3><p>Reviews from people who have actually ordered.</p></div></div><div className="promise-item"><span className="promise-icon">▧</span><div><h3>Real photos</h3><p>Compare the website look with what arrived.</p></div></div><div className="promise-item"><span className="promise-icon">✎</span><div><h3>Useful details</h3><p>Rate quality, service, communication and more.</p></div></div><div className="promise-item"><span className="promise-icon">♡</span><div><h3>Community first</h3><p>Honest feedback to help every shopper decide.</p></div></div></section>

    <section className="directory section-pad" id="designers"><div className="section-top"><div><span className="section-kicker">THE DIRECTORY</span><h2>Find your next <em>favorite.</em></h2><p className="section-description">Explore Pakistani fashion brands, then read what real customers have to say.</p></div><div className="directory-count"><strong>{brands.length || '305'}</strong><span>BRANDS TO DISCOVER</span></div></div>
      {!supabase && <div className="setup-note">Your page is ready to connect. Add your Supabase keys to load the live brand directory and reviews.</div>}
      <div className="search-row"><label className="search-box"><span>⌕</span><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search designers by name…" /></label>
<details className="category-filter">
  <summary>
    Categories{categories.length > 0 ? ` (${categories.length} selected)` : ''}
  </summary>
  <div className="category-options">
    {availableCategories.map((item) => (
      <label key={item}>
        <input
          type="checkbox"
          checked={categories.includes(item)}
          onChange={(e) => {
            setCategories((current) =>
              e.target.checked
                ? [...current, item]
                : current.filter((value) => value !== item)
            );
          }}
        />
        {item}
      </label>
    ))}
    {categories.length > 0 && (
      <button type="button" onClick={() => setCategories([])}>
        Clear filters
      </button>
    )}
  </div>
</details>
</div>

      
<select
  aria-label="Sort designers"
  value={sortBy}
  onChange={(e) => setSortBy(e.target.value)}
>
  <option value="popular">Most popular</option>
  <option value="highest-rated">Highest rated</option>
  <option value="most-reviewed">Most reviewed</option>
  <option value="alphabetical">A–Z</option>
</select>

      
      <div className="brand-grid">{loading ? <p className="empty-state">Loading the directory…</p> : filteredBrands.slice(0, 12).map((brand, i) => <article className="brand-card" key={brand.id}><div className={`brand-monogram tone-${i % 5}`}><span>{(brand.Brand || 'P').slice(0, 1).toUpperCase()}</span><i>✳</i></div><div className="brand-info"><span className="brand-category">{brand.Category || 'PAKISTANI FASHION'}</span><h3>{brand.Brand}</h3><p>{brand.Price_Range || 'Price details not listed'}</p><div className="brand-card-bottom">{averageFor(brand.id) ? <span className="rating">★ {averageFor(brand.id)} <small>({reviews.filter(r => r.brand_id === brand.id).length})</small></span> : <span className="no-rating">Be the first to review</span>}<button onClick={() => { setSelected(brand); setNotice(''); }} aria-label={`View ${brand.Brand} details`}>View <span>↗</span></button></div></div></article>)}</div>
      {!loading && filteredBrands.length === 0 && <p className="empty-state">No designers found. Try another search.</p>}
      {filteredBrands.length > 12 && <p className="directory-note">Showing 12 of {filteredBrands.length} matches. Refine your search to find a specific designer.</p>}
    </section>

    <section className="review-banner" id="reviews"><div className="banner-mark">P.</div><div><span className="section-kicker">YOUR EXPERIENCE MATTERS</span><h2>REAL EXPERIENCES.<br /><em>REAL PHOTOS.</em></h2><p>Help another woman shop smarter. Tell us what was worth it, what wasn't, and what you wish you knew.</p><a className="button-light" href="#write-review">Leave a review <span>↗</span></a></div><div className="banner-stamp">BUILT BY<br />CUSTOMERS<br /><span>✳</span></div></section>

    <section className="write-section section-pad" id="write-review"><div className="write-intro"><span className="section-kicker">ADD YOUR VOICE</span><h2>Good or bad,<br /><em>we want to know.</em></h2><p>Thoughtful reviews make the whole community stronger. Reviews are checked before publishing to keep the directory useful and respectful.</p><div className="login-card"><h3>{userEmail ? 'You’re signed in' : 'Sign in to contribute'}</h3>{userEmail ? <><p className="signed-in">{userEmail}</p><button className="outline-button" onClick={signOut}>Sign out</button></> : <form onSubmit={signIn}><label htmlFor="email">Email address</label><input id="email" type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" /><button className="button-primary full" disabled={authLoading}>{authLoading ? 'Sending…' : 'Email me a sign-in link'} <span>↗</span></button><small>No password needed. We’ll email you a secure link.</small></form>}</div></div>
      <form className="review-form" onSubmit={submitReview}><div className="form-heading"><span className="section-kicker">WRITE A REVIEW</span><span className="required-note">* Required fields</span></div><label htmlFor="brand-select">Which designer did you shop with? *</label><select id="brand-select" required value={selected?.id ?? ''} onChange={e => setSelected(brands.find(b => b.id === Number(e.target.value)) || null)}><option value="">Select a designer</option>{brands.map(b => <option key={b.id} value={b.id}>{b.Brand}</option>)}</select><label>Overall experience *</label><div className="stars" role="radiogroup" aria-label="Overall rating">{[1,2,3,4,5].map(n => <button type="button" key={n} className={n <= rating ? 'star active' : 'star'} onClick={() => setRating(n)} aria-label={`${n} stars`}>★</button>)}<span>{['','Poor','Fair','Good','Very good','Excellent'][rating]}</span></div><label>Your review *</label><textarea required minLength={20} rows={5} value={reviewText} onChange={e => setReviewText(e.target.value)} placeholder="Tell us about the quality, fit, service, delivery, and whether it matched the photos…" /><div className="category-ratings"><p>Rate the details <span>(optional)</span></p><div className="category-rating-grid">{reviewCategories.map(c => <label key={c}>{c}<select value={categoryRatings[c] || ''} onChange={e => setCategoryRatings(prev => ({...prev, [c]: Number(e.target.value)}))}><option value="">—</option>{[1,2,3,4,5].map(n => <option key={n} value={n}>{n} / 5</option>)}</select></label>)}</div></div><div className="photo-fields"><div><label htmlFor="website-photo">Website/product photo URL</label><input id="website-photo" type="url" value={websitePhoto} onChange={e => setWebsitePhoto(e.target.value)} placeholder="https://…" /></div><div><label htmlFor="received-photo">What you received photo URL</label><input id="received-photo" type="url" value={receivedPhoto} onChange={e => setReceivedPhoto(e.target.value)} placeholder="https://…" /></div></div><p className="form-privacy">Only submit photos and details you have permission to share. Your review will remain pending until it is approved.</p><button className="button-primary" type="submit">Submit for review <span>↗</span></button>{notice && <p className="notice" role="status">{notice}</p>}</form></section>

    <footer><a href="#top" className="wordmark footer-logo">PULP<span>®</span></a><p>Fashion reviews, from the people who know.</p><div><a href="#designers">Directory</a><a href="#write-review">Write a review</a><a href="mailto:hello@pulp.example">Contact</a></div><small>
<p className="brand-disclaimer">
  PULP is an independent fashion review directory and is not affiliated
  with, endorsed by, or sponsored by the designers listed. All brand names
  and logos belong to their respective owners. If you are a rights holder
  and have a concern about a logo displayed here, please contact us.
</p>
© {new Date().getFullYear()} PULP. Real experiences. Real photos.</small></footer>

    {selected && <div className="modal-backdrop" role="presentation" onClick={() => setSelected(null)}><section className="brand-modal" role="dialog" aria-modal="true" aria-label={`${selected.Brand} details`} onClick={e => e.stopPropagation()}><button className="modal-close" onClick={() => setSelected(null)} aria-label="Close">×</button><span className="section-kicker">DESIGNER PROFILE</span><h2>{selected.Brand}</h2><p className="modal-category">{selected.Category || 'Pakistani fashion'} {selected.Price_Range ? `· ${selected.Price_Range}` : ''}</p>{selected.Website && <p><a className="modal-link" href={selected.Website.startsWith('http') ? selected.Website : `https://${selected.Website}`} target="_blank" rel="noreferrer">Visit designer website ↗</a></p>}{selected.Contact_Number && <p className="modal-contact">Contact: {selected.Contact_Number}</p>}<div className="modal-review-head"><h3>Customer reviews</h3><span>{brandReviews.length} approved</span></div>{brandReviews.length ? brandReviews.map(r => <article className="modal-review" key={r.id}><div className="rating">{'★'.repeat(r.rating)}<span className="muted-stars">{'★'.repeat(5-r.rating)}</span></div><p>{r.review_text}</p><small>{new Date(r.created_at).toLocaleDateString()}</small>{r.website_photo_url && <a href={r.website_photo_url} target="_blank" rel="noreferrer">Website photo ↗</a>}{r.received_photo_url && <a href={r.received_photo_url} target="_blank" rel="noreferrer">Received photo ↗</a>}</article>) : <p className="empty-state">No approved reviews yet. Be the first to share your experience.</p>}<button className="button-primary" onClick={() => { document.getElementById('write-review')?.scrollIntoView({behavior:'smooth'}); setSelected(selected); }}>Write a review <span>↗</span></button></section></div>}
  </main>;
}
