-- Merge duplicate listings and sub-lines into their main designer (site owner, 2026-11-05).
-- Categories carry over to the main listing; any reviews move with them.
create temporary table merge_map(source text, target text) on commit drop;
insert into merge_map values
  ('Afrozeh Luxe','Afrozeh'), ('Afrozeh Formals','Afrozeh'),
  ('Ali Xeeshan Theater','Ali Xeeshan'),
  ('Charizma Luxe','Charizma'),
  ('Coco by Zara Shahjahan','Zara Shahjahan'),
  ('Diners Women','Diners'),
  ('Edenrobe Women','Edenrobe'),
  ('Fawad Khan x Sadaf','Sadaf Fawad Khan (SFK)'), ('Sadaf Fawad Khan','Sadaf Fawad Khan (SFK)'),
  ('Gulabo','Maheen Khan Gulabo'),
  ('Nishat Chunian','Nishat Linen'),
  ('Nureh Luxe','Nureh'), ('Nureh Formals','Nureh'),
  ('Qalamkar Luxe','Qalamkar'), ('Qalamkar Formals','Qalamkar'),
  ('Republic','Republic by Omar Farooq'),
  ('Sanaulla Bridal','Sanaulla'), ('Sanaulla Exclusive','Sanaulla'), ('Sanaulla Store','Sanaulla'),
  ('Sitara','Sitara Studio');

create temporary table merge_ids on commit drop as
select s.id as source_id, t.id as target_id
from merge_map m
join public.fashion_brands s on s."Brand" = m.source
join public.fashion_brands t on t."Brand" = m.target;

insert into public.brand_categories (brand_id, category_id)
select mi.target_id, bc.category_id from merge_ids mi join public.brand_categories bc on bc.brand_id = mi.source_id
on conflict do nothing;

-- Sanaulla's bridal line
insert into public.brand_categories (brand_id, category_id)
select b.id, c.id from public.fashion_brands b join public.categories c on c.name = 'Bridal'
where b."Brand" = 'Sanaulla'
on conflict do nothing;

update public.reviews r set brand_id = mi.target_id from merge_ids mi where r.brand_id = mi.source_id;
delete from public.brand_categories where brand_id in (select source_id from merge_ids);
delete from public.fashion_brands where id in (select source_id from merge_ids);

-- Refresh the text label on the main listings
update public.fashion_brands b set "Category" = sub.label
from (
  select bc.brand_id, string_agg(c.name, ', ' order by c.sort_order) as label
  from public.brand_categories bc join public.categories c on c.id = bc.category_id
  where bc.brand_id in (select distinct target_id from merge_ids)
  group by bc.brand_id
) sub
where b.id = sub.brand_id;
