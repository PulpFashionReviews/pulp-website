-- Add Studio Zariya (site owner, 2026-11-09). Formal for now; more categories to follow.
with ins as (
  insert into public.fashion_brands ("Brand", "Category", "Website")
  select 'Studio Zariya', 'Formal', 'https://studiozariya.com'
  where not exists (select 1 from public.fashion_brands where lower("Brand") = 'studio zariya')
  returning id
)
insert into public.brand_categories (brand_id, category_id)
select ins.id, c.id from ins join public.categories c on c.name = 'Formal'
on conflict do nothing;
