-- Owner confirmed: not Pakistani designers, or no clothing label found (none had reviews).
delete from public.fashion_brands b
where b."Brand" in ('Aisha Rao', 'Ayesha Ziya', 'Amna Babar',
  'Zainab Sajid', 'Zainab Khan', 'Zainab Raza', 'Zainab Jameel', 'Zainab Azeem',
  'Farah Shah', 'Tariq Aziz', 'Aisha Shaukat', 'Ayesha Sana', 'Ayesha Mustafa', 'Amna Kardar')
  and not exists (select 1 from public.reviews r where r.brand_id = b.id);
