-- Official websites found by search for designers added from ZIIA (2026-11-09).
update public.fashion_brands b set "Website" = v.site
from (values
  ('AJR Couture', 'https://ajrcouture.com'),
  ('Ayzel',       'https://ayzel.pk'),
  ('Azure',       'https://azureofficial.pk'),
  ('Serene',      'https://imroziaserene.com'),
  ('Izel',        'https://izelapparel.com')
) as v(brand, site)
where b."Brand" = v.brand and b."Website" is null;
