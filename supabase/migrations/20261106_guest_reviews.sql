-- Guest reviews with proof of purchase.
--
-- A "guest" confirms their email with a one-click link instead of creating a
-- password. Guests must attach proof of purchase; anyone else may attach it
-- optionally. Proof is private (reviewer + admins only), never shown publicly,
-- and an admin can mark the review "Verified purchase" when approving it.
-- Proof files are deleted 30 days after the review is decided.

-- 1. New review fields -----------------------------------------------------------
alter table public.reviews
  add column if not exists proof_path text check (char_length(proof_path) <= 300),
  add column if not exists order_ref text check (char_length(order_ref) <= 80),
  add column if not exists verified_purchase boolean not null default false,
  add column if not exists decided_at timestamptz;

-- Each order number can back only one (non-rejected) review per designer.
create unique index if not exists reviews_unique_order_ref
  on public.reviews (brand_id, lower(regexp_replace(order_ref, '[^A-Za-z0-9]', '', 'g')))
  where order_ref is not null and status <> 'rejected';

-- 2. Is the signed-in person a guest (no password on their account)? ------------
create or replace function public.current_user_is_guest()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from auth.users
    where id = auth.uid() and coalesce(encrypted_password, '') = ''
  );
$$;
revoke all on function public.current_user_is_guest() from public, anon;
grant execute on function public.current_user_is_guest() to authenticated;

-- 3. Rules enforced on every insert/update ---------------------------------------
create or replace function public.reviews_enforce_rules()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  is_reviewer boolean := coalesce(auth.role(), '') = 'authenticated' and not public.is_admin();
begin
  if is_reviewer then
    -- Reviewers can't verify themselves, and proof must be their own file.
    if new.proof_path is not null and new.proof_path not like (auth.uid()::text || '/%') then
      raise exception 'Proof of purchase must be uploaded from your own account.' using errcode = 'P0001';
    end if;
    if public.current_user_is_guest() and new.proof_path is null then
      raise exception 'Guest reviews need a proof of purchase (receipt, order confirmation or bank statement line).'
        using errcode = 'P0001';
    end if;
    new.order_ref := nullif(btrim(new.order_ref), '');
  end if;

  if tg_op = 'INSERT' then
    if is_reviewer then
      new.verified_purchase := false;
      new.decided_at := null;
      if exists (
        select 1 from public.reviews r
        where r.user_id = new.user_id
          and r.brand_id = new.brand_id
          and r.status <> 'rejected'
          and r.created_at > now() - interval '30 days'
      ) then
        raise exception 'You can review this designer once every 30 days. You can edit your latest review instead.'
          using errcode = 'P0001';
      end if;
    end if;
  elsif tg_op = 'UPDATE' then
    if is_reviewer then
      if new.user_id <> old.user_id or new.brand_id <> old.brand_id then
        raise exception 'A review cannot be moved to another account or designer.' using errcode = 'P0001';
      end if;
      new.created_at := old.created_at;
      new.status := 'pending';
      new.decided_at := old.decided_at;
      -- New proof needs checking again.
      new.verified_purchase := case when new.proof_path is not distinct from old.proof_path
                                    then old.verified_purchase else false end;
    end if;
    -- Only the reviewer's own changes count as an edit; approvals don't.
    new.updated_at := case when is_reviewer then now() else old.updated_at end;
  end if;
  return new;
end;
$$;

-- 4. Public feed shows the badge, never the proof ---------------------------------
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
  count(*) over (partition by r.brand_id, r.user_id) as reviewer_orders,
  r.verified_purchase
from public.reviews r
where r.status = 'approved';

-- 5. Private proof storage ----------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('purchase-proofs', 'purchase-proofs', false, 10485760,
        array['image/jpeg', 'image/png', 'image/webp', 'application/pdf'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Reviewers upload proof to their own folder" on storage.objects;
create policy "Reviewers upload proof to their own folder"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'purchase-proofs'
    and (storage.foldername(name))[1] = auth.uid()::text
    and public.current_user_email_confirmed()
  );

drop policy if exists "Reviewers see their own proof" on storage.objects;
create policy "Reviewers see their own proof"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'purchase-proofs' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin()));

drop policy if exists "Reviewers and admins delete proof" on storage.objects;
create policy "Reviewers and admins delete proof"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'purchase-proofs' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin()));

-- 6. Admin functions ------------------------------------------------------------------
drop function if exists public.admin_review_queue(text);
create function public.admin_review_queue(p_status text default 'pending')
returns table (
  id bigint, brand_id bigint, brand_name text, rating int, review_text text,
  item_type text, shipped_to text, order_month date, category_ratings jsonb,
  photo_paths text[], created_at timestamptz, updated_at timestamptz, status text,
  reviewer_email text, reviewer_review_count bigint,
  proof_path text, order_ref text, verified_purchase boolean, is_guest boolean
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
           (select count(*) from public.reviews x where x.user_id = r.user_id),
           r.proof_path, r.order_ref, r.verified_purchase,
           coalesce(u.encrypted_password, '') = ''
    from public.reviews r
    join public.fashion_brands b on b.id = r.brand_id
    left join auth.users u on u.id = r.user_id
    where r.status = p_status
    order by case when p_status = 'pending' then r.created_at end asc,
             r.created_at desc
    limit 200;
end;
$$;
revoke all on function public.admin_review_queue(text) from public, anon;
grant execute on function public.admin_review_queue(text) to authenticated;

drop function if exists public.admin_set_review_status(bigint, text);
create function public.admin_set_review_status(p_id bigint, p_status text, p_verified boolean default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then raise exception 'Not authorized' using errcode = '42501'; end if;
  if p_status not in ('pending', 'approved', 'rejected') then raise exception 'Invalid status'; end if;
  update public.reviews
     set status = p_status,
         verified_purchase = case
           when p_status <> 'approved' then false
           when p_verified is null then verified_purchase
           else p_verified and proof_path is not null end,
         decided_at = case when p_status = 'pending' then null else now() end
   where id = p_id;
  if not found then raise exception 'Review % not found', p_id; end if;
end;
$$;
revoke all on function public.admin_set_review_status(bigint, text, boolean) from public, anon;
grant execute on function public.admin_set_review_status(bigint, text, boolean) to authenticated;

-- Proof files due for deletion: decided more than 30 days ago.
create or replace function public.admin_expired_proofs()
returns table (id bigint, proof_path text)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then raise exception 'Not authorized' using errcode = '42501'; end if;
  return query
    select r.id, r.proof_path from public.reviews r
    where r.proof_path is not null and r.status <> 'pending'
      and r.decided_at < now() - interval '30 days';
end;
$$;
revoke all on function public.admin_expired_proofs() from public, anon;
grant execute on function public.admin_expired_proofs() to authenticated;

create or replace function public.admin_clear_proofs(p_ids bigint[])
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then raise exception 'Not authorized' using errcode = '42501'; end if;
  update public.reviews set proof_path = null
  where id = any (p_ids) and status <> 'pending' and decided_at < now() - interval '30 days';
end;
$$;
revoke all on function public.admin_clear_proofs(bigint[]) from public, anon;
grant execute on function public.admin_clear_proofs(bigint[]) to authenticated;
