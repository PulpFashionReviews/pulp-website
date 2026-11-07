import Link from 'next/link';
import { ReactNode } from 'react';
import { SiteFooter } from '@/components/site-footer';
import { POLICY_UPDATED } from '@/lib/site';
import { AuthLinks } from '@/components/auth-links';

export function LegalPage({ kicker, title, intro, children }: { kicker: string; title: string; intro: string; children: ReactNode }) {
  return (
    <main>
      <header className="topbar">
        <Link href="/" className="wordmark" aria-label="PULP home">PULP<span>®</span></Link>
        <nav>
          <Link href="/#designers">Find a Designer</Link>
          <Link className="nav-cta" href="/#write-review">Write a Review <span>↗</span></Link>
          <Link href="/#how-it-works">How it Works</Link>
        </nav>
        <AuthLinks />
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
