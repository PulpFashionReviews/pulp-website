-- Websites supplied by the site owner on 2026-11-05.
update public.fashion_brands set "Website" = 'https://shaziakiyanistudio.com' where "Brand" = 'Shazia Kiyani';
update public.fashion_brands set "Website" = 'https://farahandfatima.com'    where "Brand" = 'Farah & Fatima';

-- "Nida Azwer Atelier" duplicates the existing "Nida Azwer" listing (nidaazwer.com).
update public.reviews set brand_id = (select id from public.fashion_brands where "Brand" = 'Nida Azwer')
where brand_id = (select id from public.fashion_brands where "Brand" = 'Nida Azwer Atelier');
delete from public.brand_categories where brand_id = (select id from public.fashion_brands where "Brand" = 'Nida Azwer Atelier');
delete from public.fashion_brands where "Brand" = 'Nida Azwer Atelier';
