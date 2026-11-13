'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { designerHref } from '@/lib/designers';
import { PRICE_RANGES, RELATIONSHIPS, SHIPS_TO_OPTIONS } from '@/lib/review-options';

type Category = { id: number; name: string };
type BrandName = { id: number; Brand: string | null };
type Me = { id: string; confirmed: boolean } | null;

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '');

export function SuggestDesignerForm() {
  const [me, setMe] = useState<Me>(null);
  const [checkedAuth, setCheckedAuth] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<BrandName[]>([]);

  const [name, setName] = useState('');
  const [website, setWebsite] = useState('');
  const [instagram, setInstagram] = useState('');
  const [facebook, setFacebook] = useState('');
  const [categoryIds, setCategoryIds] = useState<number[]>([]);
  const [priceRange, setPriceRange] = useState('');
  const [shipsTo, setShipsTo] = useState<string[]>([]);
  const [relationship, setRelationship] = useState('');
  const [notes, setNotes] = useState('');
  const [email, setEmail] = useState('');
  const [company, setCompany] = useState(''); // hidden field; only bots fill it in

  const [notice, setNotice] = useState('');
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!supabase) { setCheckedAuth(true); return; }
    (async () => {
      const [{ data: auth }, { data: cats }, { data: names }] = await Promise.all([
        supabase!.auth.getUser(),
        supabase!.from('categories').select('id, name').order('sort_order'),
        supabase!.from('fashion_brands').select('id, Brand'),
      ]);
      const u = auth.user;
      setMe(u ? { id: u.id, confirmed: !!u.email_confirmed_at } : null);
      setCategories((cats || []) as Category[]);
      setBrands((names || []) as BrandName[]);
      setCheckedAuth(true);
    })();
  }, []);

  // Possible existing listings, so people don't suggest a designer we already have.
  const matches = useMemo(() => {
    const q = norm(name);
    if (q.length < 3) return [];
    return brands.filter((b) => b.Brand && (norm(b.Brand).includes(q) || q.includes(norm(b.Brand)))).slice(0, 4);
  }, [name, brands]);

  const toggle = <T,>(list: T[], value: T) => (list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setNotice('');
    if (!supabase) { setNotice('Suggestions are temporarily unavailable. Please try again later.'); return; }
    if (company) { setDone(true); return; } // spam bot: pretend it worked
    if (!website.trim() && !instagram.trim() && !facebook.trim()) { setNotice('Please add at least one link: website, Instagram or Facebook.'); return; }
    const contact = email.trim();
    if (contact && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact)) { setNotice('That email address doesn’t look right. Please check it, or leave it blank.'); return; }
    if (!relationship) { setNotice('Please tell us how you know this designer.'); return; }

    setSubmitting(true);
    const { error } = await supabase.from('designer_submissions').insert({
      submitted_by: me?.id ?? null,
      contact_email: me ? null : contact || null,
      brand_name: name.trim(),
      website: website.trim() || null,
      instagram: instagram.trim() || null,
      facebook: facebook.trim() || null,
      category_ids: categoryIds,
      price_range: priceRange || null,
      ships_to: shipsTo,
      relationship,
      notes: notes.trim() || null,
    });
    setSubmitting(false);
    if (error) { setNotice(error.message); return; }
    setDone(true);
  }

  if (!checkedAuth) return <p className="empty-state">Loading…</p>;

  if (done) {
    return (
      <div className="review-form suggest-gate">
        <span className="section-kicker">THANK YOU</span>
        <h2 className="designer-subhead">We’ve received your suggestion</h2>
        <p className="login-card-copy">We review every suggestion before it’s added to the directory. Once {name.trim()} is approved, you’ll be able to find and review them.</p>
        <div className="login-card-actions">
          <button type="button" className="outline-button" onClick={() => {
            setDone(false); setName(''); setWebsite(''); setInstagram(''); setFacebook('');
            setCategoryIds([]); setPriceRange(''); setShipsTo([]); setRelationship(''); setNotes(''); setEmail('');
          }}>Suggest another</button>
          <Link className="button-primary" href="/#designers">Back to the directory <span>↗</span></Link>
        </div>
      </div>
    );
  }

  return (
    <form className="review-form" onSubmit={submit}>
      <div className="form-heading">
        <span className="section-kicker">SUGGEST A DESIGNER</span>
        <span className="required-note">* Required fields</span>
      </div>

      <label htmlFor="sd-name">Designer or brand name *</label>
      <input id="sd-name" required minLength={2} maxLength={120} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Studio Name" />
      {matches.length > 0 && (
        <div className="suggest-matches">
          <p>Already listed? Check these first:</p>
          <ul>
            {matches.map((b) => <li key={b.id}><Link href={designerHref(b)}>{b.Brand} ↗</Link></li>)}
          </ul>
        </div>
      )}

      <p className="links-label">Link * <span className="label-optional">(at least one: website, Instagram or Facebook)</span></p>
      <div className="order-fields">
        <div>
          <label htmlFor="sd-website">Website</label>
          <input id="sd-website" value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="example.com" maxLength={300} />
        </div>
        <div>
          <label htmlFor="sd-instagram">Instagram</label>
          <input id="sd-instagram" value={instagram} onChange={(e) => setInstagram(e.target.value)} placeholder="@handle" maxLength={200} />
        </div>
        <div>
          <label htmlFor="sd-facebook">Facebook</label>
          <input id="sd-facebook" value={facebook} onChange={(e) => setFacebook(e.target.value)} placeholder="Page name or link" maxLength={300} />
        </div>
      </div>
      <p className="field-hint">We use it to confirm the designer before adding them.</p>

      <fieldset className="check-group">
        <legend>Categories <span>(optional, choose all that apply)</span></legend>
        <div className="check-grid">
          {categories.map((c) => (
            <label key={c.id} className={categoryIds.includes(c.id) ? 'checked' : ''}>
              <input type="checkbox" checked={categoryIds.includes(c.id)} onChange={() => setCategoryIds((cur) => toggle(cur, c.id))} />
              {c.name}
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="check-group">
        <legend>Ships to <span>(optional)</span></legend>
        <div className="check-grid">
          {SHIPS_TO_OPTIONS.map((c) => (
            <label key={c} className={shipsTo.includes(c) ? 'checked' : ''}>
              <input type="checkbox" checked={shipsTo.includes(c)} onChange={() => setShipsTo((cur) => toggle(cur, c))} />
              {c}
            </label>
          ))}
        </div>
      </fieldset>

      <label htmlFor="sd-price">Price range <span className="label-optional">(optional)</span></label>
      <select id="sd-price" value={priceRange} onChange={(e) => setPriceRange(e.target.value)}>
        <option value="">Not sure</option>
        {PRICE_RANGES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
      </select>

      <fieldset className="check-group">
        <legend>How do you know this designer? *</legend>
        <div className="radio-list">
          {RELATIONSHIPS.map((r) => (
            <label key={r.value} className={relationship === r.value ? 'checked' : ''}>
              <input type="radio" name="relationship" value={r.value} checked={relationship === r.value} onChange={() => setRelationship(r.value)} />
              {r.label}
            </label>
          ))}
        </div>
      </fieldset>

      <label htmlFor="sd-notes">Anything else we should know? <span className="label-optional">(optional)</span></label>
      <textarea id="sd-notes" rows={3} maxLength={1000} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. They mainly sell through WhatsApp, or they recently changed their name." />

      {!me && (
        <>
          <label htmlFor="sd-email">Your email <span className="label-optional">(optional)</span></label>
          <input id="sd-email" type="email" maxLength={200} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" />
          <p className="field-hint">Only if you’re happy for us to contact you with a question about this designer. We won’t add you to any mailing list.</p>
        </>
      )}
      <div className="hp-field" aria-hidden="true">
        <label htmlFor="sd-company">Company</label>
        <input id="sd-company" tabIndex={-1} autoComplete="off" value={company} onChange={(e) => setCompany(e.target.value)} />
      </div>

      <p className="form-privacy">Suggestions are reviewed before they appear. Brands can’t pay to be listed, and listing a designer doesn’t mean PULP endorses them.</p>
      <div className="form-actions">
        <button className="button-primary" type="submit" disabled={submitting}>{submitting ? 'Sending…' : 'Submit suggestion'} <span>↗</span></button>
      </div>
      {notice && <p className="notice" role="status">{notice}</p>}
    </form>
  );
}
