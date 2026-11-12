-- Added at the owner's request.
-- Unsforall (UNS Shop): Pakistani embellished women's formal and festive wear.
with ins as (
  insert into public.fashion_brands ("Brand", "Category", "Website", instagram)
  select 'Unsforall', 'Formal, Luxury Pret/Festive', 'https://www.unsforall.com', 'unsforall'
  where not exists (select 1 from public.fashion_brands where lower("Brand") = 'unsforall')
  returning id
)
insert into public.brand_categories (brand_id, category_id)
select ins.id, c.id from ins join public.categories c on c.name in ('Formal', 'Luxury Pret/Festive')
on conflict do nothing;

-- Zunaira Teli: category to be confirmed by the owner.
insert into public.fashion_brands ("Brand", "Website")
select 'Zunaira Teli', 'https://zunairatel.com'
where not exists (select 1 from public.fashion_brands where lower("Brand") = 'zunaira teli');

-- Owner: Zunaira Teli is luxury pret, formal and casual pret.
insert into public.brand_categories (brand_id, category_id)
select b.id, c.id from public.fashion_brands b join public.categories c on c.name in ('Luxury Pret/Festive', 'Formal', 'Pret/Casual')
where b."Brand" = 'Zunaira Teli'
on conflict do nothing;
update public.fashion_brands set "Category" = 'Luxury Pret, Formal, Pret' where "Brand" = 'Zunaira Teli';
