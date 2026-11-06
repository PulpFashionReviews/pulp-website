-- Keep SFK to the categories the site owner gave (the merged duplicate had added Pret/Casual).
delete from public.brand_categories
where brand_id = (select id from public.fashion_brands where "Brand" = 'Sadaf Fawad Khan (SFK)')
  and category_id = (select id from public.categories where name = 'Pret/Casual');
update public.fashion_brands set "Category" = 'Bridal, Formal, Luxury Pret/Festive, Lawn, Kids' where "Brand" = 'Sadaf Fawad Khan (SFK)';
