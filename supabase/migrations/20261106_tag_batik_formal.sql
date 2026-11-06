-- Batik also sells formals (site owner, 2026-11-05).
update public.fashion_brands set "Category" = 'Pret/Casual, Luxury Pret/Festive, Formal' where "Brand" = 'Batik';
insert into public.brand_categories (brand_id, category_id)
select b.id, c.id from public.fashion_brands b join public.categories c on c.name = 'Formal'
where b."Brand" = 'Batik'
on conflict do nothing;
