-- Admin moderation: who is an admin, and admin-only functions to review
-- and decide reviews and designer suggestions. Every function checks
-- is_admin() itself, so knowing the /admin address gives no access.

-- 1. Admins --------------------------------------------------------------------
create table if not exists public.admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  added_at timestamptz not null default now()
);
alter table public.admins enable row level security;  -- no policies: not readable through the API

insert into public.admins (user_id)
select id from auth.users where lower(email) = 'pulpfashionreviews@gmail.com'
on conflict do nothing;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;
revoke all on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

-- An admin's own edits shouldn't bounce their review back to "pending".
create or replace function public.reviews_enforce_rules()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  is_reviewer boolean := coalesce(auth.role(), '') = 'authenticated' and not public.is_admin();
begin
  if tg_op = 'INSERT' then
    if is_reviewer and exists (
      select 1 from public.reviews r
      where r.user_id = new.user_id
        and r.brand_id = new.brand_id
        and r.status <> 'rejected'
        and r.created_at > now() - interval '30 days'
    ) then
      raise exception 'You can review this designer once every 30 days. You can edit your latest review instead.'
        using errcode = 'P0001';
    end if;
  elsif tg_op = 'UPDATE' then
    if is_reviewer then
      if new.user_id <> old.user_id or new.brand_id <> old.brand_id then
        raise exception 'A review cannot be moved to another account or designer.' using errcode = 'P0001';
      end if;
      new.created_at := old.created_at;
      new.status := 'pending';
    end if;
    -- Only the reviewer's own changes count as an edit; approvals don't.
    new.updated_at := case when is_reviewer then now() else old.updated_at end;
  end if;
  return new;
end;
$$;

-- Admins can view every review photo (to moderate pending ones).
drop policy if exists "Admins see all review photos" on storage.objects;
create policy "Admins see all review photos"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'review-photos' and public.is_admin());

-- 2. Review queue ----------------------------------------------------------------
create or replace function public.admin_review_queue(p_status text default 'pending')
returns table (
  id bigint, brand_id bigint, brand_name text, rating int, review_text text,
  item_type text, shipped_to text, order_month date, category_ratings jsonb,
  photo_paths text[], created_at timestamptz, updated_at timestamptz, status text,
  reviewer_email text, reviewer_review_count bigint
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then raise exception 'Not authorized' using errcode = '42501'; end if;
  return query
    select r.id, r.brand_id, b."Brand", r.rating, r.review_text,
           r.item_type, r.shipped_to, r.order_month, r.category_ratings,
           r.photo_paths, r.created_at, r.updated_at, r.status,
           u.email::text,
           (select count(*) from public.reviews x where x.user_id = r.user_id)
    from public.reviews r
    join public.fashion_brands b on b.id = r.brand_id
    left join auth.users u on u.id = r.user_id
    where r.status = p_status
    order by case when p_status = 'pending' then r.created_at end asc,
             r.created_at desc
    limit 200;
end;
$$;

create or replace function public.admin_set_review_status(p_id bigint, p_status text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then raise exception 'Not authorized' using errcode = '42501'; end if;
  if p_status not in ('pending', 'approved', 'rejected') then raise exception 'Invalid status'; end if;
  update public.reviews set status = p_status where id = p_id;
  if not found then raise exception 'Review % not found', p_id; end if;
end;
$$;

-- 3. Designer suggestion queue ------------------------------------------------------
create or replace function public.admin_submission_queue(p_status text default 'pending')
returns table (
  id bigint, created_at timestamptz, brand_name text, website text, instagram text, facebook text,
  categories text, price_range text, ships_to text[], relationship text, notes text, status text,
  submitter_email text, approved_brand_id bigint, similar_existing text
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then raise exception 'Not authorized' using errcode = '42501'; end if;
  return query
    select s.id, s.created_at, s.brand_name, s.website, s.instagram, s.facebook,
           (select string_agg(c.name, ', ' order by c.sort_order) from public.categories c where c.id = any (s.category_ids)),
           s.price_range, s.ships_to, s.relationship, s.notes, s.status,
           u.email::text, s.approved_brand_id,
           (select string_agg(b."Brand", ', ') from public.fashion_brands b
             where regexp_replace(lower(b."Brand"), '[^a-z0-9]', '', 'g')
                   = regexp_replace(lower(s.brand_name), '[^a-z0-9]', '', 'g'))
    from public.designer_submissions s
    left join auth.users u on u.id = s.submitted_by
    where s.status = p_status
    order by case when p_status = 'pending' then s.created_at end asc,
             s.created_at desc
    limit 200;
end;
$$;

create or replace function public.admin_approve_submission(p_id bigint)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then raise exception 'Not authorized' using errcode = '42501'; end if;
  return public.approve_designer_submission(p_id);
end;
$$;

create or replace function public.admin_reject_submission(p_id bigint)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then raise exception 'Not authorized' using errcode = '42501'; end if;
  update public.designer_submissions set status = 'rejected' where id = p_id and status = 'pending';
  if not found then raise exception 'Suggestion % is not pending', p_id; end if;
end;
$$;

revoke all on function public.admin_review_queue(text), public.admin_set_review_status(bigint, text),
  public.admin_submission_queue(text), public.admin_approve_submission(bigint), public.admin_reject_submission(bigint)
  from public, anon;
grant execute on function public.admin_review_queue(text), public.admin_set_review_status(bigint, text),
  public.admin_submission_queue(text), public.admin_approve_submission(bigint), public.admin_reject_submission(bigint)
  to authenticated;
