-- Owner confirmed: not designers, or no clothing label found (none had reviews).
-- Ayesha Malik is kept: the owner found her site (ayeshashoaibmalik.com).
delete from public.fashion_brands b
where b."Brand" in ('Aleezeh Shah', 'Alizeh Shah', 'Alina Amir', 'Anum Fayyaz', 'Arfa Karim Fashion', 'Ayesha Siddiqa',
  'Ayesha Qamar', 'Ayesha Rehan', 'Ayesha T', 'Ammara Ali', 'Amna Malik', 'Anum Khan', 'Anum Bashir',
  'Ayesha Khalid', 'Ayesha Riaz', 'Bano Begum')
  and not exists (select 1 from public.reviews r where r.brand_id = b.id);
