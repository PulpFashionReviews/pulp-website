import type { Metadata } from 'next';
import { Suspense } from 'react';
import { SiteHeader } from '@/components/site-header';
import { SiteFooter } from '@/components/site-footer';
import { ClaimForm } from '@/components/claim-form';

export const metadata: Metadata = {
  title: 'Claim your designer page — PULP',
  description: 'Designers can claim their PULP page for free and reply publicly to customer reviews.',
};

export default function ClaimPage() {
  return (
    <main>
      <SiteHeader />
      <div className="legal-wrap">
        <section className="suggest section-pad">
          <div className="suggest-intro">
            <span className="section-kicker">FOR DESIGNERS</span>
            <h1>Claim your <em>page.</em></h1>
            <p>Run a brand listed on PULP? Claim your page for free to add your logo and reply publicly to customer reviews — thank happy customers and give your side when something went wrong.</p>
            <ul>
              <li>Free to claim. Replies and your logo are always free.</li>
              <li>We verify every claim before giving access — usually by email from your brand’s website domain or a message from your official Instagram.</li>
              <li>Claiming never changes your ratings, your position in the directory, or which reviews are shown.</li>
            </ul>
          </div>
          <Suspense fallback={<p className="empty-state">Loading…</p>}>
            <ClaimForm />
          </Suspense>
        </section>
      </div>
      <SiteFooter />
    </main>
  );
}
