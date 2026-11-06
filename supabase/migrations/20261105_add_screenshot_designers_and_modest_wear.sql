-- Designers from the owner's bookmarks, modest wear & hijab brands, and
-- website fixes for existing listings. Approved by the site owner 2026-11-05.

with new_brands(brand, website, cats) as (
  values
    -- From the owner's list (categories only where confirmed)
    ('Farida Hasan',            'https://www.faridahasan.com',         array['Formal','Luxury Pret/Festive']),
    ('Kaara',                   'https://kaaraonline.com',             array[]::text[]),
    ('Khakaa',                  'https://www.khakaa.com',              array['Luxury Pret/Festive','Formal']),
    ('Rabia Zahur',             'https://www.rabiazahur.com',          array[]::text[]),
    ('Musferah Saad',           'https://musferahsaad.net',            array['Formal','Luxury Pret/Festive']),
    ('SAK Atelier',             'https://sakatelier.com',              array[]::text[]),
    ('Huepret',                 'https://huepret.com',                 array['Pret/Casual']),
    ('House of SDK',            'https://houseofsdk.com',              array[]::text[]),
    ('Sammy K Design',          'https://sammykdesign.com',            array['Formal','Luxury Pret/Festive']),
    ('Aleena Fareena',          'https://aleenafareena.pk',            array['Luxury Pret/Festive']),
    ('Mysie by Tahira',         'https://www.mysiebytahira.com',       array['Pret/Casual','Luxury Pret/Festive']),
    ('Shadani',                 'https://shadanico.com',               array['Menswear']),
    ('Moire by Asma',           'https://moirebyasma.com',             array[]::text[]),
    ('Nadia Khan',              'https://nadiakhanofficial.com',       array['Luxury Pret/Festive','Formal']),
    ('Huma Mistry',             'https://www.humamistry.com',          array['Formal']),
    ('Ayesha Ismail',           'https://ayeshaismail.com',            array[]::text[]),
    ('Shehrnaz',                'https://shehrnaz.com',                array[]::text[]),
    ('Ambreen Farrukh',         'https://ambreenfarrukhofficial.com',  array['Luxury Pret/Festive']),
    ('Heer by Zeeshan Damani',  'https://www.heerbyzeeshandamani.com', array[]::text[]),
    ('Vestis Pret',             'https://vestispret.com',              array['Pret/Casual']),
    ('Scherezade',              'https://www.scherezade.pk',           array['Luxury Pret/Festive']),
    ('Baraé Khanom',            'https://www.baraekhanom.com',         array['Formal','Luxury Pret/Festive']),
    ('Ainee Faisal',            'https://aineefaisalshop.com',         array[]::text[]),
    ('Soraya',                  'https://soraya.pk',                   array['Bridal','Formal']),
    ('Sarah Sheeraz',           'https://sarahsheeraz.com',            array['Luxury Pret/Festive','Bridal']),
    ('Jeem',                    'https://jeem.pk',                     array['Bridal','Formal','Lawn']),
    ('Dastoor Collection',      'https://www.dastoorcollection.com',   array['Formal','Luxury Pret/Festive']),
    ('Amber Gohar',             'https://www.ambergohardesigns.com',   array[]::text[]),
    ('Sofia Khan Atelier',      'https://sofiakhanatelier.com',        array[]::text[]),
    -- Modest wear & hijabs
    ('Haute Hijab',             'https://www.hautehijab.com',          array['Modest Wear & Hijabs']),
    ('Verona Collection',       'https://www.verona-collection.com',   array['Modest Wear & Hijabs']),
    ('Artizara',                'https://www.artizara.com',            array['Modest Wear & Hijabs']),
    ('Culture Hijab Co.',       'https://culturehijab.com',            array['Modest Wear & Hijabs']),
    ('Niswa Fashion',           'https://www.niswafashion.com',        array['Modest Wear & Hijabs']),
    ('Aab',                     'https://aabcollection.com',           array['Modest Wear & Hijabs']),
    ('Sefamerve',               'https://www.sefamerve.com',           array['Modest Wear & Hijabs']),
    ('Inayah',                  null,                                  array['Modest Wear & Hijabs']),
    ('Modanisa',                null,                                  array['Modest Wear & Hijabs']),
    ('Al Deebaj',               'https://aldeebaj.com',                array['Modest Wear & Hijabs']),
    ('The Hijab Company',       'https://thehijabcompany.pk',          array['Modest Wear & Hijabs']),
    ('Hijab ul Hareem',         'https://hijabulhareem.com',           array['Modest Wear & Hijabs']),
    ('Black Camels',            'https://blackcamels.com.pk',          array['Modest Wear & Hijabs']),
    ('Hijabinist',              'https://hijabinist.com',              array['Modest Wear & Hijabs'])
),
inserted as (
  insert into public.fashion_brands ("Brand", "Category", "Website")
  select nb.brand, nullif(array_to_string(nb.cats, ', '), ''), nb.website
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

-- Existing brands that also sell modest wear
insert into public.brand_categories (brand_id, category_id)
select b.id, c.id
from public.fashion_brands b
join public.categories c on c.name = 'Modest Wear & Hijabs'
where b."Brand" in ('Sapphire', 'MTJ (Tariq Jamil)', 'Khaadi')
on conflict do nothing;

-- Websites for existing listings (from the owner's bookmarks)
update public.fashion_brands b set "Website" = v.site
from (values
  ('Ayesha Somaya',    'https://ayesha-somaya.com'),
  ('Zubia Zainab',     'https://www.zubiazainab.com'),
  ('Annus Abrar',      'https://www.annusabrar.net'),
  ('Farah Talib Aziz', 'https://www.farahtalibaziz.com.pk'),
  ('Nadia Farooqui',   'https://nadiafarooqui.com'),
  ('Suffuse',          'https://suffuse.pk'),
  ('Ayesha & Usman',   'https://ayeshaandusman.com'),
  ('Sania Maskatiya',  'https://saniamaskatiya.com'),
  ('Hussain Rehar',    'https://hussainrehar.com'),
  ('Faraz Manan',      'https://www.farazmanan.com'),
  ('Saira Shakira',    'https://www.sairashakira.com'),
  ('Elan',             'https://elan.pk'),
  ('Nureh',            'https://nureh.pk'),
  ('Maria B.',         'https://www.mariab.pk')
) as v(brand, site)
where b."Brand" = v.brand;
