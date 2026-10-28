'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { reviewCategories } from '@/lib/designers';

export function DesignerReviewForm({ brandId, brandName }: { brandId: number; brandName: string }) {
  const [rating, setRating] = useState(5);
  const [reviewText, setReviewText] = useState('');
  const [categoryRatings, setCategoryRatings] = useState<Record<string, number>>({});
  const [websitePhoto, setWebsitePhoto] = useState('');
  const [receivedPhoto, setReceivedPhoto] = useState('');
  const [notice, setNotice] = useState('');
  const [needsLogin, setNeedsLogin] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function submitReview(event: FormEvent) {
    event.preventDefault();
    if (!supabase) { setNotice('Connect Supabase before submitting a review.'); return; }
    setSubmitting(true); setNotice(''); setNeedsLogin(false);
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      setNeedsLogin(true);
      setNotice('Please log in before submitting a review.');
      setSubmitting(false);
      return;
    }
    const { error } = await supabase.from('reviews').insert({
      brand_id: brandId, user_id: userData.user.id, rating, review_text: reviewText,
      category_ratings: categoryRatings, website_photo_url: websitePhoto || null,
      received_photo_url: receivedPhoto || null, status: 'pending',
    });
    if (error) setNotice(error.message);
    else {
      setNotice('Thank you! Your review has been submitted for moderation before it appears publicly.');
      setReviewText(''); setWebsitePhoto(''); setReceivedPhoto(''); setCategoryRatings({}); setRating(5);
    }
    setSubmitting(false);
  }

  return (
    <form className="review-form" onSubmit={submitReview}>
      <div className="form-heading">
        <span className="section-kicker">WRITE A REVIEW</span>
        <span className="required-note">* Required fields</span>
      </div>
      <h2 className="designer-subhead">Shopped with {brandName}?</h2>

      <label>Overall experience *</label>
      <div className="stars" role="radiogroup" aria-label="Overall rating">
        {[1, 2, 3, 4, 5].map((n) => (
          <button type="button" key={n} role="radio" aria-checked={n === rating} className={n <= rating ? 'star active' : 'star'} onClick={() => setRating(n)} aria-label={`${n} stars`}>★</button>
        ))}
        <span>{['', 'Poor', 'Fair', 'Good', 'Very good', 'Excellent'][rating]}</span>
      </div>

      <label htmlFor="review-text">Your review *</label>
      <textarea id="review-text" required minLength={20} rows={5} value={reviewText} onChange={(e) => setReviewText(e.target.value)} placeholder="Tell us about the quality, fit, service, delivery, and whether it matched the photos…" />

      <div className="category-ratings">
        <p>Rate the details <span>(optional)</span></p>
        <div className="category-rating-grid">
          {reviewCategories.map((c) => (
            <label key={c}>
              {c}
              <select value={categoryRatings[c] || ''} onChange={(e) => setCategoryRatings((prev) => ({ ...prev, [c]: Number(e.target.value) }))}>
                <option value="">—</option>
                {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n} / 5</option>)}
              </select>
            </label>
          ))}
        </div>
      </div>

      <div className="photo-fields">
        <div>
          <label htmlFor="website-photo">Website/product photo URL</label>
          <input id="website-photo" type="url" value={websitePhoto} onChange={(e) => setWebsitePhoto(e.target.value)} placeholder="https://…" />
        </div>
        <div>
          <label htmlFor="received-photo">What you received photo URL</label>
          <input id="received-photo" type="url" value={receivedPhoto} onChange={(e) => setReceivedPhoto(e.target.value)} placeholder="https://…" />
        </div>
      </div>

      <p className="form-privacy">Only submit photos and details you have permission to share. Your review will remain pending until it is approved.</p>
      <button className="button-primary" type="submit" disabled={submitting}>{submitting ? 'Submitting…' : 'Submit for review'} <span>↗</span></button>
      {notice && (
        <p className="notice" role="status">
          {notice} {needsLogin && <><Link href="/login">Log in</Link> or <Link href="/signup">sign up</Link>.</>}
        </p>
      )}
    </form>
  );
}
