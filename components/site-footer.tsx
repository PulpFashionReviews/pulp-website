import Link from 'next/link';
import { CONTACT_EMAIL } from '@/lib/site';

export function SiteFooter() {
  return (
    <footer>
      <Link href="/" className="wordmark footer-logo">PULP<span>®</span></Link>
      <p>Fashion reviews, from the people who know.</p>
      <div>
        <Link href="/suggest-designer">Suggest a designer</Link>
        <Link href="/claim">For designers</Link>
        <Link href="/contact">Contact</Link>
      </div>
      <nav className="footer-legal" aria-label="Policies">
        <Link href="/guidelines">Review Guidelines</Link>
        <Link href="/terms">Terms of Use</Link>
        <Link href="/privacy">Privacy Policy</Link>
      </nav>
      <small>
        <p className="brand-disclaimer">
          PULP is an independent fashion review directory and is not affiliated with, endorsed by, or sponsored by the
          designers listed. All brand names and logos belong to their respective owners. If you are a rights holder and
          have a concern about content on PULP, please contact us at {CONTACT_EMAIL}.
        </p>
        © {new Date().getFullYear()} PULP. Real experiences. Real photos.
      </small>
    </footer>
  );
}
