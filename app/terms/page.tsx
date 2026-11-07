import type { Metadata } from 'next';
import Link from 'next/link';
import { LegalPage } from '@/components/legal-page';
import { CONTACT_EMAIL } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Terms of Use — PULP',
  description: 'The terms that apply when you use PULP or post a review.',
};

export default function TermsPage() {
  return (
    <LegalPage
      kicker="TERMS OF USE"
      title="Terms of Use"
      intro="These terms apply to anyone who visits PULP or creates an account. By using the site, you agree to them. If you don’t agree, please don’t use PULP."
    >
      <h2>1. About PULP</h2>
      <p>PULP is an independent directory where shoppers share reviews and photos of their experiences buying from Pakistani and South Asian fashion designers and sellers. PULP is not affiliated with, endorsed by, or sponsored by any designer listed, and we don’t sell any of the products reviewed here.</p>

      <h2>2. Who can use PULP</h2>
      <p>You must be at least 16 years old to create an account or post a review. By creating an account you confirm that the information you give us is accurate and that you’ll keep your password secure. You’re responsible for activity on your account. Tell us promptly at <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> if you think someone else has accessed it.</p>

      <h2>3. Your reviews and photos</h2>
      <p>You keep ownership of the reviews, ratings and photos you post (“your content”). By posting, you give PULP a worldwide, non-exclusive, royalty-free licence to host, store, display, reproduce, adapt (for example, resizing photos) and distribute your content on PULP and in materials that promote PULP, for as long as it’s on the site. This licence ends when your content is removed, except for copies we must keep for legal reasons or that others have already shared.</p>
      <p>When you post, you confirm that:</p>
      <ul>
        <li>your content reflects your own genuine experience and follows our <Link href="/guidelines">Review Guidelines</Link>;</li>
        <li>you took the photos yourself or have the right to share them, and they don’t show anyone who hasn’t agreed to appear;</li>
        <li>your content doesn’t contain false statements of fact, and doesn’t infringe anyone’s copyright, trademark, privacy or other rights.</li>
      </ul>
      <p>You’re responsible for what you post. The views in reviews are those of the reviewer, not PULP.</p>

      <h2>4. Moderation</h2>
      <p>Reviews and photos are checked before they’re published, and edited reviews are checked again. We may decline, remove or edit content (for example, to remove personal information) that we believe breaks these terms or our guidelines, or that we’re required to remove by law. We don’t remove reviews simply because they’re negative, and designers can’t pay to have reviews removed. We may suspend or close accounts that repeatedly break these terms.</p>

      <h2>5. Acceptable use</h2>
      <p>Please don’t:</p>
      <ul>
        <li>post fake, paid-for or misleading reviews, or review a business you own, work for, or compete with;</li>
        <li>harass, threaten or impersonate anyone;</li>
        <li>copy, scrape or bulk-download content from PULP without our written permission;</li>
        <li>try to break, overload or gain unauthorised access to the site or other people’s accounts;</li>
        <li>use PULP for any unlawful purpose.</li>
      </ul>

      <h2>6. Designer listings and requests</h2>
      <p>Designer names, categories and links are provided for shoppers’ convenience and may be submitted by shoppers, designers or their representatives. We try to keep them accurate but can’t guarantee it. Brand names and logos belong to their owners. If you represent a designer and want a listing corrected, or believe content on PULP is unlawful or infringes your rights, email <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> with the details and your contact information. We’ll review every request.</p>
      <p><strong>Designer pages and replies.</strong> A designer or its authorised representative may claim the designer’s page for free. We verify claims before giving access and may refuse or remove access at any time, for example if a claim turns out to be unauthorised. Verified designers may post one public reply to each review. Replies must follow our <Link href="/guidelines">Review Guidelines</Link>; we may hide replies that don’t. The designer is responsible for its replies. Claiming a page, replying, or paying for any optional feature we may offer in future never affects a designer’s ratings, its position in the directory, or which reviews are shown.</p>

      <h2>7. No advice or guarantees</h2>
      <p>Reviews are personal opinions and may not reflect every shopper’s experience. PULP doesn’t verify every order, and we don’t guarantee the quality, authenticity, delivery or availability of anything sold by the designers listed. Any purchase is between you and the seller. PULP is provided “as is,” and to the fullest extent the law allows, we disclaim all warranties, express or implied.</p>

      <h2>8. Limitation of liability</h2>
      <p>To the fullest extent the law allows, PULP and the people who run it won’t be liable for any indirect, incidental or consequential loss, or for any loss arising from your purchases from designers listed on PULP, from content posted by other users, or from your use of or inability to use the site. Nothing in these terms limits liability that can’t legally be limited.</p>

      <h2>9. Changes and ending your account</h2>
      <p>We may update these terms as PULP grows. If we make significant changes, we’ll update the date at the top of this page and, where appropriate, let account holders know. You can stop using PULP at any time. To delete your account and reviews, email <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.</p>

      <h2>10. Governing law</h2>
      <p>PULP is operated from the United States. These terms are governed by the laws of the State of California and applicable federal law of the United States, without regard to conflict-of-law rules. Any dispute will be handled by the state or federal courts located in California, except where the law of your home country gives you the right to bring a claim locally.</p>

      <h2>11. Contact</h2>
      <p>Questions about these terms? Email <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.</p>
    </LegalPage>
  );
}
