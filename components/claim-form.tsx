'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { designerHref } from '@/lib/designers';
import { CONTACT_EMAIL } from '@/lib/site';

type BrandOption = { id: number; Brand: string | null; claimed_at: string | null };
type Claim = { id: number; brand_id: number; status: string; created_at: string };
type Me = { id: string; email: string | null; guest: boolean } | null;

const ROLES = [
  { value: 'owner', label: 'Owner or founder' },
  { value: 'staff', label: 'I work for the brand' },
  { value: 'agency', label: 'Marketing agency / representative' },
];

export function ClaimForm() {
  const params = useSearchParams();
  const [me, setMe] = useState<Me | undefined>(undefined);
  const [brands, setBrands] = useState<BrandOption[]>([]);
  const [brandId, setBrandId] = useState<number | null>(Number(params.get('designer')) || null);
  const [claims, setClaims] = useState<Claim[]>([]);
  const [managed, setManaged] = useState<number[]>([]);
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [businessEmail, setBusinessEmail] = useState('');
  const [instagram, setInstagram] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    if (!supabase) { setMe(null); return; }
    supabase.from('fashion_brands').select('id, Brand, claimed_at').order('Brand').then(({ data }) => setBrands((data || []) as BrandOption[]));
    (async () => {
      const { data } = await supabase!.auth.getUser();
      const u = data.user;
      if (!u) { setMe(null); return; }
      const { data: guest } = await supabase!.rpc('current_user_is_guest');
      setMe({ id: u.id, email: u.email ?? null, guest: guest === true });
      const [c, m] = await Promise.all([
        supabase!.from('designer_claims').select('id, brand_id, status, created_at').order('created_at', { ascending: false }),
        supabase!.from('brand_managers').select('brand_id'),
      ]);
      setClaims((c.data || []) as Claim[]);
      setManaged(((m.data || []) as { brand_id: number }[]).map((x) => x.brand_id));
    })();
  }, []);

  const brand = brands.find((b) => b.id === brandId) ?? null;
  const myClaim = claims.find((c) => c.brand_id === brandId);
  const back = `/claim${brandId ? `?designer=${brandId}` : ''}`;

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!supabase || !me || !brandId) return;
    if (!businessEmail.trim() && !instagram.trim()) {
      setNotice('Please give a business email or your official Instagram so we can verify you.');
      return;
    }
    setBusy(true); setNotice('');
    const { data, error } = await supabase.from('designer_claims').insert({
      brand_id: brandId, contact_name: name.trim(), role,
      business_email: businessEmail.trim() || null, instagram: instagram.trim() || null, note: note.trim() || null,
    }).select('id, brand_id, status, created_at').single();
    setBusy(false);
    if (error) {
      setNotice(error.code === '23505' ? 'You already have a claim waiting for this designer.' : error.message);
      return;
    }
    setClaims((cur) => [data as Claim, ...cur]);
  }

  if (me === undefined) return <p className="empty-state">Loading…</p>;

  return (
    <div className="review-form claim-form">
      <label htmlFor="claim-brand">Which designer are you? *</label>
      <select id="claim-brand" value={brandId ?? ''} onChange={(e) => { setBrandId(e.target.value ? Number(e.target.value) : null); setNotice(''); }}>
        <option value="">Select your brand</option>
        {brands.map((b) => <option key={b.id} value={b.id}>{b.Brand}</option>)}
      </select>
      <p className="claim-hint">Not listed? <Link href="/suggest-designer">Suggest your brand</Link> first.</p>

      {!me ? (
        <div className="claim-box">
          <p>To claim a page, log in or create a free account with the email you’ll use to manage it.</p>
          <div className="start-actions">
            <Link className="button-primary" href={`/login?next=${encodeURIComponent(back)}`}>Log in <span>↗</span></Link>
            <Link className="outline-button" href="/signup">Create account</Link>
          </div>
        </div>
      ) : me.guest ? (
        <div className="claim-box">
          <p>You’re signed in as a guest ({me.email}). Designer pages need a full account with a password — please <Link href="/signup">create an account</Link>.</p>
        </div>
      ) : brandId && managed.includes(brandId) ? (
        <div className="claim-box claim-ok">
          <p><b>You manage this page.</b> Open it to add your logo and reply to reviews — you’ll see “Upload logo” at the top and a “Reply publicly” button under each review.</p>
          {brand && <Link className="button-primary" href={designerHref(brand)}>Go to {brand.Brand} <span>↗</span></Link>}
        </div>
      ) : myClaim?.status === 'pending' ? (
        <div className="claim-box">
          <p><b>Thanks — your claim is waiting for review.</b> We’ll email {me.email} once it’s approved, usually within a few days. If we need more proof, we’ll get in touch.</p>
        </div>
      ) : (
        <form onSubmit={submit} className="claim-fields">
          {myClaim?.status === 'rejected' && <p className="notice">We couldn’t verify your last claim. You can try again with more detail, or email <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.</p>}
          {brand?.claimed_at && <p className="notice">This page has already been claimed. If you also work for the brand, submit a claim and we’ll check with the current manager.</p>}
          <label htmlFor="claim-name">Your name *</label>
          <input id="claim-name" required minLength={2} maxLength={100} value={name} onChange={(e) => setName(e.target.value)} />
          <label htmlFor="claim-role">Your role *</label>
          <select id="claim-role" required value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="">Select</option>
            {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
          <label htmlFor="claim-email">Business email <span className="label-optional">(on your brand’s website domain, if you have one)</span></label>
          <input id="claim-email" type="email" maxLength={200} value={businessEmail} onChange={(e) => setBusinessEmail(e.target.value)} placeholder="name@yourbrand.com" />
          <label htmlFor="claim-ig">Official Instagram <span className="label-optional">(if you don’t have a business email)</span></label>
          <input id="claim-ig" maxLength={200} value={instagram} onChange={(e) => setInstagram(e.target.value)} placeholder="@yourbrand" />
          <label htmlFor="claim-note">Anything else that helps us verify you <span className="label-optional">(optional)</span></label>
          <textarea id="claim-note" rows={3} maxLength={1000} value={note} onChange={(e) => setNote(e.target.value)} />
          <p className="form-privacy">We’ll only use these details to verify your claim. Signed in as {me.email}.</p>
          <button className="button-primary" type="submit" disabled={busy || !brandId}>{busy ? 'Sending…' : 'Submit claim'} <span>↗</span></button>
          {notice && <p className="notice" role="status">{notice}</p>}
        </form>
      )}
    </div>
  );
}
