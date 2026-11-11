-- House of SAANVI: South Asian jewelry, U.S. storefront (owner, 2026-11-11).
with ins as (
  insert into public.fashion_brands ("Brand", "Category", "Website", instagram, based_in)
  select 'House of SAANVI', 'Jewelry, Shoes & Accessories', 'https://houseofsaanvi.com', 'houseofsaanvi.usa', 'United States'
  where not exists (select 1 from public.fashion_brands where lower("Brand") = 'house of saanvi')
  returning id
)
insert into public.brand_categories (brand_id, category_id)
select ins.id, c.id from ins join public.categories c on c.name = 'Jewelry, Shoes & Accessories'
on conflict do nothing;
