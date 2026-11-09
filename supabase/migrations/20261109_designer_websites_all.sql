-- Official websites found by search for designers that had none (2026-11-09).
update public.fashion_brands b set "Website" = v.site
from (values
  ('Aik Atelier',             'https://aik.store'),
  ('Ali Xeeshan',             'https://alixeeshanempire.com'),
  ('Akbar Aslam',             'https://www.akbaraslam.com'),
  ('Anum Jung',               'https://anumjung.com'),
  ('Arsalan Iqbal',           'https://arsalaniqbal.com'),
  ('Ayesha Ibrahim',          'https://ayeshaibrahim.com'),
  ('Borjan',                  'https://www.borjan.com.pk'),
  ('Cambridge',               'https://thecambridgeshop.com'),
  ('Charcoal',                'https://charcoal.com.pk'),
  ('Chinyere',                'https://www.chinyere.pk'),
  ('Dhanak',                  'https://www.dhanak.com.pk'),
  ('Diners',                  'https://diners.com.pk'),
  ('ECS',                     'https://shopecs.com'),
  ('Edenrobe',                'https://edenrobe.com'),
  ('Emaan Adeel',             'https://emaanadeel.com'),
  ('Hira Ali Studios',        'https://hiraali.com'),
  ('Inayah',                  'https://www.inayah.com'),
  ('Insignia',                'https://insignia.com.pk'),
  ('Ismail Farid',            'https://www.ismailfarid.com'),
  ('Iznik',                   'https://iznikfashions.com'),
  ('Kamiar Rokni',            'https://www.houseofkamiarrokni.com'),
  ('Lajwanti',                'https://lajwantiofficial.com'),
  ('Mahgul',                  'https://mahgulonline.com'),
  ('Mausummery',              'https://mausummery.com'),
  ('Metro',                   'https://www.metroshoes.com.pk'),
  ('Mina Hasan',              'https://minahasan.com'),
  ('Mina Kashif',             'https://www.minakashif.com'),
  ('Minnie Minors',           'https://www.minnieminors.com'),
  ('MNR',                     'https://www.mohsinnaveedranjha.com'),
  ('Mohsin Naveed Ranjha',    'https://www.mohsinnaveedranjha.com'),
  ('Mochari',                 'https://mochari.pk'),
  ('Modanisa',                'https://www.modanisa.com'),
  ('Mona Imran',              'https://www.monaimran.pk'),
  ('Motifz',                  'https://motifz.com.pk'),
  ('MTJ (Tariq Jamil)',       'https://mtjonline.com'),
  ('Mubashira Usman',         'https://mubashirausman.com'),
  ('Munib Nawaz',             'https://munibnawazshop.com'),
  ('Naushemian',              'https://naushemian.com'),
  ('Nilofer Shahid Meeras',   'https://nilofershahidofficial.com'),
  ('Parniyan',                'https://parniyaan.co'),
  ('Pink Tree Company',       'https://thepinktreecompany.com'),
  ('Ramsha',                  'https://ramsha.pk'),
  ('Rawayat',                 'https://rawayatonline.com'),
  ('Royal Tag',               'https://royaltag.com.pk'),
  ('Rozina Munib',            'https://www.rozinamunib.com'),
  ('Sanaulla',                'https://sanaullastore.com'),
  ('Saya',                    'https://saya.pk'),
  ('Sitara Studio',           'https://sitarastudio.pk'),
  ('Stylo',                   'https://stylo.pk'),
  ('Threads & Motifs',        'https://www.threadsandmotifs.com'),
  ('Waniya by Mehr Azam',     'https://waniyabymehrazam.com'),
  ('Zara Ansari',             'https://www.zaraansariofficial.com'),
  ('Firdous',                 'https://firdouscloth.com'),
  -- real designers awaiting categories
  ('Asifa Nabeel',            'https://asifaandnabeel.pk'),
  ('Erum Khan',               'https://erumkhanstores.com'),
  ('Gulaal',                  'https://gulaal.pk'),
  ('Mahpara Khan',            'https://www.mahparakhan.com'),
  ('Reema Ahsan',             'https://reemaahsan.com'),
  ('Uzma Babar',              'https://umshaofficial.com'),
  ('Warda Designer',          'https://wardaofficial.com'),
  ('Yasmin Zaman',            'https://yasminzaman.pk')
) as v(brand, site)
where b."Brand" = v.brand and b."Website" is null;

-- Sub-lines share their main label's website.
update public.fashion_brands b set "Website" = p."Website"
from (values
  ('Agha Noor Luxury', 'Agha Noor'),
  ('Baroque Formals', 'Baroque'),
  ('Elan Formals', 'Elan'),
  ('Elan Luxe', 'Elan'),
  ('Mushq Formals', 'Mushq'),
  ('Rang Rasiya Formals', 'Rang Rasiya'),
  ('Sobia Nazir Luxury', 'Sobia Nazir'),
  ('Zaha Luxury', 'Zaha'),
  ('Gul Ahmed', 'Gul Ahmed Ideas'),
  ('Gul Ahmed Silk', 'Gul Ahmed Ideas'),
  ('Coco', 'Zara Shahjahan')
) as v(child, parent)
join public.fashion_brands p on p."Brand" = v.parent
where b."Brand" = v.child and b."Website" is null and p."Website" is not null;

-- Instagram where no website was found.
update public.fashion_brands b set instagram = v.ig
from (values ('Riaz Arts', 'riazarts'), ('Hina Butt', 'hinabutt_official')) as v(brand, ig)
where b."Brand" = v.brand and b.instagram is null;
