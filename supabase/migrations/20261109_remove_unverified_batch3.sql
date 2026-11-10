-- Owner confirmed: duplicates, not Pakistani designers, or no clothing label found (none had reviews).
delete from public.fashion_brands b
where b."Brand" in ('Aamna Aqeel', 'Aiman Khan', 'Aiman Minal',
  'Amina Muaddi Pakistan collaboration', 'Atelier Zuhra Pakistan', 'Aamna Isani',
  'Atelier Rehman', 'Amina Yasmin', 'Areeba Salman', 'Areeba Qureshi', 'Arooj Fatima', 'Arooj Ahmed',
  'Abeer Khan', 'Abeer Waseem', 'Abeer Raza', 'Aimen Zaman')
  and not exists (select 1 from public.reviews r where r.brand_id = b.id);
