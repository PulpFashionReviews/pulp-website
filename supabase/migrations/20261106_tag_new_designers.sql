-- Categories for designers added without one, as confirmed by the site owner on 2026-11-05.
with tags(brand, cats) as (
  values
    ('SAK Atelier',            array['Pret/Casual','Luxury Pret/Festive','Formal']),
    ('Amber Gohar',            array['Pret/Casual','Luxury Pret/Festive','Formal']),
    ('Sofia Khan Atelier',     array['Pret/Casual']),
    ('Ayesha Ismail',          array['Pret/Casual','Luxury Pret/Festive','Formal']),
    ('Heer by Zeeshan Damani', array['Luxury Pret/Festive','Formal'])
),
labelled as (
  update public.fashion_brands b set "Category" = array_to_string(t.cats, ', ')
  from tags t where b."Brand" = t.brand
  returning b.id, t.cats
)
insert into public.brand_categories (brand_id, category_id)
select l.id, c.id from labelled l join public.categories c on c.name = any (l.cats)
on conflict do nothing;
