-- Nadia Chhotani sells artificial jewelry too (site owner, 2026-11-05).
update public.fashion_brands set "Category" = 'Jewelry, Shoes & Accessories' where "Brand" = 'Nadia Chhotani';
insert into public.brand_categories (brand_id, category_id)
select b.id, c.id from public.fashion_brands b join public.categories c on c.name = 'Jewelry, Shoes & Accessories'
where b."Brand" = 'Nadia Chhotani'
on conflict do nothing;
