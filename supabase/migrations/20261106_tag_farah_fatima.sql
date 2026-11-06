-- Farah & Fatima categories, confirmed by the site owner on 2026-11-05.
with t(cats) as (select array['Pret/Casual','Luxury Pret/Festive','Formal','Bridal']),
labelled as (
  update public.fashion_brands b set "Category" = array_to_string(t.cats, ', ')
  from t where b."Brand" = 'Farah & Fatima'
  returning b.id, t.cats
)
insert into public.brand_categories (brand_id, category_id)
select l.id, c.id from labelled l join public.categories c on c.name = any (l.cats)
on conflict do nothing;
