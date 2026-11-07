'use client';

import { ChangeEvent, FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { REVIEW_SELECT, Review, reviewCategories } from '@/lib/designers';
import {
  ITEM_TYPES_FALLBACK, SHIP_COUNTRIES, PHOTO_BUCKET, MAX_PHOTOS, MAX_PHOTO_BYTES, PHOTO_TYPES, formatOrderMonth,
  PROOF_BUCKET, MAX_PROOF_BYTES, PROOF_TYPES,
} from '@/lib/review-options';

type BrandOption = { id: number; Brand: string | null };
type Props = {
  /** Fixed designer (designer pages). */
  brandId?: number;
  brandName?: string;
  /** Designer chooser (homepage). */
  brands?: BrandOption[];
};
type Photo = { path?: string; file?: File; url: string };
type Me = { id: string; email: string | null; confirmed: boolean; guest: boolean } | null;
type Proof = { path?: string; file?: File; name: string } | null;

const thisMonth = () => new Date().toISOString().slice(0, 7);

export function ReviewForm({ brandId, brandName, brands }: Props) {
  const [me, setMe] = useState<Me>(null);
  const [itemTypes, setItemTypes] = useState<string[]>(ITEM_TYPES_FALLBACK);
  const [chosenId, setChosenId] = useState<number | null>(brandId ?? null);
  const [myReviews, setMyReviews] = useState<Review[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);

  const [rating, setRating] = useState(5);
  const [reviewText, setReviewText] = useState('');
  const [itemType, setItemType] = useState('');
  const [shippedTo, setShippedTo] = useState('');
  const [orderMonth, setOrderMonth] = useState('');
  const [categoryRatings, setCategoryRatings] = useState<Record<string, number>>({});
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [removedPaths, setRemovedPaths] = useState<string[]>([]);
  const [proof, setProof] = useState<Proof>(null);
  const [orderRef, setOrderRef] = useState('');

  const [guestEmail, setGuestEmail] = useState('');
  const [guestSent, setGuestSent] = useState(false);
  const [guestBusy, setGuestBusy] = useState(false);
  const [guestNotice, setGuestNotice] = useState('');
  const [mode, setMode] = useState<'account' | 'guest'>('account');
  const [showProof, setShowProof] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  const [notice, setNotice] = useState('');
  const [needsLogin, setNeedsLogin] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const proofInput = useRef<HTMLInputElement>(null);
  const formTop = useRef<HTMLFormElement>(null);

  // Guest rules (photo + proof required) apply to guests, and preview while choosing "As a guest".
  const guestRules = me ? me.guest : mode === 'guest';
  const designerName = brandName ?? brands?.find((b) => b.id === chosenId)?.Brand ?? 'this designer';

  // "What did you order?" uses the same categories as the directory.
  useEffect(() => {
    if (!supabase) return;
    supabase.from('categories').select('name').order('sort_order').then(({ data }) => {
      const names = ((data || []) as { name: string }[]).map((c) => c.name);
      if (names.length) setItemTypes([...names, 'Other']);
    });
  }, []);

  // Who is signed in?
  useEffect(() => {
    if (!supabase) return;
    const read = async () => {
      const { data } = await supabase!.auth.getUser();
      const u = data.user;
      if (!u) { setMe(null); return; }
      // Guests confirm by email link and have no password on their account.
      const { data: guest } = await supabase!.rpc('current_user_is_guest');
      setMe({ id: u.id, email: u.email ?? null, confirmed: !!u.email_confirmed_at, guest: guest === true });
    };
    read();
    const { data: sub } = supabase.auth.onAuthStateChange(() => { read(); });
    return () => sub.subscription.unsubscribe();
  }, []);

  // Keep a draft on this device so answers survive logging in or confirming an email.
  const DRAFT_KEY = 'pulp-review-draft';
  const restored = useRef(false);
  const [draftReady, setDraftReady] = useState(false);
  useEffect(() => {
    if (restored.current) return;
    restored.current = true;
    setDraftReady(true);
    try {
      const raw = window.localStorage.getItem(DRAFT_KEY);
      if (!raw) return;
      const d = JSON.parse(raw);
      if (brandId && d.brandId !== brandId) return;
      if (!brandId && d.brandId) setChosenId(d.brandId);
      if (d.rating) setRating(d.rating);
      if (d.reviewText) setReviewText(d.reviewText);
      if (d.itemType) setItemType(d.itemType);
      if (d.shippedTo) setShippedTo(d.shippedTo);
      if (d.orderMonth) setOrderMonth(d.orderMonth);
      if (d.categoryRatings && Object.keys(d.categoryRatings).length) { setCategoryRatings(d.categoryRatings); setShowDetails(true); }
      if (d.orderRef) setOrderRef(d.orderRef);
      if (d.mode === 'guest') setMode('guest');
    } catch { /* storage unavailable */ }
  }, [brandId]);
  useEffect(() => {
    if (editingId || !draftReady) return;
    try {
      const empty = !reviewText && !itemType && !shippedTo && !orderMonth && !orderRef && !Object.keys(categoryRatings).length;
      if (empty) { window.localStorage.removeItem(DRAFT_KEY); return; }
      window.localStorage.setItem(DRAFT_KEY, JSON.stringify({
        brandId: chosenId, rating, reviewText, itemType, shippedTo, orderMonth, categoryRatings, orderRef, mode,
      }));
    } catch { /* storage unavailable */ }
  }, [draftReady, editingId, chosenId, rating, reviewText, itemType, shippedTo, orderMonth, categoryRatings, orderRef, mode]);

  // Back from a guest sign-in link: bring the form into view.
  useEffect(() => {
    if (!me || typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('guest') === '1') {
      formTop.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      params.delete('guest');
      const rest = params.toString();
      window.history.replaceState(null, '', window.location.pathname + (rest ? `?${rest}` : ''));
    }
  }, [me]);

  // The signed-in person's own reviews of the chosen designer (any status).
  const loadMine = useCallback(async () => {
    if (!supabase || !me || !chosenId) { setMyReviews([]); return; }
    const { data } = await supabase
      .from('reviews')
      .select(REVIEW_SELECT)
      .eq('brand_id', chosenId)
      .eq('user_id', me.id)
      .order('created_at', { ascending: false });
    setMyReviews((data || []) as Review[]);
  }, [me, chosenId]);
  useEffect(() => { loadMine(); }, [loadMine]);

  // Free preview URLs for picked files.
  useEffect(() => () => photos.forEach((p) => p.file && URL.revokeObjectURL(p.url)), [photos]);

  function resetForm() {
    setEditingId(null);
    setRating(5); setReviewText(''); setItemType(''); setShippedTo(''); setOrderMonth('');
    setCategoryRatings({}); setPhotos([]); setRemovedPaths([]);
    setProof(null); setOrderRef(''); setShowProof(false); setShowDetails(false);
    if (fileInput.current) fileInput.current.value = '';
    if (proofInput.current) proofInput.current.value = '';
  }

  async function startEdit(r: Review) {
    resetForm();
    setEditingId(r.id);
    setRating(r.rating);
    setReviewText(r.review_text);
    setItemType(r.item_type ?? '');
    setShippedTo(r.shipped_to ?? '');
    setOrderMonth(r.order_month ? r.order_month.slice(0, 7) : '');
    setCategoryRatings(r.category_ratings ?? {});
    setOrderRef(r.order_ref ?? '');
    setProof(r.proof_path ? { path: r.proof_path, name: 'Proof on file' } : null);
    setShowProof(!!(r.proof_path || r.order_ref));
    setShowDetails(Object.keys(r.category_ratings ?? {}).length > 0);
    const paths = r.photo_paths ?? [];
    if (supabase && paths.length) {
      const { data } = await supabase.storage.from(PHOTO_BUCKET).createSignedUrls(paths, 3600);
      setPhotos(paths.map((path, i) => ({ path, url: data?.[i]?.signedUrl ?? '' })));
    }
    setNotice('');
    formTop.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function onPickFiles(e: ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(e.target.files ?? []);
    e.target.value = '';
    const problems: string[] = [];
    const room = MAX_PHOTOS - photos.length;
    const accepted: Photo[] = [];
    for (const file of picked) {
      if (!PHOTO_TYPES.includes(file.type)) { problems.push(`${file.name} isn't a JPG, PNG or WebP image.`); continue; }
      if (file.size > MAX_PHOTO_BYTES) { problems.push(`${file.name} is larger than 5 MB.`); continue; }
      if (accepted.length >= room) { problems.push(`You can add up to ${MAX_PHOTOS} photos.`); break; }
      accepted.push({ file, url: URL.createObjectURL(file) });
    }
    if (accepted.length) setPhotos((cur) => [...cur, ...accepted]);
    setNotice(problems.join(' '));
  }

  function onPickProof(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!PROOF_TYPES.includes(file.type)) { setNotice(`${file.name} isn't a JPG, PNG, WebP or PDF file.`); return; }
    if (file.size > MAX_PROOF_BYTES) { setNotice(`${file.name} is larger than 10 MB.`); return; }
    setNotice('');
    setProof({ file, name: file.name });
  }

  async function sendGuestLink() {
    if (!supabase) { setGuestNotice('Reviews are temporarily unavailable. Please try again later.'); return; }
    setGuestBusy(true); setGuestNotice('');
    const back = `${window.location.origin}${window.location.pathname}?guest=1`;
    const { error } = await supabase.auth.signInWithOtp({
      email: guestEmail.trim(),
      options: { emailRedirectTo: back, shouldCreateUser: true, data: { guest: true } },
    });
    setGuestBusy(false);
    if (error) { setGuestNotice(error.message); return; }
    setGuestSent(true);
  }

  async function signOut() {
    if (!supabase) return;
    await supabase.auth.signOut();
    resetForm(); setGuestSent(false); setNotice('');
  }

  function removePhoto(index: number) {
    setPhotos((cur) => {
      const p = cur[index];
      if (p?.path) setRemovedPaths((r) => [...r, p.path!]);
      if (p?.file) URL.revokeObjectURL(p.url);
      return cur.filter((_, i) => i !== index);
    });
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!supabase) { setNotice('Reviews are temporarily unavailable. Please try again later.'); return; }
    setNotice(''); setNeedsLogin(false);
    if (!me) {
      if (mode === 'guest') { setNotice('Please confirm your email first — enter it at the top of the form and click the link we send you.'); }
      else { setNeedsLogin(true); setNotice('Please log in before submitting a review — your answers are saved on this device.'); }
      formTop.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    if (!me.confirmed) { setNotice('Please confirm your email address first — check your inbox for the confirmation link.'); return; }
    if (!chosenId) { setNotice('Please choose the designer you shopped with.'); return; }
    if (orderMonth > thisMonth()) { setNotice('The order month can’t be in the future.'); return; }
    if (me.guest && photos.length === 0) { setNotice('Guest reviews need at least one photo of what you received.'); return; }
    if (me.guest && !proof) { setNotice('Guest reviews need a proof of purchase — add a receipt, order confirmation or bank statement line.'); return; }

    setSubmitting(true);
    const uploaded: string[] = [];
    let newProofPath: string | null = null;
    try {
      if (proof?.file) {
        const f = proof.file;
        const ext = f.type === 'application/pdf' ? 'pdf' : f.type === 'image/png' ? 'png' : f.type === 'image/webp' ? 'webp' : 'jpg';
        const path = `${me.id}/${crypto.randomUUID()}.${ext}`;
        const { error } = await supabase.storage.from(PROOF_BUCKET).upload(path, f, { contentType: f.type, upsert: false });
        if (error) throw new Error(`Your proof of purchase couldn't be uploaded (${error.message}).`);
        newProofPath = path;
      }
      const previousProof = editingId ? myReviews.find((r) => r.id === editingId)?.proof_path ?? null : null;
      const proofPath = newProofPath ?? proof?.path ?? null;
      for (const p of photos.filter((x) => x.file)) {
        const file = p.file!;
        const ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg';
        const path = `${me.id}/${crypto.randomUUID()}.${ext}`;
        const { error } = await supabase.storage.from(PHOTO_BUCKET).upload(path, file, { contentType: file.type, upsert: false });
        if (error) throw new Error(`A photo couldn't be uploaded (${error.message}).`);
        uploaded.push(path);
      }
      const kept = photos.filter((x) => x.path).map((x) => x.path!);
      const fields = {
        rating,
        review_text: reviewText.trim(),
        item_type: itemType,
        shipped_to: shippedTo,
        order_month: `${orderMonth}-01`,
        category_ratings: categoryRatings,
        photo_paths: [...kept, ...uploaded],
        proof_path: proofPath,
        order_ref: orderRef.trim() || null,
      };

      const { error } = editingId
        ? await supabase.from('reviews').update(fields).eq('id', editingId)
        : await supabase.from('reviews').insert({ ...fields, brand_id: chosenId, user_id: me.id, status: 'pending' });
      if (error) {
        if (error.code === '23505') throw new Error('That order number has already been used for a review of this designer.');
        throw new Error(error.message);
      }

      if (editingId && removedPaths.length) {
        await supabase.storage.from(PHOTO_BUCKET).remove(removedPaths);
      }
      if (previousProof && previousProof !== proofPath) {
        await supabase.storage.from(PROOF_BUCKET).remove([previousProof]);
      }
      setNotice(editingId
        ? 'Your changes are saved. The updated review will appear once it’s approved again.'
        : 'Thank you! Your review has been submitted and will appear once it’s approved.');
      resetForm();
      try { window.localStorage.removeItem(DRAFT_KEY); } catch { /* ignore */ }
      loadMine();
    } catch (err) {
      if (uploaded.length) await supabase.storage.from(PHOTO_BUCKET).remove(uploaded);
      if (newProofPath) await supabase.storage.from(PROOF_BUCKET).remove([newProofPath]);
      setNotice(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  const loginHref = () =>
    `/login?next=${encodeURIComponent(typeof window !== 'undefined' ? window.location.pathname + '#write-review' : '/')}`;

  return (
    <div className="review-form-wrap">
      {myReviews.length > 0 && (
        <div className="my-reviews">
          <span className="section-kicker">YOUR REVIEWS OF {designerName.toUpperCase()}</span>
          {myReviews.map((r) => (
            <div className="my-review" key={r.id}>
              <div>
                <strong>{'★'.repeat(r.rating)}<span className="muted-stars">{'★'.repeat(5 - r.rating)}</span></strong>
                <span className={`status-pill status-${r.status}`}>{r.status === 'approved' ? 'Published' : r.status === 'rejected' ? 'Not approved' : 'Awaiting approval'}</span>
                {r.verified_purchase && <span className="status-pill status-verified">✓ Verified purchase</span>}
                <p>{formatOrderMonth(r.order_month) ? `Order: ${formatOrderMonth(r.order_month)}` : `Submitted ${new Date(r.created_at).toLocaleDateString()}`}</p>
              </div>
              <button type="button" className="outline-button" onClick={() => startEdit(r)} disabled={editingId === r.id}>
                {editingId === r.id ? 'Editing' : 'Edit'}
              </button>
            </div>
          ))}
        </div>
      )}

      <form className="review-form" onSubmit={submit} ref={formTop}>
        <div className="form-heading">
          <span className="section-kicker">{editingId ? 'EDIT YOUR REVIEW' : 'WRITE A REVIEW'}</span>
          <span className="required-note">* Required</span>
        </div>
        {me ? (
          <p className="guest-banner">
            {me.guest ? 'Posting as a guest' : 'Signed in as'}: <b>{me.email}</b> · <button type="button" className="text-button" onClick={signOut}>{me.guest ? 'Use a different email' : 'Sign out'}</button>
          </p>
        ) : (
          <div className="post-mode">
            <p className="post-mode-label">How would you like to post?</p>
            <div className="mode-toggle" role="tablist" aria-label="How would you like to post?">
              <button type="button" role="tab" aria-selected={mode === 'account'} className={mode === 'account' ? 'active' : ''} onClick={() => setMode('account')}>With an account</button>
              <button type="button" role="tab" aria-selected={mode === 'guest'} className={mode === 'guest' ? 'active' : ''} onClick={() => setMode('guest')}>As a guest</button>
            </div>
            {mode === 'account' ? (
              <div className="mode-panel">
                <p>Log in or create a free account. Photos and proof of purchase are optional. You can start writing below — your answers are saved on this device while you log in.</p>
                <div className="start-actions">
                  <Link className="button-primary" href={loginHref()}>Log in <span>↗</span></Link>
                  <Link className="outline-button" href={`/signup`}>Create account</Link>
                </div>
              </div>
            ) : (
              <div className="mode-panel">
                <p>No password needed — confirm your email with a one-click link. Guest reviews need <b>a photo</b>, which is shown publicly with your review, and <b>a proof of purchase</b>, which only PULP sees.</p>
                {guestSent ? (
                  <p className="guest-sent" role="status">Check <b>{guestEmail}</b> for a one-click link from PULP. It brings you back here with your answers saved. (Nothing arrived? Check spam, or <button type="button" className="text-button" onClick={() => setGuestSent(false)}>try again</button>.)</p>
                ) : (
                  <div className="guest-email-row">
                    <input type="email" placeholder="you@example.com" value={guestEmail} onChange={(e) => setGuestEmail(e.target.value)} aria-label="Your email"
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); if (guestEmail.includes('@')) sendGuestLink(); } }} />
                    <button type="button" className="button-primary" disabled={guestBusy || !guestEmail.includes('@')} onClick={sendGuestLink}>
                      {guestBusy ? 'Sending…' : 'Email me a link'}
                    </button>
                    {guestNotice && <p className="guest-error">{guestNotice}</p>}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {brandName && <h2 className="designer-subhead">{editingId ? `Update your ${brandName} review` : `Shopped with ${brandName}?`}</h2>}

        {brands && (
          <>
            <label htmlFor="brand-select">Which designer did you shop with? *</label>
            <select id="brand-select" required value={chosenId ?? ''} disabled={!!editingId}
              onChange={(e) => { setChosenId(e.target.value ? Number(e.target.value) : null); resetForm(); }}>
              <option value="">Select a designer</option>
              {brands.map((b) => <option key={b.id} value={b.id}>{b.Brand}</option>)}
            </select>
          </>
        )}

        <label>Overall experience *</label>
        <div className="stars" role="radiogroup" aria-label="Overall rating">
          {[1, 2, 3, 4, 5].map((n) => (
            <button type="button" key={n} role="radio" aria-checked={n === rating} className={n <= rating ? 'star active' : 'star'} onClick={() => setRating(n)} aria-label={`${n} stars`}>★</button>
          ))}
          <span>{['', 'Poor', 'Fair', 'Good', 'Very good', 'Excellent'][rating]}</span>
        </div>

        <div className="order-fields">
          <div>
            <label htmlFor="item-type">What did you order? *</label>
            <select id="item-type" required value={itemType} onChange={(e) => setItemType(e.target.value)}>
              <option value="">Select item type</option>
              {itemTypes.map((t) => <option key={t} value={t}>{t}</option>)}
              {itemType && !itemTypes.includes(itemType) && <option value={itemType}>{itemType}</option>}
            </select>
          </div>
          <div>
            <label htmlFor="shipped-to">Shipped to *</label>
            <select id="shipped-to" required value={shippedTo} onChange={(e) => setShippedTo(e.target.value)}>
              <option value="">Select country</option>
              {SHIP_COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="order-month">Order month *</label>
            <input id="order-month" type="month" required max={thisMonth()} value={orderMonth} onChange={(e) => setOrderMonth(e.target.value)} />
          </div>
        </div>

        <label htmlFor="review-text">Your review *</label>
        <textarea id="review-text" required minLength={20} maxLength={5000} rows={4} value={reviewText} onChange={(e) => setReviewText(e.target.value)} placeholder="Quality, fit, service, delivery — did it match the photos?" />

        <div className="photo-upload">
          <p>Photos {guestRules ? <>* <span>(at least 1, up to {MAX_PHOTOS})</span></> : <span>(optional, up to {MAX_PHOTOS})</span>}</p>
          <p className="photo-hint">What arrived — and, if you like, a screenshot of the listing. <b>Photos are shown publicly with your review.</b> JPG, PNG or WebP, up to 5 MB each.</p>
          <div className="photo-grid">
            {photos.map((p, i) => (
              <div className="photo-thumb" key={p.path ?? p.url}>
                {p.url && /* eslint-disable-next-line @next/next/no-img-element */ <img src={p.url} alt={`Photo ${i + 1}`} />}
                <button type="button" onClick={() => removePhoto(i)} aria-label={`Remove photo ${i + 1}`}>×</button>
              </div>
            ))}
            {photos.length < MAX_PHOTOS && (
              <button type="button" className="photo-add" disabled={!me} title={!me ? 'Log in or confirm your email first' : undefined} onClick={() => fileInput.current?.click()}>
                <span>+</span>Add photo
              </button>
            )}
          </div>
          {!me && <p className="upload-later">You can add photos once you’ve {mode === 'guest' ? 'confirmed your email' : 'logged in'}.</p>}
          <input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp" multiple hidden onChange={onPickFiles} />
        </div>

        {guestRules || showProof ? (
          <div className="proof-upload">
            <p>Proof of purchase {guestRules ? '*' : <span>(optional — earns a ✓ Verified purchase badge)</span>}</p>
            <p className="photo-hint">Order confirmation, receipt, or bank/PayPal statement line — JPG, PNG, WebP or PDF, up to 10 MB. <b>Only PULP sees this.</b> It’s never published and is deleted 30 days after your review is checked. Feel free to cover your card number and address.</p>
            <div className="proof-row">
              {proof ? (
                <span className="proof-file">📎 {proof.name} <button type="button" onClick={() => setProof(null)} aria-label="Remove proof of purchase">×</button></span>
              ) : (
                <button type="button" className="outline-button" disabled={!me} onClick={() => proofInput.current?.click()}>Add proof of purchase</button>
              )}
            </div>
            <input ref={proofInput} type="file" accept="image/jpeg,image/png,image/webp,application/pdf" hidden onChange={onPickProof} />
            <label htmlFor="order-ref" className="order-ref-label">Order number <span>(optional)</span></label>
            <input id="order-ref" type="text" maxLength={80} value={orderRef} onChange={(e) => setOrderRef(e.target.value)} placeholder="e.g. #10234" />
          </div>
        ) : (
          <button type="button" className="more-toggle" onClick={() => setShowProof(true)}>+ Add proof of purchase <span>(optional — earns a ✓ Verified purchase badge)</span></button>
        )}

        {showDetails ? (
          <div className="category-ratings">
            <p>Rate the details <span>(optional)</span></p>
            <div className="category-rating-grid">
              {reviewCategories.map((c) => (
                <label key={c}>
                  {c}
                  <select value={categoryRatings[c] || ''} onChange={(e) => setCategoryRatings((prev) => {
                    const next = { ...prev };
                    if (e.target.value) next[c] = Number(e.target.value); else delete next[c];
                    return next;
                  })}>
                    <option value="">—</option>
                    {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n} / 5</option>)}
                  </select>
                </label>
              ))}
            </div>
          </div>
        ) : (
          <button type="button" className="more-toggle" onClick={() => setShowDetails(true)}>+ Rate service, quality, delivery &amp; more <span>(optional)</span></button>
        )}

        <p className="form-privacy">Reviews and photos stay private until approved. By submitting, you agree to our <Link href="/guidelines">Review Guidelines</Link> and <Link href="/terms">Terms of Use</Link>.</p>
        <div className="form-actions">
          <button className="button-primary" type="submit" disabled={submitting}>
            {submitting ? 'Saving…' : editingId ? 'Save changes' : 'Submit for review'} <span>↗</span>
          </button>
          {editingId && <button type="button" className="outline-button" onClick={() => { resetForm(); setNotice(''); }}>Cancel</button>}
        </div>
        {notice && (
          <p className="notice" role="status">
            {notice} {needsLogin && <><Link href={loginHref()}>Log in</Link> or <Link href="/signup">sign up</Link>.</>}
          </p>
        )}
      </form>
    </div>
  );
}
