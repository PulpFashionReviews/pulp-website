-- Merge duplicate designer listings (site owner, 2026-11-09). None had reviews, claims or managers.
--   MNR             -> Mohsin Naveed Ranjha
--   Firdous Fashion -> Firdous
--   Ayesha Farid    -> Aisha Farid (spelling used by the label's own site, aishafarid.com)
create temporary table dup_map(source text, target text) on commit drop;
insert into dup_map values ('MNR', 'Mohsin Naveed Ranjha'), ('Firdous Fashion', 'Firdous'), ('Ayesha Farid', 'Aisha Farid');

create temporary table dup_ids on commit drop as
select s.id as source_id, t.id as target_id
from dup_map m
join public.fashion_brands s on s."Brand" = m.source
join public.fashion_brands t on t."Brand" = m.target;

-- Carry categories and any missing links over to the kept listing.
insert into public.brand_categories (brand_id, category_id)
select d.target_id, bc.category_id from dup_ids d join public.brand_categories bc on bc.brand_id = d.source_id
on conflict do nothing;

update public.fashion_brands t
set "Website" = coalesce(t."Website", s."Website"),
    instagram = coalesce(t.instagram, s.instagram),
    facebook  = coalesce(t.facebook, s.facebook),
    "Price_Range" = coalesce(t."Price_Range", s."Price_Range")
from dup_ids d join public.fashion_brands s on s.id = d.source_id
where t.id = d.target_id;

update public.fashion_brands set "Website" = 'https://aishafarid.com' where "Brand" = 'Aisha Farid' and "Website" is null;

-- Move anything linked, then remove the duplicates.
update public.reviews r set brand_id = d.target_id from dup_ids d where r.brand_id = d.source_id;
update public.designer_claims c set brand_id = d.target_id from dup_ids d where c.brand_id = d.source_id;
insert into public.brand_managers (brand_id, user_id, added_at)
select d.target_id, m.user_id, m.added_at from dup_ids d join public.brand_managers m on m.brand_id = d.source_id
on conflict do nothing;
delete from public.brand_categories where brand_id in (select source_id from dup_ids);
delete from public.fashion_brands where id in (select source_id from dup_ids);

-- Refresh the text label on the kept listings.
update public.fashion_brands b set "Category" = sub.label
from (
  select bc.brand_id, string_agg(c.name, ', ' order by c.sort_order) as label
  from public.brand_categories bc join public.categories c on c.id = bc.category_id
  where bc.brand_id in (select target_id from dup_ids)
  group by bc.brand_id
) sub
where b.id = sub.brand_id;
