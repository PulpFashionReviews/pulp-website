import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'PULP — Real experiences. Real photos.',
  description: 'Honest reviews of Pakistani fashion designers, from real customers.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
