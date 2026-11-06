-- Confirmed by the site owner on 2026-11-05:
-- Rabia Zahur categories; remove House of SDK (U.S.-based, no reviews).
with t(cats) as (select array['Luxury Pret/Festive','Formal','Bridal']),
labelled as (
  update public.fashion_brands b set "Category" = array_to_string(t.cats, ', ')
  from t where b."Brand" = 'Rabia Zahur'
  returning b.id, t.cats
)
insert into public.brand_categories (brand_id, category_id)
select l.id, c.id from labelled l join public.categories c on c.name = any (l.cats)
on conflict do nothing;

delete from public.brand_categories where brand_id in (select id from public.fashion_brands where "Brand" = 'House of SDK');
delete from public.fashion_brands where "Brand" = 'House of SDK'
  and not exists (select 1 from public.reviews r where r.brand_id = fashion_brands.id);
