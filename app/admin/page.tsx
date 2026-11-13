import type { Metadata } from 'next';
import Link from 'next/link';
import { AdminDashboard } from '@/components/admin-dashboard';

export const metadata: Metadata = {
  title: 'PULP',
  robots: { index: false, follow: false },
};

export default function AdminPage() {
  return (
    <main>
      <header className="topbar">
        <Link href="/" className="wordmark" aria-label="PULP home">PULP</Link>
        <nav>
          <Link href="/#designers">Directory</Link>
        </nav>
        <span />
      </header>
      <div className="legal-wrap">
        <section className="section-pad">
          <AdminDashboard />
        </section>
      </div>
    </main>
  );
}
