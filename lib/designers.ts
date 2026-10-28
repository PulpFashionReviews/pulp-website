export type Brand = {
  id: number;
  Brand: string | null;
  Category: string | null;
  Price_Range: string | null;
  Website: string | null;
  Contact_Number: string | null;
};

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
  return website.startsWith('http') ? website : `https://${website}`;
}
