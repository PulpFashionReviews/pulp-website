-- Tag the major retail brands (originally labeled "Ready-to-wear unstitched")
-- with Lawn and Pret/Casual, which they all sell. Approved by the site owner.
with tags(brand) as (
  values ('Khaadi'), ('Gul Ahmed'), ('Gul Ahmed Ideas'), ('Sapphire'), ('Alkaram'), ('Nishat Linen'),
         ('Bareeze'), ('Beechtree'), ('Bonanza Satrangi'), ('Cross Stitch'), ('Generation'),
         ('Limelight'), ('Zellbury'), ('Sitara Studio')
)
insert into public.brand_categories (brand_id, category_id)
select b.id, c.id
from tags t
join public.fashion_brands b on b."Brand" = t.brand
cross join public.categories c
where c.name in ('Lawn', 'Pret/Casual')
on conflict do nothing;
