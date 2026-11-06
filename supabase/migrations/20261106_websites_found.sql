-- Websites confirmed by search on 2026-11-05; Zuria Dor categories from its own site.
update public.fashion_brands b set "Website" = v.site
from (values
  ('Cougar',                 'https://cougar.com.pk'),
  ('Furor',                  'https://furorjeans.com'),
  ('Hustle N Holla',         'https://hustlenholla.com.pk'),
  ('Sadaf Fawad Khan (SFK)', 'https://sadaffawadkhan.com'),
  ('Zainab Salman',          'https://zainabsalman.com'),
  ('Batik',                  'https://batik.com.pk'),
  ('Zuria Dor',              'https://zuriador.com'),
  ('Nadia Chhotani',         'https://nadiachhotani.com')
) as v(brand, site)
where b."Brand" = v.brand;

update public.fashion_brands set "Category" = 'Bridal, Formal' where "Brand" = 'Zuria Dor';
insert into public.brand_categories (brand_id, category_id)
select b.id, c.id from public.fashion_brands b join public.categories c on c.name in ('Bridal','Formal')
where b."Brand" = 'Zuria Dor'
on conflict do nothing;
