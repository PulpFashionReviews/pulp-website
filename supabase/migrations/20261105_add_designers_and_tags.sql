-- Add new designers (women's, men's eastern wear, artificial jewelry, shoes),
-- rename Jewelry/Accessories, and tag existing brands with every category
-- they're popular for. Approved by the site owner on 2026-11-05.

-- 1. Category rename
update public.categories set name = 'Jewelry, Shoes & Accessories' where name = 'Jewelry/Accessories';

-- 2. New designers
with new_brands(brand, website, cats) as (
  values
    -- Women's
    ('Kanwal Malik',          'https://kanwalmalik.com',   array['Luxury Pret/Festive','Formal']),
    ('Mohsin Naveed Ranjha',  null,                        array['Bridal','Formal','Menswear']),
    ('Kamiar Rokni',          null,                        array['Bridal','Formal']),
    ('Emaan Adeel',           null,                        array['Formal','Luxury Pret/Festive']),
    ('Maryum N Maria',        'https://maryumnmaria.com',  array['Luxury Pret/Festive','Formal']),
    ('Anam Akhlaq',           null,                        array['Formal','Luxury Pret/Festive']),
    ('Waniya by Mehr Azam',   null,                        array['Bridal','Formal']),
    ('Mubashira Usman',       null,                        array['Formal']),
    ('Zuri by Zainab',        'https://zuribyzainab.com',  array['Formal','Luxury Pret/Festive']),
    ('Motifz',                null,                        array['Lawn','Unstitched','Pret/Casual']),
    ('Ramsha',                null,                        array['Lawn','Unstitched','Formal']),
    ('Saya',                  null,                        array['Pret/Casual','Unstitched']),
    ('Annus Abrar',           null,                        array['Bridal','Formal']),
    ('Shiza Hassan',          null,                        array['Bridal','Formal']),
    -- Men's eastern wear
    ('MTJ (Tariq Jamil)',     null,                        array['Menswear']),
    ('Charcoal',              null,                        array['Menswear']),
    ('Shahzeb Saeed',         'https://shahzebsaeed.com',  array['Menswear']),
    ('Chester Bernard',       'https://chesterbernard.com',array['Menswear']),
    ('Royal Tag',             null,                        array['Menswear']),
    ('Ismail Farid',          null,                        array['Menswear','Bridal']),
    -- Artificial jewelry
    ('Zeesy',                 'https://zeesy.pk',          array['Jewelry, Shoes & Accessories']),
    ('Jadeno',                'https://jadeno.pk',         array['Jewelry, Shoes & Accessories']),
    ('Rema Luxe',             'https://remaluxe.com',      array['Jewelry, Shoes & Accessories']),
    ('Allure by MHT',         'https://allurebymht.com',   array['Jewelry, Shoes & Accessories']),
    ('Crazy Women',           'https://crazywomen.pk',     array['Jewelry, Shoes & Accessories']),
    -- Shoes
    ('JootiShooti',           'https://jootishooti.com',   array['Jewelry, Shoes & Accessories']),
    ('Dazzle by Sarah',       'https://dazzlebysarah.com', array['Jewelry, Shoes & Accessories']),
    ('Mochari',               null,                        array['Jewelry, Shoes & Accessories']),
    ('Retrowalk',             'https://retrowalk.com',     array['Jewelry, Shoes & Accessories']),
    ('Stylo',                 null,                        array['Jewelry, Shoes & Accessories']),
    ('Borjan',                null,                        array['Jewelry, Shoes & Accessories']),
    ('ECS',                   null,                        array['Jewelry, Shoes & Accessories']),
    ('Metro',                 null,                        array['Jewelry, Shoes & Accessories']),
    ('Insignia',              null,                        array['Jewelry, Shoes & Accessories']),
    ('Miaasa',                'https://miaasa.com',        array['Jewelry, Shoes & Accessories'])
),
inserted as (
  insert into public.fashion_brands ("Brand", "Category", "Website")
  select nb.brand, array_to_string(nb.cats, ', '), nb.website
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

-- 3. Tag existing brands with every category they're popular for
with tags(brand, cat) as (
  values
    -- Men's eastern wear
    ('J.','Menswear'), ('Amir Adnan','Menswear'), ('Cambridge','Menswear'), ('Edenrobe','Menswear'),
    ('Diners','Menswear'), ('Gul Ahmed','Menswear'), ('Bonanza Satrangi','Menswear'), ('Alkaram','Menswear'),
    ('Sapphire','Menswear'), ('Khaadi','Menswear'), ('Almirah','Menswear'), ('HSY','Menswear'),
    ('Deepak Perwani','Menswear'), ('Muneeb Nawaz','Menswear'), ('Republic by Omar Farooq','Menswear'),
    ('Ethnic','Menswear'), ('Nishat Linen','Menswear'), ('Zellbury','Menswear'), ('Bareeze','Menswear'),
    ('Ali Xeeshan','Menswear'), ('Mehdi','Menswear'),
    -- Kids (girls' eastern wear lines)
    ('Khaadi','Kids'), ('Sapphire','Kids'), ('Nishat Linen','Kids'), ('Limelight','Kids'), ('Maria B.','Kids'),
    ('Gul Ahmed','Kids'), ('Bonanza Satrangi','Kids'), ('Beechtree','Kids'), ('Alkaram','Kids'),
    ('Zellbury','Kids'), ('J.','Kids'), ('Generation','Kids'), ('Diners','Kids'), ('Ethnic','Kids'),
    ('Edenrobe','Kids'), ('Minnie Minors','Kids'),
    -- Women's shoes
    ('Ethnic','Jewelry, Shoes & Accessories'), ('Sapphire','Jewelry, Shoes & Accessories'),
    ('Beechtree','Jewelry, Shoes & Accessories')
)
insert into public.brand_categories (brand_id, category_id)
select b.id, c.id
from tags t
join public.fashion_brands b on b."Brand" = t.brand
join public.categories c on c.name = t.cat
on conflict do nothing;

-- 4. Correct spelling
update public.fashion_brands set "Brand" = 'Munib Nawaz' where "Brand" = 'Muneeb Nawaz';
