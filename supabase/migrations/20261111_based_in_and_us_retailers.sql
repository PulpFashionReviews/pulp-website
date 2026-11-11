-- Where a designer or shop is based, and a category for U.S.-based retailers of Pakistani designer wear.
alter table public.fashion_brands add column if not exists based_in text check (char_length(based_in) <= 100);

insert into public.categories (name, sort_order)
select 'U.S. Retailers', coalesce(max(sort_order), 0) + 1 from public.categories
where not exists (select 1 from public.categories where name = 'U.S. Retailers');

update public.fashion_brands set based_in = 'Houston, TX' where "Brand" = 'House of Huda';
update public.fashion_brands set based_in = 'New York, NY' where "Brand" = 'Ayla Noor';

insert into public.brand_categories (brand_id, category_id)
select b.id, c.id from public.fashion_brands b join public.categories c on c.name = 'U.S. Retailers'
where b."Brand" in ('House of Huda', 'Ayla Noor')
on conflict do nothing;

-- House of SDK: U.S.-based retailer (owner, 2026-11-10); city and website not yet known.
insert into public.fashion_brands ("Brand", "Category", based_in)
select 'House of SDK', 'U.S. Retailers', 'United States'
where not exists (select 1 from public.fashion_brands where lower("Brand") = 'house of sdk');
insert into public.brand_categories (brand_id, category_id)
select b.id, c.id from public.fashion_brands b join public.categories c on c.name = 'U.S. Retailers'
where b."Brand" = 'House of SDK'
on conflict do nothing;
update public.fashion_brands set instagram = 'houseof.huda' where "Brand" = 'House of Huda';
update public.fashion_brands set "Website" = 'https://houseofsdk.com' where "Brand" = 'House of SDK';
update public.fashion_brands set based_in = 'Chicago, IL' where "Brand" = 'House of SDK';
