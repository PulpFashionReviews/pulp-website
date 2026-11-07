export type Brand = {
  id: number;
  Brand: string | null;
  Category: string | null;
  Price_Range: string | null;
  Website: string | null;
  Contact_Number: string | null;
  instagram?: string | null;
  facebook?: string | null;
  ships_to?: string[] | null;
  claimed_at?: string | null;
  logo_path?: string | null;
};

// Brand columns plus its clean categories (via brand_categories → categories).
export const BRAND_SELECT =
  'id, Brand, Category, Price_Range, Website, Contact_Number, instagram, facebook, ships_to, claimed_at, logo_path, brand_categories(categories(name, sort_order))';

export type BrandRow = Brand & {
  brand_categories?: { categories: { name: string; sort_order: number } | null }[] | null;
};

/** Clean category names for a brand, in the site's standard order. */
export function brandCategoryNames(brand: BrandRow): string[] {
  return (brand.brand_categories || [])
    .map((bc) => bc.categories)
    .filter((c): c is { name: string; sort_order: number } => !!c)
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((c) => c.name);
}

export type Review = {
  id: number;
  brand_id: number;
  rating: number;
  review_text: string;
  created_at: string;
  website_photo_url: string | null;
  received_photo_url: string | null;
  category_ratings: Record<string, number> | null;
  item_type: string | null;
  shipped_to: string | null;
  order_month: string | null;
  photo_paths: string[] | null;
  status?: string;
  updated_at?: string | null;
  proof_path?: string | null;
  order_ref?: string | null;
  verified_purchase?: boolean;
};

export const REVIEW_SELECT =
  'id, brand_id, rating, review_text, created_at, website_photo_url, received_photo_url, category_ratings, item_type, shipped_to, order_month, photo_paths, status, updated_at, proof_path, order_ref, verified_purchase';

export const reviewCategories = ['Customer service', 'Communication', 'Product quality', 'Accuracy to photos', 'Delivery', 'Value for money'];

export function slugify(value: string) {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function designerSlug(brand: Pick<Brand, 'id' | 'Brand'>) {
  return slugify(brand.Brand || '') || String(brand.id);
}

export function designerHref(brand: Pick<Brand, 'id' | 'Brand'>) {
  return `/designers/${designerSlug(brand)}`;
}

export function websiteUrl(website: string) {
  // Repairs stored values like "https: example.com" and bare domains.
  const host = website.trim().replace(/^https?:\s*\/*/i, '');
  return `https://${host}`;
}

export const LOGO_BUCKET = 'designer-logos';

/** Public URL of a designer's logo (logos are public images). */
export function logoUrl(path: string | null | undefined) {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/rest\/v1\/?$/, '').replace(/\/$/, '');
  if (!path || !base) return null;
  return `${base}/storage/v1/object/public/${LOGO_BUCKET}/${path}`;
}
