export type Brand = {
  id: number;
  Brand: string | null;
  Category: string | null;
  Price_Range: string | null;
  Website: string | null;
  Contact_Number: string | null;
};

// Brand columns plus its clean categories (via brand_categories → categories).
export const BRAND_SELECT =
  'id, Brand, Category, Price_Range, Website, Contact_Number, brand_categories(categories(name, sort_order))';

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
};

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
