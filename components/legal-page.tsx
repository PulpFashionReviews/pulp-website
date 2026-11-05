import Link from 'next/link';
import { ReactNode } from 'react';
import { SiteFooter } from '@/components/site-footer';
import { POLICY_UPDATED } from '@/lib/site';

export function LegalPage({ kicker, title, intro, children }: { kicker: string; title: string; intro: string; children: ReactNode }) {
  return (
    <main>
      <header className="topbar">
        <Link href="/" className="wordmark" aria-label="PULP home">PULP<span>®</span></Link>
        <nav>
          <Link href="/#designers">Designers</Link>
          <Link href="/guidelines">Guidelines</Link>
          <Link href="/terms">Terms</Link>
          <Link href="/privacy">Privacy</Link>
        </nav>
        <Link className="nav-cta" href="/#write-review">Write a review <span>↗</span></Link>
      </header>
      <div className="legal-wrap">
      <article className="legal section-pad">
        <span className="section-kicker">{kicker}</span>
        <h1>{title}</h1>
        <p className="legal-updated">Last updated {POLICY_UPDATED}</p>
        <p className="legal-intro">{intro}</p>
        {children}
      </article>
      </div>
      <SiteFooter />
    </main>
  );
}
