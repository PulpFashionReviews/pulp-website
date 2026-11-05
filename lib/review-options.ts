// Shared choices and limits for the review form.

export const ITEM_TYPES = [
  'Lawn suit',
  'Pret / ready-to-wear',
  'Luxury pret / festive',
  'Formal',
  'Bridal',
  'Unstitched fabric',
  'Kurta / kurti',
  'Menswear',
  'Kidswear',
  'Jewelry / accessories',
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
