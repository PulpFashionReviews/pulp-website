'use client';

import { FormEvent, useRef, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { CONTACT_EMAIL } from '@/lib/site';

const TOPICS = [
  { value: 'question', label: 'A question' },
  { value: 'feedback', label: 'Feedback or an idea' },
  { value: 'review', label: 'A problem with a review' },
  { value: 'designer', label: 'I represent a designer' },
  { value: 'press', label: 'Press or partnership' },
  { value: 'other', label: 'Something else' },
];

// Forwards each message to the PULP inbox (FormSubmit relays it by email).
const FORWARD_URL = `https://formsubmit.co/ajax/${CONTACT_EMAIL}`;

export function ContactForm() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [topic, setTopic] = useState('');
  const [message, setMessage] = useState('');
  const [honey, setHoney] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const openedAt = useRef(Date.now());

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (honey) { setSent(true); return; } // bots fill the hidden field
    if (Date.now() - openedAt.current < 3000) { setSent(true); return; } // and submit within seconds
    setBusy(true); setError('');
    const topicLabel = TOPICS.find((t) => t.value === topic)?.label ?? topic;
    const payload = { name: name.trim() || null, email: email.trim(), topic, message: message.trim() };

    // 1) Keep a copy in PULP's admin inbox. 2) Email it to the PULP address.
    const saved = supabase ? await supabase.from('contact_messages').insert(payload) : { error: { message: 'offline', code: '' } };
    // Our own sending limits (too many messages in an hour): stop here and say so.
    if (saved.error && 'code' in saved.error && saved.error.code === 'P0001') {
      setBusy(false);
      setError(saved.error.message);
      return;
    }
    let emailed = false;
    try {
      const res = await fetch(FORWARD_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          _subject: `PULP contact: ${topicLabel}`,
          _replyto: payload.email,
          _template: 'table',
          _captcha: 'false',
          _honey: '',
          Name: payload.name ?? '—',
          Email: payload.email,
          Topic: topicLabel,
          Message: payload.message,
        }),
      });
      emailed = res.ok;
    } catch { /* fall through */ }
    setBusy(false);

    if (saved.error && !emailed) {
      setError(`Sorry, your message couldn’t be sent. Please email us directly at ${CONTACT_EMAIL}.`);
      return;
    }
    setSent(true);
  }

  if (sent) {
    return (
      <div className="review-form contact-sent" role="status">
        <span className="section-kicker">MESSAGE SENT</span>
        <h2>Thank you{name.trim() ? `, ${name.trim().split(' ')[0]}` : ''}.</h2>
        <p>Your message is on its way to the PULP team. We’ll reply to <b>{email}</b>, usually within a few days.</p>
        <Link className="outline-button" href="/">Back to PULP</Link>
      </div>
    );
  }

  return (
    <form className="review-form contact-form" onSubmit={submit}>
      <span className="section-kicker">SEND A MESSAGE</span>
      <label htmlFor="c-name">Your name <span className="label-optional">(optional)</span></label>
      <input id="c-name" maxLength={100} value={name} onChange={(e) => setName(e.target.value)} />
      <label htmlFor="c-email">Your email *</label>
      <input id="c-email" type="email" required maxLength={200} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="So we can reply" />
      <label htmlFor="c-topic">What’s it about? *</label>
      <select id="c-topic" required value={topic} onChange={(e) => setTopic(e.target.value)}>
        <option value="">Choose a topic</option>
        {TOPICS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
      </select>
      <label htmlFor="c-message">Your message *</label>
      <textarea id="c-message" required minLength={10} maxLength={5000} rows={6} value={message} onChange={(e) => setMessage(e.target.value)}
        placeholder={topic === 'review' ? 'Which designer and review is it about, and what’s the problem?' : 'How can we help?'} />
      <input className="hp-field" tabIndex={-1} autoComplete="off" aria-hidden="true" value={honey} onChange={(e) => setHoney(e.target.value)} name="website" />
      <p className="form-privacy">We’ll only use your details to reply. See our <Link href="/privacy">Privacy Policy</Link>.</p>
      <button className="button-primary" type="submit" disabled={busy}>{busy ? 'Sending…' : 'Send message'} <span>↗</span></button>
      {error && <p className="notice" role="alert">{error}</p>}
    </form>
  );
}
