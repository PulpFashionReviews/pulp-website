import Link from 'next/link';
import { AuthLinks } from '@/components/auth-links';

/** The standard header used across the site's inner pages. */
export function SiteHeader() {
  return (
    <header className="topbar">
      <Link href="/" className="wordmark" aria-label="PULP home">PULP<span>®</span></Link>
      <nav>
        <Link href="/#how-it-works">How It Works</Link>
        <Link href="/#designers">Find a Designer</Link>
        <Link className="nav-cta" href="/#write-review">Review a Designer</Link>
      </nav>
      <AuthLinks />
    </header>
  );
}
