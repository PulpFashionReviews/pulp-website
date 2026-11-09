-- Owner asked to remove these listings (none had reviews or claims).
-- Misha Lakhani stays as her own listing (https://mishalakhani.com).
delete from public.fashion_brands where "Brand" in ('Amoris', 'Jade by Misha Lakhani', 'Celestique');
