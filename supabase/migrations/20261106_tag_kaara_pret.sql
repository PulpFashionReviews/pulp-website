-- Kaara also sells Pret/Casual, confirmed by the site owner on 2026-11-05.
update public.fashion_brands set "Category" = 'Pret/Casual, Luxury Pret/Festive, Formal' where "Brand" = 'Kaara';
insert into public.brand_categories (brand_id, category_id)
select b.id, c.id from public.fashion_brands b join public.categories c on c.name = 'Pret/Casual'
where b."Brand" = 'Kaara'
on conflict do nothing;
