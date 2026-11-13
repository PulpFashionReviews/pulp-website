import type { Metadata } from 'next';
import { Analytics } from '@vercel/analytics/next';
import { SITE_URL } from '@/lib/site';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: 'PULP — Real reviews of Pakistani fashion designers',
  description: 'Honest reviews of Pakistani fashion designers, from real customers.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}<Analytics /></body></html>;
}
