-- Repair websites saved as "https: name.com" and correct Rastah's domain.
update public.fashion_brands
set "Website" = 'https://' || trim(regexp_replace("Website", '^https:\s+', ''))
where "Website" ~ '^https:\s+';

update public.fashion_brands set "Website" = 'https://rastah.co' where "Brand" = 'Rastah';
