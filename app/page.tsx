import type { Metadata } from 'next';
import { HomePage } from '@/components/home-page';
import { loadHomeData } from '@/lib/home-data';

// Rebuilt at most every 5 minutes, so new designers and ratings show up quickly.
export const revalidate = 300;

export const metadata: Metadata = {
  title: 'PULP — Real reviews of Pakistani fashion designers',
  description: 'Honest reviews of Pakistani fashion designers from shoppers in the US, UK and Canada — with real photos of what arrived, delivery times, sizing and service.',
  alternates: { canonical: '/' },
};

export default async function Page() {
  const initial = await loadHomeData();
  return <HomePage initial={initial} />;
}
