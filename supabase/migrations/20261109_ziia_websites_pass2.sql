-- Second, more thorough search for websites of designers added from ZIIA (2026-11-09).
update public.fashion_brands b set "Website" = v.site
from (values
  ('Noor by Saadia Asad', 'https://www.saadiaasad.com'),
  ('Jugnu',               'https://jugnulahore.com'),
  ('Elaf',                'https://www.elafpremium.com'),
  ('Roheenaz',            'https://roheenaz.com'),
  ('Al Zohaib',           'https://alzohaibstore.com'),
  ('Image',               'https://pk.image1993.com'),
  ('Lakhany',             'https://lakhanyonline.com'),
  ('Lavish Premium',      'https://lavishpremium.com.pk'),
  ('Mahum Asad',          'https://mahumasad.com'),
  ('Marjjan',             'https://www.marjjan.com'),
  ('Mirana',              'https://mirana.pk'),
  ('Neeshay',             'https://neeshay.pk'),
  ('Rajbari',             'https://www.rajbari.pk'),
  ('Saad Shaikh',         'https://saadshaikh.pk'),
  ('Sable Vogue',         'https://sablev.net'),
  ('Sardinia',            'https://sardinia.pk'),
  ('Xenia',               'https://www.xeniaformals.com'),
  ('Zaib',                'https://zaibonline.com'),
  ('Zarif',               'https://zarif.pk'),
  ('Zarqash',             'https://www.zarqashofficial.com'),
  ('Mahnur',              'https://mahnur.pk'),
  ('Maryam Hussain',      'https://maryamhussain.pk'),
  ('Kahf',                'https://kahfpremium.com')
) as v(brand, site)
where b."Brand" = v.brand and b."Website" is null;

update public.fashion_brands b set instagram = v.ig
from (values
  ('Mirana',      'mirana.pk'),
  ('Sable Vogue', 'sablevogueofficial'),
  ('Kahf',        'kahfpremium')
) as v(brand, ig)
where b."Brand" = v.brand and b.instagram is null;
