import type { Metadata } from 'next';
import Link from 'next/link';
import { LegalPage } from '@/components/legal-page';
import { CONTACT_EMAIL } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Review Guidelines — PULP',
  description: 'How to write a helpful, honest review on PULP, and what we do and don’t publish.',
};

export default function GuidelinesPage() {
  return (
    <LegalPage
      kicker="REVIEW GUIDELINES"
      title="How to write a great review"
      intro="PULP works because shoppers trust what they read here. These guidelines keep reviews honest, useful and fair — to other shoppers and to the designers being reviewed. Every review is checked against them before it’s published."
    >
      <h2>Share your own experience</h2>
      <ul>
        <li><strong>Only review orders you placed yourself</strong> (or received as a gift you can speak to first-hand). Don’t post on behalf of someone else.</li>
        <li><strong>One review per order.</strong> If you’ve ordered from the same designer again, you’re welcome to review the new order — reviews for the same designer are limited to one every 30 days. If something changes about an existing order (a refund came through, a problem was fixed), edit that review instead.</li>
        <li><strong>Be specific.</strong> The most helpful reviews cover fabric and stitching quality, fit and sizing, how closely the item matched the photos, delivery time and import duties, and how the designer handled questions or problems.</li>
        <li><strong>Good and bad are both welcome.</strong> We publish positive, mixed and negative reviews. We never remove a review just because it’s critical.</li>
      </ul>

      <h2>Photos</h2>
      <ul>
        <li>Upload photos <strong>you took yourself</strong> of what you received. A screenshot of the listing you ordered from is fine for comparison.</li>
        <li>Don’t upload photos that show other people without their permission, or that include personal details such as your address, order number, phone number or payment information.</li>
        <li>No nudity, no unrelated images, and no photos copied from other websites or social media accounts.</li>
      </ul>

      <h2>Guest reviews, photos and proof of purchase</h2>
      <ul>
        <li>You don’t need an account to post. As a <strong>guest</strong>, you just confirm your email with a one-click link.</li>
        <li><strong>Photos are optional</strong> for everyone — a rating and written review are enough. Photos of what you received are very helpful, and they’re shown publicly with your review.</li>
        <li><strong>Proof of purchase is always optional</strong> — an order confirmation, receipt, or the line from your bank or PayPal statement. If you add it and we can match it to the designer and your order, your review gets a <strong>✓ Verified purchase</strong> badge.</li>
        <li>Proof is <strong>only seen by PULP</strong>, never published, and deleted 30 days after your review is checked. Cover your card number and address if you like — we just need the designer, date and amount.</li>
        <li>Each order number can be used for one review per designer. Edited or fake proof means the review won’t be published.</li>
      </ul>

      <h2>Keep it fair and factual</h2>
      <ul>
        <li><strong>Describe what happened rather than making accusations.</strong> “The suit was advertised as an original but the fabric label and embroidery didn’t match the brand’s own photos” is helpful. Calling a business “criminals” or “fraudsters” isn’t, and we’ll ask you to rephrase.</li>
        <li>Stick to the products and service. Don’t attack individuals — including the designer, their staff or other reviewers.</li>
        <li>No hate speech, threats, harassment, profanity aimed at people, or discriminatory language.</li>
        <li>Don’t share anyone’s personal information, including the designer’s staff or delivery drivers.</li>
      </ul>

      <h2>Conflicts of interest</h2>
      <ul>
        <li><strong>Don’t review a designer you own, work for, or are paid to promote</strong> — or a direct competitor.</li>
        <li>If you received the item free, at a discount, or in exchange for your review, say so clearly in your review.</li>
        <li>Designers and their representatives may not offer refunds, gifts or discounts in exchange for writing, changing or removing a review. Please tell us if this happens to you.</li>
      </ul>

      <h2>What we don’t publish</h2>
      <p>We may decline or remove reviews that break these guidelines or our <Link href="/terms">Terms of Use</Link>, including reviews that:</p>
      <ul>
        <li>aren’t based on a real order, or appear to be fake, duplicated or coordinated;</li>
        <li>are mainly about something other than the shopping experience (such as politics or a designer’s personal life);</li>
        <li>contain personal information, private messages shared without consent, or links to other websites;</li>
        <li>advertise products or services, or ask other shoppers to contact you;</li>
        <li>may be unlawful, including content that infringes someone else’s rights.</li>
      </ul>
      <p>Where we can, we’ll let you know why a review wasn’t approved so you can edit it.</p>

      <h2>For designers</h2>
      <ul>
        <li>PULP is independent. Designers can’t pay to have reviews removed, hidden or reordered.</li>
        <li><strong>Claim your page for free</strong> on our <Link href="/claim">For designers</Link> page. Once we’ve verified you, you can add your logo and reply publicly to any review of your brand — both are free.</li>
        <li>Keep replies professional: thank customers, explain what happened, and say how you’re putting things right. Don’t share a customer’s personal or order details, make threats, or attack the reviewer. We may hide replies that break these guidelines.</li>
        <li>If you believe a review breaks these guidelines — for example, it isn’t from a real customer or contains false statements of fact — email us at <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> with the designer name, the review, and what you believe is wrong. We’ll look into it and may contact the reviewer.</li>
        <li>Please don’t contact reviewers to pressure them to change or remove a review.</li>
      </ul>

      <h2>Reporting a problem</h2>
      <p>If you see a review that you think breaks these guidelines, email <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> with a link to the designer’s page and a short description. Thank you for helping keep PULP useful.</p>
    </LegalPage>
  );
}
