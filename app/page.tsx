'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { FilterDropdown } from '@/components/filter-dropdown';
import { ReviewForm } from '@/components/review-form';
import { SiteFooter } from '@/components/site-footer';
import { designerHref, BRAND_SELECT, BrandRow, brandCategoryNames, logoUrl } from '@/lib/designers';

type Brand = BrandRow & { categories: string[] };
type Rating = { brand_id: number; score: number; customers: number; total_reviews: number };

export default function Home() {
  const [brands, setBrands] = useState<Brand[]>([]);
  // Fair ratings: each customer's latest approved review counts once per designer.
  const [ratings, setRatings] = useState<Record<number, Rating>>({});
  const [search, setSearch] = useState('');
  const [categories, setCategories] = useState<string[]>([]);
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState('popular');
  const PAGE_SIZE = 12;
  const [page, setPage] = useState(1);
  // Start back at the first page whenever the search, filters or sort change.
  useEffect(() => { setPage(1); }, [search, categories, sortBy]);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (!supabase) { setLoading(false); return; }
      const [{ data: brandData }, { data: categoryData }, { data: reviewData }, { data: authData }] = await Promise.all([
        supabase.from('fashion_brands').select(BRAND_SELECT).order('Brand'),
        supabase.from('categories').select('name').order('sort_order'),
        supabase.from('brand_ratings').select('brand_id, score, customers, total_reviews'),
        supabase.auth.getUser(),
      ]);
      setBrands(((brandData || []) as unknown as BrandRow[]).map((b) => ({ ...b, categories: brandCategoryNames(b) })));
      setAvailableCategories(((categoryData || []) as { name: string }[]).map((c) => c.name));
      setRatings(Object.fromEntries(((reviewData || []) as Rating[]).map((r) => [r.brand_id, { ...r, score: Number(r.score) }])));
      setUserEmail(authData.user?.email || null);
      setLoading(false);
    }
    load();
    if (!supabase) return;
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => setUserEmail(session?.user?.email || null));
    return () => listener.subscription.unsubscribe();
  }, []);

  


  const filteredBrands = useMemo(() => {
    const matching = brands.filter((brand) => {
      const matchesSearch = (brand.Brand || '')
        .toLowerCase()
        .includes(search.toLowerCase());

      const matchesCategory =
        categories.length === 0 ||
        categories.some((selectedCategory) =>
          brand.categories.includes(selectedCategory)
        );

      return matchesSearch && matchesCategory;
    });

    const reviewCount = (brandId: number) => ratings[brandId]?.total_reviews ?? 0;
    const averageRating = (brandId: number) => ratings[brandId]?.score ?? 0;

    // Brands with an established website rank ahead of those without, when popularity ties.
    const hasWebsite = (brand: Brand) => (brand.Website && brand.Website.trim() ? 1 : 0);

    return matching.sort((a, b) => {
      const countDifference = reviewCount(b.id) - reviewCount(a.id);
      const ratingDifference = averageRating(b.id) - averageRating(a.id);
      const websiteDifference = hasWebsite(b) - hasWebsite(a);
      const byName = (a.Brand || '').localeCompare(b.Brand || '');

      if (sortBy === 'alphabetical') return byName;
      if (sortBy === 'highest-rated') return ratingDifference || countDifference || websiteDifference || byName;
      if (sortBy === 'most-reviewed') return countDifference || websiteDifference || byName;
      // Most popular (default): most reviewed, then best rated, then has a website, then A–Z.
      return countDifference || ratingDifference || websiteDifference || byName;
    });
  }, [brands, ratings, search, categories, sortBy]);



  const totalPages = Math.max(1, Math.ceil(filteredBrands.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  // Page numbers to show: first, last, and two on either side of the current page, with gaps.
  const pageNumbers: (number | null)[] = [];
  for (let n = 1; n <= totalPages; n++) {
    if (n === 1 || n === totalPages || Math.abs(n - currentPage) <= 2) pageNumbers.push(n);
    else if (pageNumbers[pageNumbers.length - 1] !== null) pageNumbers.push(null);
  }
  const goToPage = (n: number) => {
    setPage(Math.min(Math.max(1, n), totalPages));
    document.getElementById('designers')?.scrollIntoView({ behavior: 'smooth' });
  };

  const averageFor = (brandId: number) => (ratings[brandId] ? ratings[brandId].score.toFixed(1) : null);

  async function signOut() {
    if (supabase) await supabase.auth.signOut();
  }

  return <main>
<header className="topbar">
  <a href="#top" className="wordmark" aria-label="PULP home">
    PULP<span>®</span>
  </a>

  <nav>
    <a href="#how-it-works">How It Works</a>
    <a href="#designers">Find a Designer</a>
    <a className="nav-cta" href="#write-review">Review a Designer</a>
  </nav>

  <div className="auth-links">
    {userEmail ? (
      <>
        <span>{userEmail}</span>
        <button
          type="button"
          onClick={async () => {
            if (!supabase) return;
            await supabase.auth.signOut();
            setUserEmail(null);
          }}
        >
          Log Out
        </button>
      </>
    ) : (
      <>
        <a href="/login">Login</a>
        <a href="/signup">Sign Up</a>
      </>
    )}
  </div>

</header>

    <section className="hero" id="top">
     
<div className="hero-copy">
  <p className="eyebrow">
    <span className="hero-stars" aria-hidden="true">★★★★★</span> CUSTOMER REVIEWS · PAKISTANI DESIGNERS
  </p>
  <h1>
    Real reviews of<br />
    <em>Pakistani designers.</em>
  </h1>
  <p className="hero-intro">
    Before you order, see what other shoppers actually received — with photos, delivery times, sizing and service.
    Then share your own experience.
  </p>
  <form className="hero-search" role="search" onSubmit={(e) => { e.preventDefault(); setPage(1); document.getElementById('designers')?.scrollIntoView({ behavior: 'smooth' }); }}>
    <span aria-hidden="true">⌕</span>
    <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search a designer, e.g. Maria B." aria-label="Search for a designer" />
    <button type="submit" className="button-primary">See reviews</button>
  </form>
  <ul className="hero-facts">
    <li><b>{brands.length || 370}</b> designers</li>
    <li>Real photos of what arrived</li>
    <li>Every review checked</li>
  </ul>
  <div className="hero-actions">
    <a className="button-light" href="#write-review">Write a review <span>↗</span></a>
    <a className="text-link" href="#designers">Browse all designers <span>→</span></a>
  </div>
</div>


      <div className="hero-art" aria-label="Editorial fashion-inspired still life"><div className="art-glow" /><div className="art-label">THE CUSTOMER<br />COMES FIRST <span>✳</span></div><div className="fabric fabric-back" /><div className="fabric fabric-front" /><div className="vase"><div className="vase-neck" /><div className="vase-body" /><div className="vase-base" /></div><div className="art-caption"><span>01 / 03</span><span>Fashion, with the full picture.</span></div></div>
    </section>

<section className="how-it-works" id="how-it-works">
  <div className="how-intro">
    <span className="section-kicker">HOW IT WORKS</span>
    <h2>Ordered from Pakistan and got <em>burned?</em> You’re not alone.</h2>
    <p>
      The outfit looked nothing like the photos. The “original” turned out to be a copy. Delivery took months,
      customs fees came out of nowhere, and your messages went unanswered. PULP is where shoppers outside Pakistan
      tell the truth about what happened — so the next person doesn’t have to learn the hard way.
    </p>
    <p>
      And when a designer gets it right, we want to hear that too. PULP is just as much a place to find the designers
      real customers trust before you spend anything.
    </p>
    <div className="how-actions">
      <a className="button-primary" href="#write-review">Share your experience <span>↗</span></a>
      <a className="text-link-dark" href="#designers">Find trusted designers <span>→</span></a>
    </div>
  </div>

  <ol className="how-steps">
    <li>
      <span className="promise-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 12a8 8 0 0 1-11.6 7.1L4 20.5l1.4-4.9A8 8 0 1 1 21 12Z" />
          <path d="M8.5 11h7M8.5 14.5h4.5" />
        </svg>
      </span>
      <div>
        <h3>Tell your story</h3>
        <p>Quality, fit, delivery, customs, communication — say what really happened, good or bad, in your own words.</p>
      </div>
    </li>
    <li>
      <span className="promise-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 7h4l2-3h6l2 3h4a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2Z" />
          <circle cx="12" cy="13" r="4" />
        </svg>
      </span>
      <div>
        <h3>Show the proof</h3>
        <p>Put the website photo next to what actually arrived. Pictures say what a sales page won’t.</p>
      </div>
    </li>
    <li>
      <span className="promise-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 3 4 6v6c0 4.5 3.4 8.1 8 9 4.6-.9 8-4.5 8-9V6l-8-3Z" />
          <path d="M12 8v5M12 16.5h.01" />
        </svg>
      </span>
      <div>
        <h3>Warn the next shopper</h3>
        <p>Your review could save someone’s wedding outfit — and their money. Every review is checked, so it can’t be bought or buried.</p>
      </div>
    </li>
    <li>
      <span className="promise-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9L12 3Z" />
        </svg>
      </span>
      <div>
        <h3>Find the ones worth it</h3>
        <p>Sort by highest rated to discover designers with genuinely happy customers — and order with confidence.</p>
      </div>
    </li>
  </ol>
</section>


    <section className="directory section-pad" id="designers"><div className="section-top"><div><span className="section-kicker">THE DIRECTORY</span><h2>Find your next <em>favorite.</em></h2><p className="section-description">Explore Pakistani fashion brands, then read what real customers have to say.</p></div><div className="directory-count"><strong>{brands.length || '305'}</strong><span>BRANDS TO DISCOVER</span></div></div>
      {!supabase && <div className="setup-note">Your page is ready to connect. Add your Supabase keys to load the live brand directory and reviews.</div>}
      <div className="search-row"><label className="search-box"><span>⌕</span><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search designers by name…" /></label>
<FilterDropdown
  multiple
  label="All categories"
  options={availableCategories.map((c) => ({ value: c, label: c }))}
  value={categories}
  onChange={setCategories}
/>
<FilterDropdown
  label="Sort"
  className="fdrop-sort"
  options={[
    { value: 'popular', label: 'Most popular' },
    { value: 'highest-rated', label: 'Highest rated' },
    { value: 'most-reviewed', label: 'Most reviewed' },
    { value: 'alphabetical', label: 'A–Z' },
  ]}
  value={sortBy}
  onChange={setSortBy}
/>
</div>

      
      <div className="brand-grid">{loading ? <p className="empty-state">Loading the directory…</p> : filteredBrands.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE).map((brand, i) => <article className="brand-card" key={brand.id}><div className={`brand-monogram tone-${i % 5}${brand.logo_path ? ' has-logo' : ''}`}>{brand.logo_path ? /* eslint-disable-next-line @next/next/no-img-element */ <img src={logoUrl(brand.logo_path) ?? ''} alt={`${brand.Brand} logo`} loading="lazy" /> : <><span>{(brand.Brand || 'P').slice(0, 1).toUpperCase()}</span><i>✳</i></>}</div><div className="brand-info"><span className="brand-category">{brand.categories.length ? brand.categories.join(' · ') : 'PAKISTANI FASHION'}</span><h3>{brand.Brand}</h3><div className="brand-card-bottom">{averageFor(brand.id) ? <span className="rating">★ {averageFor(brand.id)} <small>({ratings[brand.id]?.total_reviews ?? 0})</small></span> : <span className="no-rating">Be the first to review</span>}<Link className="brand-card-link" href={designerHref(brand)} aria-label={`View ${brand.Brand} reviews`}>View <span>↗</span></Link></div></div></article>)}</div>
      {!loading && filteredBrands.length === 0 && <p className="empty-state">No designers found. Try another search, or <Link href="/suggest-designer">suggest a designer</Link>.</p>}
      {!loading && filteredBrands.length > 0 && (
        <nav className="pager" aria-label="Directory pages">
          <p className="directory-note">
            Showing {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, filteredBrands.length)} of {filteredBrands.length} designers
          </p>
          {totalPages > 1 && (
            <div className="pager-buttons">
              <button type="button" onClick={() => goToPage(1)} disabled={currentPage === 1} aria-label="First page">«</button>
              <button type="button" onClick={() => goToPage(currentPage - 1)} disabled={currentPage === 1} aria-label="Previous page">‹</button>
              {pageNumbers.map((n, idx) =>
                n === null ? (
                  <span key={`gap-${idx}`} className="pager-gap" aria-hidden="true">…</span>
                ) : (
                  <button
                    type="button"
                    key={n}
                    onClick={() => goToPage(n)}
                    className={n === currentPage ? 'active' : ''}
                    aria-current={n === currentPage ? 'page' : undefined}
                    aria-label={`Page ${n}`}
                  >
                    {n}
                  </button>
                )
              )}
              <button type="button" onClick={() => goToPage(currentPage + 1)} disabled={currentPage === totalPages} aria-label="Next page">›</button>
              <button type="button" onClick={() => goToPage(totalPages)} disabled={currentPage === totalPages} aria-label="Last page">»</button>
            </div>
          )}
        </nav>
      )}
      {!loading && <p className="suggest-cta">Can’t find a designer? <Link href="/suggest-designer">Suggest one ↗</Link></p>}
    </section>

    <section className="review-banner" id="reviews"><div className="banner-mark">P.</div><div><span className="section-kicker">YOUR EXPERIENCE MATTERS</span><h2>REAL EXPERIENCES.<br /><em>REAL PHOTOS.</em></h2><p>Help another woman shop smarter. Tell us what was worth it, what wasn't, and what you wish you knew.</p><a className="button-light" href="#write-review">Leave a review <span>↗</span></a></div><div className="banner-stamp">BUILT BY<br />CUSTOMERS<br /><span>✳</span></div></section>

    <section className="write-section section-pad" id="write-review"><div className="write-intro"><span className="section-kicker">ADD YOUR VOICE</span><h2>Good or bad,<br /><em>we want to know.</em></h2><p>Thoughtful reviews make the whole community stronger. Reviews are checked before publishing to keep the directory useful and respectful.</p>{userEmail && <div className="login-card"><h3>You’re signed in</h3><p className="signed-in">{userEmail}</p><button className="outline-button" onClick={signOut}>Sign out</button></div>}</div>
      <ReviewForm brands={brands} /></section>

    <SiteFooter />

  </main>;
}
