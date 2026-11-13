import type { MetadataRoute } from 'next';
import { supabase } from '@/lib/supabase';
import { designerHref } from '@/lib/designers';
import { SITE_URL } from '@/lib/site';

export const revalidate = 3600;

/** Every public page, so Google can find all designer pages. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const pages: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, lastModified: now, changeFrequency: 'daily', priority: 1 },
    { url: `${SITE_URL}/suggest-designer`, changeFrequency: 'monthly', priority: 0.4 },
    { url: `${SITE_URL}/claim`, changeFrequency: 'monthly', priority: 0.3 },
    { url: `${SITE_URL}/contact`, changeFrequency: 'yearly', priority: 0.2 },
    { url: `${SITE_URL}/guidelines`, changeFrequency: 'yearly', priority: 0.2 },
    { url: `${SITE_URL}/privacy`, changeFrequency: 'yearly', priority: 0.1 },
    { url: `${SITE_URL}/terms`, changeFrequency: 'yearly', priority: 0.1 },
  ];
  if (!supabase) return pages;
  const [{ data: brands }, { data: ratings }] = await Promise.all([
    supabase.from('fashion_brands').select('id, Brand'),
    supabase.from('brand_ratings').select('brand_id, total_reviews'),
  ]);
  const reviewed = new Set(((ratings || []) as { brand_id: number; total_reviews: number }[]).filter((r) => r.total_reviews > 0).map((r) => r.brand_id));
  for (const b of (brands || []) as { id: number; Brand: string | null }[]) {
    pages.push({
      url: `${SITE_URL}${designerHref(b)}`,
      changeFrequency: 'weekly',
      priority: reviewed.has(b.id) ? 0.8 : 0.5,
    });
  }
  return pages;
}
