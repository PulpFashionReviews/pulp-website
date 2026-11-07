'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export type Reply = { id: number; review_id: number; body: string; created_at: string; updated_at: string | null };

// One manager check per designer page, shared by every review on it.
const managerChecks = new Map<number, Promise<boolean>>();
function isManager(brandId: number) {
  if (!supabase) return Promise.resolve(false);
  if (!managerChecks.has(brandId)) {
    managerChecks.set(brandId, (async () => {
      const { data: u } = await supabase!.auth.getUser();
      if (!u.user) return false;
      const { data } = await supabase!.rpc('is_brand_manager', { p_brand_id: brandId });
      return data === true;
    })());
  }
  return managerChecks.get(brandId)!;
}

const fmt = (d: string) => new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

/** The designer's public reply under a review, plus reply/edit controls for the designer. */
export function DesignerReply({ reviewId, brandId, brandName, initial }: { reviewId: number; brandId: number; brandName: string; initial: Reply | null }) {
  const [reply, setReply] = useState<Reply | null>(initial);
  const [manager, setManager] = useState(false);
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(initial?.body ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { isManager(brandId).then(setManager); }, [brandId]);

  async function save() {
    if (!supabase) return;
    setBusy(true); setError('');
    const body = text.trim();
    const { data, error: err } = reply
      ? await supabase.from('review_replies').update({ body }).eq('id', reply.id).select('id, review_id, body, created_at, updated_at').single()
      : await supabase.from('review_replies').insert({ review_id: reviewId, brand_id: brandId, body }).select('id, review_id, body, created_at, updated_at').single();
    setBusy(false);
    if (err) { setError(err.message); return; }
    setReply(data as Reply); setEditing(false);
  }

  async function remove() {
    if (!supabase || !reply || !window.confirm('Delete your reply?')) return;
    setBusy(true);
    const { error: err } = await supabase.from('review_replies').delete().eq('id', reply.id);
    setBusy(false);
    if (err) { setError(err.message); return; }
    setReply(null); setText('');
  }

  if (editing) {
    return (
      <div className="designer-reply editing">
        <label htmlFor={`reply-${reviewId}`}>Your public reply as {brandName}</label>
        <textarea id={`reply-${reviewId}`} rows={4} maxLength={2000} value={text} onChange={(e) => setText(e.target.value)}
          placeholder="Thank the customer, or explain what happened and how you’re putting it right. Please don’t share their personal or order details." />
        <div className="reply-actions">
          <button type="button" className="button-primary" disabled={busy || text.trim().length < 2} onClick={save}>{busy ? 'Saving…' : 'Post reply'}</button>
          <button type="button" className="outline-button" onClick={() => { setEditing(false); setText(reply?.body ?? ''); setError(''); }}>Cancel</button>
        </div>
        <p className="reply-note">Replies appear publicly under the review and must follow our Review Guidelines.</p>
        {error && <p className="notice">{error}</p>}
      </div>
    );
  }

  return (
    <>
      {reply && (
        <div className="designer-reply">
          <p className="reply-head"><b>Response from {brandName}</b> · {fmt(reply.created_at)}{reply.updated_at ? ' · edited' : ''}</p>
          <p className="reply-body">{reply.body}</p>
        </div>
      )}
      {manager && (
        <div className="reply-controls">
          <button type="button" className="text-button" onClick={() => setEditing(true)}>{reply ? 'Edit your reply' : 'Reply publicly'}</button>
          {reply && <button type="button" className="text-button" onClick={remove} disabled={busy}>Delete reply</button>}
          {error && <span className="reply-error">{error}</span>}
        </div>
      )}
    </>
  );
}
