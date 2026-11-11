-- Added at the owner's request (2026-11-10). House of Huda is based in Houston, TX; Ayla Noor in New York.
with new_brands (brand, site) as (
  values ('House of Huda', 'https://houseofhuda.com'),
         ('Ayla Noor', 'https://www.aylanoor.com')
), ins as (
  insert into public.fashion_brands ("Brand", "Category", "Website")
  select n.brand, 'Luxury Pret/Festive', n.site from new_brands n
  where not exists (select 1 from public.fashion_brands b where lower(b."Brand") = lower(n.brand))
  returning id
)
insert into public.brand_categories (brand_id, category_id)
select ins.id, c.id from ins join public.categories c on c.name = 'Luxury Pret/Festive'
on conflict do nothing;
