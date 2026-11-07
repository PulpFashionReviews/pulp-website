import type { Metadata } from 'next';
import Link from 'next/link';
import { SiteFooter } from '@/components/site-footer';
import { SuggestDesignerForm } from '@/components/suggest-designer-form';
import { AuthLinks } from '@/components/auth-links';

export const metadata: Metadata = {
  title: 'Suggest a designer — PULP',
  description: 'Can’t find a designer on PULP? Suggest them and we’ll add them to the directory.',
};

export default function SuggestDesignerPage() {
  return (
    <main>
      <header className="topbar">
        <Link href="/" className="wordmark" aria-label="PULP home">PULP<span>®</span></Link>
        <nav>
          <Link href="/#how-it-works">How It Works</Link>
          <Link href="/#designers">Find a Designer</Link>
          <Link className="nav-cta" href="/#write-review">Review a Designer</Link>
        </nav>
        <AuthLinks />
      </header>
      <div className="legal-wrap">
        <section className="suggest section-pad">
          <div className="suggest-intro">
            <span className="section-kicker">GROW THE DIRECTORY</span>
            <h1>Can’t find a <em>designer?</em></h1>
            <p>Tell us about them. Whether you’re a happy (or unhappy) customer, or you run the brand yourself, suggestions help other shoppers find the reviews they need.</p>
            <ul>
              <li>We check every suggestion before it goes live.</li>
              <li>Once approved, anyone can review the designer.</li>
              <li>Designers can’t pay to be listed or to remove reviews.</li>
            </ul>
          </div>
          <SuggestDesignerForm />
        </section>
      </div>
      <SiteFooter />
    </main>
  );
}
