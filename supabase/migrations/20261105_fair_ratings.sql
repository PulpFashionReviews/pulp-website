-- Fair ratings: each customer counts once per designer (their latest approved
-- review), plus a 12-month score. Repeat customers are grouped by an
-- anonymous per-designer key so account IDs are never exposed.

-- Approved reviews as shown publicly.
create or replace view public.review_feed
with (security_invoker = on) as
select
  r.id,
  r.brand_id,
  r.rating,
  r.review_text,
  r.created_at,
  r.updated_at,
  r.category_ratings,
  r.item_type,
  r.shipped_to,
  r.order_month,
  r.photo_paths,
  r.website_photo_url,
  r.received_photo_url,
  md5(r.user_id::text || ':' || r.brand_id::text) as reviewer_key,
  count(*) over (partition by r.brand_id, r.user_id) as reviewer_orders
from public.reviews r
where r.status = 'approved';

-- One row per designer with at least one approved review.
create or replace view public.brand_ratings
with (security_invoker = on) as
with latest as (
  select distinct on (brand_id, user_id) brand_id, user_id, rating
  from public.reviews
  where status = 'approved'
  order by brand_id, user_id, created_at desc
),
recent as (
  select distinct on (brand_id, user_id) brand_id, user_id, rating
  from public.reviews
  where status = 'approved' and created_at > now() - interval '12 months'
  order by brand_id, user_id, created_at desc
),
totals as (
  select brand_id, count(*) as total_reviews
  from public.reviews
  where status = 'approved'
  group by brand_id
)
select
  l.brand_id,
  round(avg(l.rating)::numeric, 2) as score,
  count(*)::int as customers,
  t.total_reviews::int as total_reviews,
  (select round(avg(x.rating)::numeric, 2) from recent x where x.brand_id = l.brand_id) as recent_score,
  (select count(*)::int from recent x where x.brand_id = l.brand_id) as recent_customers
from latest l
join totals t on t.brand_id = l.brand_id
group by l.brand_id, t.total_reviews;

grant select on public.review_feed, public.brand_ratings to anon, authenticated;
