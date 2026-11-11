-- U.S.-based retailers of Pakistani designer clothes (owner approved, 2026-11-11).
with new_shops (brand, site, city) as (
  values ('String & Thread', 'https://www.stringnthread.com', 'Houston, TX'),
         ('Rangreza', 'https://rangreza.net', 'Edison, NJ'),
         ('East Avenue', 'https://www.eastavenuenj.com', 'North Brunswick, NJ'),
         ('Fabricoz', 'https://www.fabricoz.com', 'Seattle, WA'),
         ('Make by Moon', 'https://www.makebymoon.com', 'Irving, TX'),
         ('Eastern Clozet', 'https://www.easternclozet.com', 'Lutz, FL'),
         ('Red Heart', 'https://redheart.us', 'United States')
), ins as (
  insert into public.fashion_brands ("Brand", "Category", "Website", based_in)
  select n.brand, 'U.S. Retailers', n.site, n.city from new_shops n
  where not exists (select 1 from public.fashion_brands b where lower(b."Brand") = lower(n.brand))
  returning id
)
insert into public.brand_categories (brand_id, category_id)
select ins.id, c.id from ins join public.categories c on c.name = 'U.S. Retailers'
on conflict do nothing;
