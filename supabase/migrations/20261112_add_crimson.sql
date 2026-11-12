-- Crimson (Pakistan), added at the owner's request.
with ins as (
  insert into public.fashion_brands ("Brand", "Category", "Website")
  select 'Crimson', 'Luxury Pret/Festive', 'https://www.crimson.com.pk'
  where not exists (select 1 from public.fashion_brands where lower("Brand") = 'crimson')
  returning id
)
insert into public.brand_categories (brand_id, category_id)
select ins.id, c.id from ins join public.categories c on c.name in ('Luxury Pret/Festive', 'Lawn')
on conflict do nothing;
