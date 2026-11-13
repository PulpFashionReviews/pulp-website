import type { Metadata } from 'next';
import { LegalPage } from '@/components/legal-page';
import { CONTACT_EMAIL } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Privacy Policy — PULP',
  description: 'What information PULP collects, how it’s used, and the choices you have.',
};

export default function PrivacyPage() {
  return (
    <LegalPage
      kicker="PRIVACY POLICY"
      title="Privacy Policy"
      intro="This policy explains what information PULP collects when you visit the site or create an account, how we use it, who we share it with, and the choices you have. We collect only what we need to run a trustworthy review site, and we don’t sell your personal information."
    >
      <h2>What we collect</h2>
      <h3>When you create an account</h3>
      <ul>
        <li><strong>Your email address and password.</strong> Passwords are stored in encrypted (hashed) form by our authentication provider; we can’t see them. If you post as a <strong>guest</strong>, we only store your email address, which you confirm with a one-click link.</li>
        <li><strong>Account records</strong>, such as when you signed up, confirmed your email and last signed in.</li>
      </ul>
      <h3>When you write a review</h3>
      <ul>
        <li>The <strong>designer you reviewed</strong>, your <strong>ratings and written review</strong>, the <strong>item type, country it was shipped to and month you ordered</strong>, and any <strong>photos</strong> you upload.</li>
        <li>Photos are stored privately until your review is approved. Please don’t include personal details (like your address or order number) in photos or review text.</li>
        <li><strong>Proof of purchase</strong> (optional), such as an order confirmation, receipt or bank statement line, and an optional order number. Proof is <strong>never published</strong>: only you and PULP’s moderators can see it, and we use it only to check your review is based on a real order. You’re welcome to cover your card number and address before uploading.</li>
      </ul>
      <h3>When you browse</h3>
      <ul>
        <li>If you use our <strong>contact form</strong>, your name (optional), email address, topic and message. We store a copy so we can reply, and the form forwards it to our inbox by email.</li>
        <li>Like most websites, our hosting provider automatically records <strong>technical information</strong> such as your IP address, browser type, the pages you visit and the time of your visit, to keep the site secure and working.</li>
        <li>If you’re signed in, your browser stores a <strong>login session</strong> so you stay signed in. We don’t use advertising cookies.</li>
        <li>We count visits with <strong>Vercel Web Analytics</strong>, which doesn’t use cookies and doesn’t identify you. It records things like the page visited, the referring site, and your country and device type, so we can see how PULP is used.</li>
      </ul>

      <h2>What’s public</h2>
      <p>Once approved, your review — including ratings, text, item type, shipping country, order month and photos — is visible to anyone visiting PULP. <strong>Your email address, proof of purchase and order number are never shown publicly.</strong> If we verified your proof, your review shows a “Verified purchase” badge.</p>

      <h2>How we use your information</h2>
      <ul>
        <li>to create and secure your account, and confirm your email address;</li>
        <li>to publish, moderate and let you edit your reviews;</li>
        <li>to prevent fake reviews, spam and abuse (for example, limiting how often the same account can review a designer);</li>
        <li>to respond to your messages and send important notices about your account or these policies;</li>
        <li>to comply with legal obligations and respond to lawful requests.</li>
      </ul>
      <p>We don’t sell your personal information or share it for cross-context behavioural advertising.</p>

      <h2>Who we share it with</h2>
      <p>We use trusted service providers to run PULP. They process information on our behalf and only as needed to provide their service:</p>
      <ul>
        <li><strong>Supabase</strong> — account sign-in, sign-in emails, database, and photo and proof-of-purchase storage;</li>
        <li><strong>Vercel</strong> — website hosting and delivery;</li>
        <li><strong>FormSubmit</strong> — forwards contact-form messages to our email inbox.</li>
      </ul>
      <p>We may also share information if required by law, to protect the rights or safety of PULP, our users or others, or as part of a sale or reorganisation of PULP (in which case this policy would continue to apply to your information).</p>
      <p>Our providers may store and process data in the United States and other countries. Where required, we rely on appropriate safeguards for international transfers.</p>

      <h2>How long we keep it</h2>
      <p>We keep your account information for as long as your account is open. Reviews stay published until you or we remove them. Proof of purchase files are deleted 30 days after we approve or reject the review; we keep only whether the purchase was verified. When you delete your account, we delete or anonymise your personal information within a reasonable period, except where we need to keep certain records for legal, security or fraud-prevention reasons. Server logs are kept for a limited time by our hosting provider.</p>

      <h2>Your choices and rights</h2>
      <ul>
        <li>You can <strong>edit your reviews</strong> at any time from the designer’s page while signed in.</li>
        <li>You can ask us to <strong>access, correct, download or delete</strong> your personal information, or to delete your account and reviews, by emailing <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> from the address on your account.</li>
        <li>Depending on where you live (for example, California, the UK or the EU), you may have additional rights, such as objecting to certain uses of your information or complaining to your local data protection authority. We won’t discriminate against you for exercising your rights.</li>
      </ul>

      <h2>Children</h2>
      <p>PULP isn’t intended for anyone under 16, and we don’t knowingly collect personal information from children. If you believe a child has created an account, please contact us and we’ll delete it.</p>

      <h2>Security</h2>
      <p>We use industry-standard measures to protect your information, including encrypted connections, hashed passwords and access controls that keep unapproved photos private. No online service is completely secure, so please use a strong, unique password.</p>

      <h2>Changes to this policy</h2>
      <p>We’ll update this page if our practices change and revise the date at the top. If changes are significant, we’ll let account holders know.</p>

      <h2>Contact</h2>
      <p>For any privacy question or request, email <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.</p>
    </LegalPage>
  );
}
