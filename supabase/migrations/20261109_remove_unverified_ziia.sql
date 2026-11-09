-- Remove three ZIIA additions that couldn't be verified as labels (site owner, 2026-11-09). None had reviews.
with gone(brand) as (values ('H2 by Huma'), ('Tara'), ('Saad Bin Shahzad'))
delete from public.brand_categories
where brand_id in (select b.id from public.fashion_brands b join gone g on g.brand = b."Brand");

with gone(brand) as (values ('H2 by Huma'), ('Tara'), ('Saad Bin Shahzad'))
delete from public.fashion_brands b using gone g
where b."Brand" = g.brand
  and not exists (select 1 from public.reviews r where r.brand_id = b.id)
  and not exists (select 1 from public.designer_claims c where c.brand_id = b.id);
