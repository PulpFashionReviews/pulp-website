-- Designers sold on ZIIA (ziiaonline.com) not yet on PULP, approved by the site owner 2026-11-09.
-- Categories follow where ZIIA lists each brand. Also fixes "Mariam Hussain" -> "Maryam Hussain".
with new_brands(brand, cats) as (
  values
    -- Formal / occasion wear
    ('Al Zohaib',        array['Formal']),
    ('AJR Couture',      array['Formal']),
    ('Amoris',           array['Formal']),
    ('Ayzel',            array['Formal']),
    ('Celestique',       array['Formal']),
    ('Lavish Premium',   array['Formal']),
    ('Marjjan',          array['Formal']),
    ('Saad Shaikh',      array['Formal']),
    ('Tara',             array['Formal']),
    ('Zarposh',          array['Formal']),
    -- Lawn & unstitched
    ('Azure',            array['Lawn','Unstitched']),
    ('Jugnu',            array['Lawn','Unstitched']),
    ('Kahf',             array['Lawn','Unstitched']),
    ('Lakhany',          array['Lawn','Unstitched']),
    ('Mahnur',           array['Lawn','Unstitched']),
    ('Neeshay',          array['Lawn','Unstitched']),
    ('Noor by Saadia Asad', array['Lawn','Unstitched']),
    ('Rajbari',          array['Lawn','Unstitched']),
    ('Sable Vogue',      array['Lawn','Unstitched']),
    ('Serene',           array['Lawn','Unstitched']),
    ('Zaib',             array['Lawn','Unstitched']),
    ('Zarif',            array['Lawn','Unstitched']),
    ('Zarqash',          array['Lawn','Unstitched']),
    -- Lawn, unstitched and formal
    ('Roheenaz',         array['Lawn','Unstitched','Formal']),
    ('Sardinia',         array['Lawn','Unstitched','Formal']),
    ('Xenia',            array['Lawn','Unstitched','Formal']),
    ('Elaf',             array['Lawn','Unstitched','Formal']),
    ('Izel',             array['Lawn','Unstitched','Formal']),
    ('Image',            array['Lawn','Unstitched','Formal']),
    -- Pret / luxury pret
    ('Mahum Asad',       array['Luxury Pret/Festive']),
    ('Mirana',           array['Pret/Casual','Luxury Pret/Festive']),
    ('Saad Bin Shahzad', array['Luxury Pret/Festive','Lawn','Formal']),
    ('H2 by Huma',       array['Pret/Casual'])
),
inserted as (
  insert into public.fashion_brands ("Brand", "Category")
  select nb.brand, array_to_string(nb.cats, ', ')
  from new_brands nb
  where not exists (select 1 from public.fashion_brands b where lower(b."Brand") = lower(nb.brand))
  returning id, "Brand"
)
insert into public.brand_categories (brand_id, category_id)
select i.id, c.id
from inserted i
join new_brands nb on nb.brand = i."Brand"
join public.categories c on c.name = any (nb.cats)
on conflict do nothing;

-- "Mariam Hussain" is the real label Maryam Hussain (sold on ZIIA).
update public.fashion_brands set "Brand" = 'Maryam Hussain', "Category" = 'Lawn, Luxury Pret/Festive'
where "Brand" = 'Mariam Hussain'
  and not exists (select 1 from public.fashion_brands where "Brand" = 'Maryam Hussain');
insert into public.brand_categories (brand_id, category_id)
select b.id, c.id from public.fashion_brands b join public.categories c on c.name in ('Lawn', 'Luxury Pret/Festive')
where b."Brand" = 'Maryam Hussain'
on conflict do nothing;
