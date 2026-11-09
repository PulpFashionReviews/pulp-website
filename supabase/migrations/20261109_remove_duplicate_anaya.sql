-- "Anaya" duplicated "Anaya by Kiran Chaudhry"; removed at the owner's request (no reviews).
delete from public.fashion_brands where "Brand" = 'Anaya' and not exists (select 1 from public.reviews r where r.brand_id = fashion_brands.id);
