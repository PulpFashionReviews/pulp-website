-- Remove western-wear brands (site owner's decision, 2026-11-05). None had reviews.
with w(brand) as (values ('Cougar'),('Furor'),('Hustle N Holla'),('Breakout'),('Outfitters'),('Engine'),('Leisure Club'),('One'))
delete from public.brand_categories where brand_id in (select b.id from public.fashion_brands b join w on w.brand = b."Brand");

with w(brand) as (values ('Cougar'),('Furor'),('Hustle N Holla'),('Breakout'),('Outfitters'),('Engine'),('Leisure Club'),('One'))
delete from public.fashion_brands b using w
where b."Brand" = w.brand
  and not exists (select 1 from public.reviews r where r.brand_id = b.id);
