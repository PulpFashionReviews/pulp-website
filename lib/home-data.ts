import { supabase } from '@/lib/supabase';
import { BRAND_SELECT, BrandRow, brandCategoryNames } from '@/lib/designers';
import type { HomeData, Rating } from '@/components/home-page';

/** Directory data for the home page, loaded on the server. */
export async function loadHomeData(): Promise<HomeData | null> {
  if (!supabase) return null;
  const [{ data: brandData, error }, { data: categoryData }, { data: ratingData }] = await Promise.all([
    supabase.from('fashion_brands').select(BRAND_SELECT).order('Brand'),
    supabase.from('categories').select('name').order('sort_order'),
    supabase.from('brand_ratings').select('brand_id, score, customers, total_reviews'),
  ]);
  if (error || !brandData) return null;
  return {
    brands: (brandData as unknown as BrandRow[]).map((b) => ({ ...b, categories: brandCategoryNames(b) })),
    categories: ((categoryData || []) as { name: string }[]).map((c) => c.name),
    ratings: Object.fromEntries(((ratingData || []) as Rating[]).map((r) => [r.brand_id, { ...r, score: Number(r.score) }])),
  };
}
