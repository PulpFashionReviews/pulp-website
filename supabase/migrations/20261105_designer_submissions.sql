-- "Suggest a designer": submissions held for approval, plus the extra
-- brand fields they carry (Instagram, Facebook, ships-to countries).

-- 1. New brand fields ----------------------------------------------------------
alter table public.fashion_brands
  add column if not exists instagram text check (char_length(instagram) <= 200),
  add column if not exists facebook text check (char_length(facebook) <= 300),
  add column if not exists ships_to text[] not null default '{}';

-- 2. Submissions -----------------------------------------------------------------
create table if not exists public.designer_submissions (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  submitted_by uuid not null default auth.uid() references auth.users(id) on delete cascade,
  brand_name text not null check (char_length(trim(brand_name)) between 2 and 120),
  website text check (char_length(website) <= 300),
  instagram text check (char_length(instagram) <= 200),
  facebook text check (char_length(facebook) <= 300),
  category_ids smallint[] not null default '{}' check (cardinality(category_ids) between 1 and 9),
  price_range text check (price_range in ('Low', 'Medium', 'High')),
  ships_to text[] not null default '{}' check (cardinality(ships_to) <= 10),
  relationship text not null check (relationship in ('works_for_brand', 'customer', 'marketer')),
  notes text check (char_length(notes) <= 1000),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  approved_brand_id bigint references public.fashion_brands(id) on delete set null,
  constraint designer_submissions_has_link check (
    coalesce(nullif(trim(website), ''), nullif(trim(instagram), ''), nullif(trim(facebook), '')) is not null
  )
);
create index if not exists designer_submissions_status_idx on public.designer_submissions (status, created_at desc);
create index if not exists designer_submissions_user_idx on public.designer_submissions (submitted_by, created_at desc);

alter table public.designer_submissions enable row level security;

drop policy if exists "Confirmed users suggest designers" on public.designer_submissions;
create policy "Confirmed users suggest designers"
  on public.designer_submissions for insert
  to authenticated
  with check (
    submitted_by = auth.uid()
    and status = 'pending'
    and approved_brand_id is null
    and public.current_user_email_confirmed()
  );

drop policy if exists "Users see their own suggestions" on public.designer_submissions;
create policy "Users see their own suggestions"
  on public.designer_submissions for select
  to authenticated
  using (submitted_by = auth.uid());

-- Limits: 10 suggestions a day per account; no repeat of the same pending name.
create or replace function public.designer_submissions_limits()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if coalesce(auth.role(), '') = 'authenticated' then
    if (select count(*) from public.designer_submissions
        where submitted_by = new.submitted_by and created_at > now() - interval '1 day') >= 10 then
      raise exception 'You''ve reached today''s limit of 10 suggestions. Thank you — please try again tomorrow.' using errcode = 'P0001';
    end if;
    if exists (select 1 from public.designer_submissions
               where submitted_by = new.submitted_by and status = 'pending'
                 and lower(trim(brand_name)) = lower(trim(new.brand_name))) then
      raise exception 'You''ve already suggested this designer — it''s waiting for review.' using errcode = 'P0001';
    end if;
  end if;
  new.brand_name := trim(new.brand_name);
  return new;
end;
$$;

drop trigger if exists designer_submissions_limits on public.designer_submissions;
create trigger designer_submissions_limits
  before insert on public.designer_submissions
  for each row execute function public.designer_submissions_limits();

-- 3. Approval (dashboard / admin only) -------------------------------------------
-- Creates the designer listing from a submission and links its categories.
create or replace function public.approve_designer_submission(submission_id bigint)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  s public.designer_submissions;
  new_id bigint;
begin
  select * into s from public.designer_submissions where id = submission_id for update;
  if not found then raise exception 'Submission % not found', submission_id; end if;
  if s.status <> 'pending' then raise exception 'Submission % is already %', submission_id, s.status; end if;

  insert into public.fashion_brands ("Brand", "Category", "Price_Range", "Website", instagram, facebook, ships_to)
  values (
    s.brand_name,
    (select string_agg(c.name, ', ' order by c.sort_order) from public.categories c where c.id = any (s.category_ids)),
    s.price_range,
    nullif(trim(s.website), ''),
    nullif(trim(s.instagram), ''),
    nullif(trim(s.facebook), ''),
    s.ships_to
  )
  returning id into new_id;

  insert into public.brand_categories (brand_id, category_id)
  select new_id, c.id from public.categories c where c.id = any (s.category_ids)
  on conflict do nothing;

  update public.designer_submissions set status = 'approved', approved_brand_id = new_id where id = submission_id;
  return new_id;
end;
$$;

revoke all on function public.approve_designer_submission(bigint) from public, anon, authenticated;
revoke all on function public.designer_submissions_limits() from public, anon, authenticated;
