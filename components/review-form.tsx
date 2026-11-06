'use client';

import { ChangeEvent, FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { REVIEW_SELECT, Review, reviewCategories } from '@/lib/designers';
import {
  ITEM_TYPES_FALLBACK, SHIP_COUNTRIES, PHOTO_BUCKET, MAX_PHOTOS, MAX_PHOTO_BYTES, PHOTO_TYPES, formatOrderMonth,
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
type Me = { id: string; email: string | null; confirmed: boolean } | null;

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

  const [notice, setNotice] = useState('');
  const [needsLogin, setNeedsLogin] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const formTop = useRef<HTMLFormElement>(null);

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
      setMe(u ? { id: u.id, email: u.email ?? null, confirmed: !!u.email_confirmed_at } : null);
    };
    read();
    const { data: sub } = supabase.auth.onAuthStateChange(() => { read(); });
    return () => sub.subscription.unsubscribe();
  }, []);

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
    if (fileInput.current) fileInput.current.value = '';
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
    if (!me) { setNeedsLogin(true); setNotice('Please log in before submitting a review.'); return; }
    if (!me.confirmed) { setNotice('Please confirm your email address first — check your inbox for the confirmation link.'); return; }
    if (!chosenId) { setNotice('Please choose the designer you shopped with.'); return; }
    if (orderMonth > thisMonth()) { setNotice('The order month can’t be in the future.'); return; }

    setSubmitting(true);
    const uploaded: string[] = [];
    try {
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
      };

      const { error } = editingId
        ? await supabase.from('reviews').update(fields).eq('id', editingId)
        : await supabase.from('reviews').insert({ ...fields, brand_id: chosenId, user_id: me.id, status: 'pending' });
      if (error) throw new Error(error.message);

      if (editingId && removedPaths.length) {
        await supabase.storage.from(PHOTO_BUCKET).remove(removedPaths);
      }
      setNotice(editingId
        ? 'Your changes are saved. The updated review will appear once it’s approved again.'
        : 'Thank you! Your review has been submitted and will appear once it’s approved.');
      resetForm();
      loadMine();
    } catch (err) {
      if (uploaded.length) await supabase.storage.from(PHOTO_BUCKET).remove(uploaded);
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
          <span className="required-note">* Required fields</span>
        </div>
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
        <textarea id="review-text" required minLength={20} maxLength={5000} rows={5} value={reviewText} onChange={(e) => setReviewText(e.target.value)} placeholder="Tell us about the quality, fit, service, delivery, and whether it matched the photos…" />

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

        <div className="photo-upload">
          <p>Photos <span>(optional, up to {MAX_PHOTOS})</span></p>
          <p className="photo-hint">Show what arrived — and, if you like, a screenshot of how it looked on the website. JPG, PNG or WebP, up to 5 MB each.</p>
          <div className="photo-grid">
            {photos.map((p, i) => (
              <div className="photo-thumb" key={p.path ?? p.url}>
                {p.url && /* eslint-disable-next-line @next/next/no-img-element */ <img src={p.url} alt={`Photo ${i + 1}`} />}
                <button type="button" onClick={() => removePhoto(i)} aria-label={`Remove photo ${i + 1}`}>×</button>
              </div>
            ))}
            {photos.length < MAX_PHOTOS && (
              <button type="button" className="photo-add" onClick={() => fileInput.current?.click()}>
                <span>+</span>Add photo
              </button>
            )}
          </div>
          <input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp" multiple hidden onChange={onPickFiles} />
        </div>

        <p className="form-privacy">Only submit photos and details you have permission to share. Reviews and photos stay private until they’re approved. By submitting, you agree to our <Link href="/guidelines">Review Guidelines</Link> and <Link href="/terms">Terms of Use</Link>.</p>
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
