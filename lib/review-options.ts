// Shared choices and limits for the review form.

export const ITEM_TYPES = [
  'Lawn Suit',
  'Pret / Casual',
  'Luxury Pret / Festive',
  'Formal',
  'Bridal',
  'Unstitched Fabric',
  'Menswear',
  'Kidswear',
  'Jewelry / Accessories',
  'Other',
];

export const SHIP_COUNTRIES = [
  'United States',
  'United Kingdom',
  'Canada',
  'Australia',
  'United Arab Emirates',
  'Pakistan',
  'Other',
];

export const PHOTO_BUCKET = 'review-photos';
export const MAX_PHOTOS = 4;
export const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
export const PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

/** "2026-10-01" → "October 2026" */
export function formatOrderMonth(value: string | null) {
  if (!value) return null;
  const [y, m] = value.split('-').map(Number);
  if (!y || !m) return null;
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });
}

export const SHIPS_TO_OPTIONS = [
  'United States',
  'United Kingdom',
  'Canada',
  'Australia',
  'United Arab Emirates',
  'Pakistan',
  'Worldwide',
];

export const PRICE_RANGES = [
  { value: 'Low', label: 'Budget' },
  { value: 'Medium', label: 'Mid-range' },
  { value: 'High', label: 'Luxury' },
];

export const RELATIONSHIPS = [
  { value: 'customer', label: 'I’m a customer' },
  { value: 'works_for_brand', label: 'I own or work for this brand' },
  { value: 'marketer', label: 'I’m a marketer or agency for this brand' },
];

/** "@name", "name" or a full URL → an Instagram profile link. */
export function instagramUrl(value: string) {
  const v = value.trim();
  if (/^https?:\/\//i.test(v)) return v;
  if (/instagram\.com\//i.test(v)) return `https://${v.replace(/^\/+/, '')}`;
  return `https://instagram.com/${v.replace(/^@/, '')}`;
}

export function facebookUrl(value: string) {
  const v = value.trim();
  if (/^https?:\/\//i.test(v)) return v;
  if (/facebook\.com\//i.test(v)) return `https://${v.replace(/^\/+/, '')}`;
  return `https://facebook.com/${v.replace(/^@/, '')}`;
}
