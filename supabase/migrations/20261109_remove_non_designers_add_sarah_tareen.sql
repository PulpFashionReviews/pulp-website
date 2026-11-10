-- Owner confirmed these are people, not clothing labels (none had reviews).
delete from public.fashion_brands b
where b."Brand" in ('Zara Tareen', 'Zara Noor Abbas Closet', 'Sana Javed', 'Zainab Abbas', 'Zainab Ansell')
  and not exists (select 1 from public.reviews r where r.brand_id = b.id);

-- Sarah Tareen: Karachi luxury womenswear designer (likely what "Zara Tareen" was meant to be).
with ins as (
  insert into public.fashion_brands ("Brand", "Category", "Website", instagram)
  select 'Sarah Tareen', 'Formal', 'https://sarahtareenofficial.com', 'sarahtareenofficial'
  where not exists (select 1 from public.fashion_brands where lower("Brand") = 'sarah tareen')
  returning id
)
insert into public.brand_categories (brand_id, category_id)
select ins.id, c.id from ins join public.categories c on c.name = 'Formal'
on conflict do nothing;
