'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { designerHref, reviewCategories } from '@/lib/designers';
import { PHOTO_BUCKET, RELATIONSHIPS, formatOrderMonth, instagramUrl, facebookUrl, priceSymbol } from '@/lib/review-options';
import { FilterDropdown } from '@/components/filter-dropdown';

type Status = 'pending' | 'approved' | 'rejected';
type QueueReview = {
  id: number; brand_id: number; brand_name: string | null; rating: number; review_text: string;
  item_type: string | null; shipped_to: string | null; order_month: string | null;
  category_ratings: Record<string, number> | null; photo_paths: string[] | null;
  created_at: string; updated_at: string | null; status: Status;
  reviewer_email: string | null; reviewer_review_count: number;
};
type QueueSubmission = {
  id: number; created_at: string; brand_name: string; website: string | null; instagram: string | null;
  facebook: string | null; categories: string | null; price_range: string | null; ships_to: string[] | null;
  relationship: string; notes: string | null; status: Status; submitter_email: string | null;
  approved_brand_id: number | null; similar_existing: string | null;
};

const STATUS_OPTIONS = [
  { value: 'pending', label: 'Waiting for review' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
];
const fmt = (d: string) => new Date(d).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
const relLabel = (v: string) => RELATIONSHIPS.find((r) => r.value === v)?.label ?? v;
const withHttp = (v: string) => (/^https?:\/\//i.test(v.trim()) ? v.trim() : `https://${v.trim().replace(/^https?:\s*\/*/i, '')}`);

export function AdminDashboard() {
  const [access, setAccess] = useState<'checking' | 'denied' | 'ok'>('checking');
  const [tab, setTab] = useState<'reviews' | 'suggestions'>('reviews');
  const [status, setStatus] = useState<Status>('pending');
  const [reviews, setReviews] = useState<QueueReview[]>([]);
  const [subs, setSubs] = useState<QueueSubmission[]>([]);
  const [counts, setCounts] = useState({ reviews: 0, suggestions: 0 });
  const [photoUrls, setPhotoUrls] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!supabase) { setAccess('denied'); return; }
    supabase.rpc('is_admin').then(({ data, error }) => setAccess(!error && data === true ? 'ok' : 'denied'));
  }, []);

  const loadCounts = useCallback(async () => {
    if (!supabase) return;
    const [r, s] = await Promise.all([
      supabase.rpc('admin_review_queue', { p_status: 'pending' }),
      supabase.rpc('admin_submission_queue', { p_status: 'pending' }),
    ]);
    setCounts({ reviews: (r.data || []).length, suggestions: (s.data || []).length });
  }, []);

  const load = useCallback(async () => {
    if (!supabase) return;
    setMessage('');
    if (tab === 'reviews') {
      const { data, error } = await supabase.rpc('admin_review_queue', { p_status: status });
      if (error) { setMessage(error.message); return; }
      const rows = (data || []) as QueueReview[];
      setReviews(rows);
      const paths = rows.flatMap((r) => r.photo_paths ?? []);
      if (paths.length) {
        const { data: signed } = await supabase.storage.from(PHOTO_BUCKET).createSignedUrls(paths, 3600);
        const map: Record<string, string> = {};
        (signed || []).forEach((s, i) => { if (s.signedUrl) map[paths[i]] = s.signedUrl; });
        setPhotoUrls(map);
      }
    } else {
      const { data, error } = await supabase.rpc('admin_submission_queue', { p_status: status });
      if (error) { setMessage(error.message); return; }
      setSubs((data || []) as QueueSubmission[]);
    }
  }, [tab, status]);

  useEffect(() => { if (access === 'ok') { load(); loadCounts(); } }, [access, load, loadCounts]);

  async function decideReview(r: QueueReview, next: Status) {
    if (!supabase) return;
    setBusy(`r${r.id}`);
    const { error } = await supabase.rpc('admin_set_review_status', { p_id: r.id, p_status: next });
    setBusy(null);
    if (error) { setMessage(error.message); return; }
    setReviews((cur) => cur.filter((x) => x.id !== r.id));
    setMessage(next === 'approved'
      ? `Approved — it will appear on ${r.brand_name}'s page within about a minute.`
      : next === 'rejected' ? 'Review rejected. It stays private.' : 'Moved back to waiting.');
    loadCounts();
  }

  async function decideSubmission(s: QueueSubmission, approve: boolean) {
    if (!supabase) return;
    if (approve && s.similar_existing && !window.confirm(`A designer called "${s.similar_existing}" is already listed. Add "${s.brand_name}" anyway?`)) return;
    setBusy(`s${s.id}`);
    const { error } = approve
      ? await supabase.rpc('admin_approve_submission', { p_id: s.id })
      : await supabase.rpc('admin_reject_submission', { p_id: s.id });
    setBusy(null);
    if (error) { setMessage(error.message); return; }
    setSubs((cur) => cur.filter((x) => x.id !== s.id));
    setMessage(approve ? `${s.brand_name} has been added to the directory.` : 'Suggestion rejected.');
    loadCounts();
  }

  if (access === 'checking') return <p className="empty-state">Loading…</p>;
  if (access === 'denied') {
    return (
      <div className="admin-denied">
        <h1>Page not found</h1>
        <p>The page you’re looking for doesn’t exist. <Link href="/">Back to PULP</Link></p>
      </div>
    );
  }

  return (
    <div className="admin">
      <div className="admin-head">
        <div>
          <span className="section-kicker">ADMIN</span>
          <h1>Moderation</h1>
        </div>
        <div className="admin-counts">
          <div><strong>{counts.reviews}</strong><span>reviews waiting</span></div>
          <div><strong>{counts.suggestions}</strong><span>suggestions waiting</span></div>
        </div>
      </div>

      <div className="admin-toolbar">
        <div className="admin-tabs" role="tablist">
          <button role="tab" aria-selected={tab === 'reviews'} className={tab === 'reviews' ? 'active' : ''} onClick={() => setTab('reviews')}>
            Reviews {counts.reviews > 0 && <span>{counts.reviews}</span>}
          </button>
          <button role="tab" aria-selected={tab === 'suggestions'} className={tab === 'suggestions' ? 'active' : ''} onClick={() => setTab('suggestions')}>
            Designer suggestions {counts.suggestions > 0 && <span>{counts.suggestions}</span>}
          </button>
        </div>
        <FilterDropdown label="Status" className="fdrop-sort" options={STATUS_OPTIONS} value={status} onChange={(v) => setStatus(v as Status)} />
      </div>

      {message && <p className="notice admin-notice" role="status">{message}</p>}

      {tab === 'reviews' && (
        reviews.length === 0 ? <p className="empty-state">Nothing here. {status === 'pending' && 'You’re all caught up.'}</p> : (
          <div className="admin-list">
            {reviews.map((r) => {
              const edited = r.updated_at && new Date(r.updated_at).getTime() - new Date(r.created_at).getTime() > 60_000;
              const details = reviewCategories.filter((c) => r.category_ratings?.[c]);
              return (
                <article className="admin-card" key={r.id}>
                  <div className="admin-card-top">
                    <div>
                      <Link href={designerHref({ id: r.brand_id, Brand: r.brand_name })} target="_blank" className="admin-brand">{r.brand_name} ↗</Link>
                      <p className="admin-meta">
                        {r.reviewer_email ?? 'Unknown reviewer'} · {r.reviewer_review_count} {r.reviewer_review_count === 1 ? 'review' : 'reviews'} total · submitted {fmt(r.created_at)}
                      </p>
                    </div>
                    {edited && <span className="status-pill">Edited {fmt(r.updated_at!)}</span>}
                  </div>
                  <p className="admin-stars">{'★'.repeat(r.rating)}<span className="muted-stars">{'★'.repeat(5 - r.rating)}</span></p>
                  <p className="review-facts">
                    {[r.item_type, r.shipped_to && `Shipped to ${r.shipped_to}`, formatOrderMonth(r.order_month) && `Ordered ${formatOrderMonth(r.order_month)}`].filter(Boolean).join(' · ')}
                  </p>
                  <p className="admin-text">{r.review_text}</p>
                  {details.length > 0 && (
                    <p className="admin-details">{details.map((c) => `${c}: ${r.category_ratings![c]}/5`).join(' · ')}</p>
                  )}
                  {(r.photo_paths ?? []).length > 0 && (
                    <div className="review-photos">
                      {(r.photo_paths ?? []).map((p, i) => photoUrls[p] && (
                        <a key={p} href={photoUrls[p]} target="_blank" rel="noreferrer">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={photoUrls[p]} alt={`Photo ${i + 1}`} />
                        </a>
                      ))}
                    </div>
                  )}
                  <div className="admin-actions">
                    {r.status !== 'approved' && <button className="button-primary" disabled={busy === `r${r.id}`} onClick={() => decideReview(r, 'approved')}>Approve <span>✓</span></button>}
                    {r.status !== 'rejected' && <button className="outline-button" disabled={busy === `r${r.id}`} onClick={() => decideReview(r, 'rejected')}>{r.status === 'approved' ? 'Unpublish' : 'Reject'}</button>}
                    {r.status !== 'pending' && <button className="admin-link" disabled={busy === `r${r.id}`} onClick={() => decideReview(r, 'pending')}>Move back to waiting</button>}
                    {r.reviewer_email && <a className="admin-link" href={`mailto:${r.reviewer_email}?subject=${encodeURIComponent(`Your PULP review of ${r.brand_name}`)}`}>Email reviewer</a>}
                  </div>
                </article>
              );
            })}
          </div>
        )
      )}

      {tab === 'suggestions' && (
        subs.length === 0 ? <p className="empty-state">Nothing here. {status === 'pending' && 'You’re all caught up.'}</p> : (
          <div className="admin-list">
            {subs.map((s) => (
              <article className="admin-card" key={s.id}>
                <div className="admin-card-top">
                  <div>
                    <p className="admin-brand">{s.brand_name}</p>
                    <p className="admin-meta">{s.submitter_email ?? 'Unknown'} · {relLabel(s.relationship)} · {fmt(s.created_at)}</p>
                  </div>
                  {s.similar_existing && <span className="status-pill status-rejected">Possible duplicate: {s.similar_existing}</span>}
                </div>
                <dl className="admin-fields">
                  <dt>Links</dt>
                  <dd className="admin-links">
                    {s.website && <a href={withHttp(s.website)} target="_blank" rel="noreferrer">Website ↗</a>}
                    {s.instagram && <a href={instagramUrl(s.instagram)} target="_blank" rel="noreferrer">Instagram ↗</a>}
                    {s.facebook && <a href={facebookUrl(s.facebook)} target="_blank" rel="noreferrer">Facebook ↗</a>}
                  </dd>
                  <dt>Categories</dt><dd>{s.categories || '—'}</dd>
                  <dt>Ships to</dt><dd>{s.ships_to?.length ? s.ships_to.join(', ') : '—'}</dd>
                  <dt>Price range</dt><dd>{priceSymbol(s.price_range) || '—'}</dd>
                  {s.notes && <><dt>Notes</dt><dd>{s.notes}</dd></>}
                </dl>
                <div className="admin-actions">
                  {s.status === 'pending' && <>
                    <button className="button-primary" disabled={busy === `s${s.id}`} onClick={() => decideSubmission(s, true)}>Approve &amp; add to directory <span>✓</span></button>
                    <button className="outline-button" disabled={busy === `s${s.id}`} onClick={() => decideSubmission(s, false)}>Reject</button>
                  </>}
                  {s.status === 'approved' && s.approved_brand_id && (
                    <Link className="admin-link" href={designerHref({ id: s.approved_brand_id, Brand: s.brand_name })} target="_blank">View listing ↗</Link>
                  )}
                  {s.submitter_email && <a className="admin-link" href={`mailto:${s.submitter_email}?subject=${encodeURIComponent(`Your PULP suggestion: ${s.brand_name}`)}`}>Email submitter</a>}
                </div>
              </article>
            ))}
          </div>
        )
      )}
    </div>
  );
}
