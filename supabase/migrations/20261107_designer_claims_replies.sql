-- Designer accounts, phase 1: designers claim their page (approved by an admin)
-- and can then reply publicly to reviews for free.

-- 1. Who manages which designer page ---------------------------------------------------
alter table public.fashion_brands add column if not exists claimed_at timestamptz;

create table if not exists public.brand_managers (
  brand_id bigint not null references public.fashion_brands(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  added_at timestamptz not null default now(),
  primary key (brand_id, user_id)
);
alter table public.brand_managers enable row level security;

drop policy if exists "Managers see their own pages" on public.brand_managers;
create policy "Managers see their own pages"
  on public.brand_managers for select to authenticated
  using (user_id = auth.uid());

create or replace function public.is_brand_manager(p_brand_id bigint)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.brand_managers where brand_id = p_brand_id and user_id = auth.uid());
$$;
revoke all on function public.is_brand_manager(bigint) from public, anon;
grant execute on function public.is_brand_manager(bigint) to authenticated;

-- 2. Claim requests ---------------------------------------------------------------------
create table if not exists public.designer_claims (
  id bigint generated always as identity primary key,
  brand_id bigint not null references public.fashion_brands(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  contact_name text not null check (char_length(btrim(contact_name)) between 2 and 100),
  role text not null check (role in ('owner', 'staff', 'agency')),
  business_email text check (char_length(business_email) <= 200),
  instagram text check (char_length(instagram) <= 200),
  note text check (char_length(note) <= 1000),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  decided_at timestamptz
);
alter table public.designer_claims enable row level security;

-- One open claim per person per designer.
create unique index if not exists designer_claims_one_pending
  on public.designer_claims (brand_id, user_id) where status = 'pending';

-- Claims need a password account (not a guest) with a confirmed email.
drop policy if exists "Account holders submit claims" on public.designer_claims;
create policy "Account holders submit claims"
  on public.designer_claims for insert to authenticated
  with check (
    user_id = auth.uid() and status = 'pending' and decided_at is null
    and public.current_user_email_confirmed() and not public.current_user_is_guest()
  );

drop policy if exists "Claimants see their own claims" on public.designer_claims;
create policy "Claimants see their own claims"
  on public.designer_claims for select to authenticated
  using (user_id = auth.uid());

-- 3. Public replies -----------------------------------------------------------------------
create table if not exists public.review_replies (
  id bigint generated always as identity primary key,
  review_id bigint not null unique references public.reviews(id) on delete cascade,
  brand_id bigint not null references public.fashion_brands(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  body text not null check (char_length(btrim(body)) between 2 and 2000),
  hidden boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);
alter table public.review_replies enable row level security;

-- Keep brand_id in step with the review, and only managers of that designer may reply.
create or replace function public.review_replies_enforce()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  is_mod boolean := public.is_admin();
begin
  select r.brand_id into new.brand_id from public.reviews r where r.id = new.review_id;
  if new.brand_id is null then raise exception 'Review not found.' using errcode = 'P0001'; end if;
  if not is_mod then
    if not public.is_brand_manager(new.brand_id) then
      raise exception 'Only the designer can reply to this review.' using errcode = '42501';
    end if;
    new.user_id := auth.uid();
    if tg_op = 'INSERT' then
      new.hidden := false;
      new.created_at := now();
    else
      new.hidden := old.hidden;          -- designers can't un-hide a moderated reply
      new.created_at := old.created_at;
      new.updated_at := now();
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists review_replies_enforce on public.review_replies;
create trigger review_replies_enforce
  before insert or update on public.review_replies
  for each row execute function public.review_replies_enforce();

drop policy if exists "Anyone reads visible replies" on public.review_replies;
create policy "Anyone reads visible replies"
  on public.review_replies for select
  using (
    (not hidden and exists (select 1 from public.reviews r where r.id = review_id and r.status = 'approved'))
    or public.is_brand_manager(brand_id)
  );

drop policy if exists "Designers write replies" on public.review_replies;
create policy "Designers write replies"
  on public.review_replies for insert to authenticated
  with check (public.is_brand_manager(brand_id));

drop policy if exists "Designers edit replies" on public.review_replies;
create policy "Designers edit replies"
  on public.review_replies for update to authenticated
  using (public.is_brand_manager(brand_id))
  with check (public.is_brand_manager(brand_id));

drop policy if exists "Designers delete replies" on public.review_replies;
create policy "Designers delete replies"
  on public.review_replies for delete to authenticated
  using (public.is_brand_manager(brand_id));

grant select on public.review_replies to anon, authenticated;
grant insert, update, delete on public.review_replies to authenticated;
grant select, insert on public.designer_claims to authenticated;
grant select on public.brand_managers to authenticated;

-- 4. Admin functions ------------------------------------------------------------------------
create or replace function public.admin_claim_queue(p_status text default 'pending')
returns table (
  id bigint, brand_id bigint, brand_name text, brand_website text, brand_instagram text,
  contact_name text, role text, business_email text, instagram text, note text,
  status text, created_at timestamptz, account_email text, already_claimed boolean
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then raise exception 'Not authorized' using errcode = '42501'; end if;
  return query
    select c.id, c.brand_id, b."Brand", b."Website", b.instagram,
           c.contact_name, c.role, c.business_email, c.instagram, c.note,
           c.status, c.created_at, u.email::text, b.claimed_at is not null
    from public.designer_claims c
    join public.fashion_brands b on b.id = c.brand_id
    left join auth.users u on u.id = c.user_id
    where c.status = p_status
    order by case when p_status = 'pending' then c.created_at end asc, c.created_at desc
    limit 200;
end;
$$;
revoke all on function public.admin_claim_queue(text) from public, anon;
grant execute on function public.admin_claim_queue(text) to authenticated;

create or replace function public.admin_decide_claim(p_id bigint, p_approve boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  c public.designer_claims;
begin
  if not public.is_admin() then raise exception 'Not authorized' using errcode = '42501'; end if;
  select * into c from public.designer_claims where id = p_id;
  if not found then raise exception 'Claim % not found', p_id; end if;
  update public.designer_claims
     set status = case when p_approve then 'approved' else 'rejected' end, decided_at = now()
   where id = p_id;
  if p_approve then
    insert into public.brand_managers (brand_id, user_id) values (c.brand_id, c.user_id) on conflict do nothing;
    update public.fashion_brands set claimed_at = coalesce(claimed_at, now()) where id = c.brand_id;
  end if;
end;
$$;
revoke all on function public.admin_decide_claim(bigint, boolean) from public, anon;
grant execute on function public.admin_decide_claim(bigint, boolean) to authenticated;

create or replace function public.admin_reply_feed()
returns table (
  id bigint, review_id bigint, brand_id bigint, brand_name text, body text, hidden boolean,
  created_at timestamptz, updated_at timestamptz, author_email text, review_text text, review_rating int
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then raise exception 'Not authorized' using errcode = '42501'; end if;
  return query
    select x.id, x.review_id, x.brand_id, b."Brand", x.body, x.hidden, x.created_at, x.updated_at,
           u.email::text, r.review_text, r.rating
    from public.review_replies x
    join public.fashion_brands b on b.id = x.brand_id
    join public.reviews r on r.id = x.review_id
    left join auth.users u on u.id = x.user_id
    order by coalesce(x.updated_at, x.created_at) desc
    limit 200;
end;
$$;
revoke all on function public.admin_reply_feed() from public, anon;
grant execute on function public.admin_reply_feed() to authenticated;

create or replace function public.admin_set_reply_hidden(p_id bigint, p_hidden boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then raise exception 'Not authorized' using errcode = '42501'; end if;
  update public.review_replies set hidden = p_hidden where id = p_id;
end;
$$;
revoke all on function public.admin_set_reply_hidden(bigint, boolean) from public, anon;
grant execute on function public.admin_set_reply_hidden(bigint, boolean) to authenticated;

-- The public reply policy calls is_brand_manager(), so visitors need to be able to run it (it returns false for them).
grant execute on function public.is_brand_manager(bigint) to anon;
