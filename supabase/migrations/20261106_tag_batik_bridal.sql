-- Batik also sells bridal (site owner, 2026-11-05).
update public.fashion_brands set "Category" = 'Pret/Casual, Luxury Pret/Festive, Formal, Bridal' where "Brand" = 'Batik';
insert into public.brand_categories (brand_id, category_id)
select b.id, c.id from public.fashion_brands b join public.categories c on c.name = 'Bridal'
where b."Brand" = 'Batik'
on conflict do nothing;
