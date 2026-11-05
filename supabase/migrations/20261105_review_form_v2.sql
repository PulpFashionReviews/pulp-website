-- Review form v2: order details, photo uploads, editing your own review,
-- and a limit of one review per vendor every 30 days.

-- 1. New review details ------------------------------------------------------
alter table public.reviews
  add column if not exists item_type text check (char_length(item_type) <= 60),
  add column if not exists shipped_to text check (char_length(shipped_to) <= 60),
  add column if not exists order_month date check (order_month = date_trunc('month', order_month)::date),
  add column if not exists photo_paths text[] not null default '{}' check (cardinality(photo_paths) <= 4),
  add column if not exists updated_at timestamptz;

-- 2. Rules enforced on every insert/update -----------------------------------
-- * One review per vendor every 30 days (rejected reviews don't count).
-- * A signed-in reviewer editing their review can't change who/which vendor
--   it's for, and the edit goes back to "pending" for re-approval.
-- * Approving/rejecting from the Supabase dashboard is unaffected.
create or replace function public.reviews_enforce_rules()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  is_reviewer boolean := coalesce(auth.role(), '') = 'authenticated';
begin
  if tg_op = 'INSERT' then
    if is_reviewer and exists (
      select 1 from public.reviews r
      where r.user_id = new.user_id
        and r.brand_id = new.brand_id
        and r.status <> 'rejected'
        and r.created_at > now() - interval '30 days'
    ) then
      raise exception 'You can review this vendor once every 30 days. You can edit your latest review instead.'
        using errcode = 'P0001';
    end if;
  elsif tg_op = 'UPDATE' then
    if is_reviewer then
      if new.user_id <> old.user_id or new.brand_id <> old.brand_id then
        raise exception 'A review cannot be moved to another account or vendor.' using errcode = 'P0001';
      end if;
      new.created_at := old.created_at;
      new.status := 'pending';
    end if;
    new.updated_at := now();
  end if;
  return new;
end;
$$;

drop trigger if exists reviews_enforce_rules on public.reviews;
create trigger reviews_enforce_rules
  before insert or update on public.reviews
  for each row execute function public.reviews_enforce_rules();

-- Reviewers may edit their own reviews (confirmed email required).
drop policy if exists "Reviewers edit their own reviews" on public.reviews;
create policy "Reviewers edit their own reviews"
  on public.reviews for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id and public.current_user_email_confirmed());

-- 3. Photo storage -------------------------------------------------------------
-- Private bucket. Files live under <user id>/<random name>.
-- Owners can always see their own photos; everyone else only once the review
-- that uses them is approved.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('review-photos', 'review-photos', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Reviewers upload photos to their own folder" on storage.objects;
create policy "Reviewers upload photos to their own folder"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'review-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
    and public.current_user_email_confirmed()
  );

drop policy if exists "Reviewers manage their own photos" on storage.objects;
create policy "Reviewers manage their own photos"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'review-photos' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Reviewers see their own photos" on storage.objects;
create policy "Reviewers see their own photos"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'review-photos' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Anyone sees photos on approved reviews" on storage.objects;
create policy "Anyone sees photos on approved reviews"
  on storage.objects for select
  using (
    bucket_id = 'review-photos'
    and exists (
      select 1 from public.reviews r
      where r.status = 'approved' and storage.objects.name = any (r.photo_paths)
    )
  );
