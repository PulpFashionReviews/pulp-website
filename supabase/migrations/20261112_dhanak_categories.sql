-- Owner: Dhanak is formal wear, bridal and pret.
delete from public.brand_categories bc using public.fashion_brands b
where bc.brand_id = b.id and b."Brand" = 'Dhanak';
insert into public.brand_categories (brand_id, category_id)
select b.id, c.id from public.fashion_brands b join public.categories c on c.name in ('Formal', 'Bridal', 'Pret/Casual')
where b."Brand" = 'Dhanak'
on conflict do nothing;
update public.fashion_brands set "Category" = 'Formal, Bridal, Pret' where "Brand" = 'Dhanak';
