-- Launch batch 1: approval emails, scheduled proof deletion, contact-form spam limits.

-- 1. Approval emails ------------------------------------------------------------------
alter table public.reviews add column if not exists approval_emailed_at timestamptz;

-- Who to email about an approved review (admin only).
create or replace function public.admin_review_notice(p_id bigint)
returns table (email text, brand_id bigint, brand_name text, status text, already_emailed boolean)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then raise exception 'Not authorized' using errcode = '42501'; end if;
  return query
    select u.email::text, r.brand_id, b."Brand", r.status, r.approval_emailed_at is not null
    from public.reviews r
    join public.fashion_brands b on b.id = r.brand_id
    left join auth.users u on u.id = r.user_id
    where r.id = p_id;
end;
$$;
revoke all on function public.admin_review_notice(bigint) from public, anon;
grant execute on function public.admin_review_notice(bigint) to authenticated;

create or replace function public.admin_mark_review_emailed(p_id bigint)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then raise exception 'Not authorized' using errcode = '42501'; end if;
  update public.reviews set approval_emailed_at = now() where id = p_id;
end;
$$;
revoke all on function public.admin_mark_review_emailed(bigint) from public, anon;
grant execute on function public.admin_mark_review_emailed(bigint) to authenticated;

-- 2. Proof-of-purchase files deleted automatically 30 days after a decision -------------
-- A daily job (Vercel cron → /api/keep-alive, using the server-only service key) lists the
-- expired files, deletes them through the Storage API, then clears the references.
create or replace function public.expired_proof_paths()
returns setof text
language sql
stable
security definer
set search_path = ''
as $$
  select r.proof_path from public.reviews r
  where r.proof_path is not null and r.status <> 'pending'
    and r.decided_at < now() - interval '30 days'
  limit 200;
$$;
revoke all on function public.expired_proof_paths() from public;
revoke all on function public.expired_proof_paths() from anon, authenticated;
grant execute on function public.expired_proof_paths() to service_role;

create or replace function public.clear_expired_proofs()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare n integer;
begin
  update public.reviews r set proof_path = null
  where r.proof_path is not null and r.status <> 'pending'
    and r.decided_at < now() - interval '30 days'
    and not exists (select 1 from storage.objects o where o.bucket_id = 'purchase-proofs' and o.name = r.proof_path);
  get diagnostics n = row_count;
  return n;
end;
$$;
revoke all on function public.clear_expired_proofs() from public;
revoke all on function public.clear_expired_proofs() from anon, authenticated;
grant execute on function public.clear_expired_proofs() to service_role;

-- 3. Contact form limits -----------------------------------------------------------------
create or replace function public.contact_messages_limits()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select count(*) from public.contact_messages
      where lower(email) = lower(new.email) and created_at > now() - interval '1 hour') >= 5 then
    raise exception 'You''ve sent several messages in the last hour. Please wait a little before sending another.' using errcode = 'P0001';
  end if;
  if (select count(*) from public.contact_messages where created_at > now() - interval '1 hour') >= 40 then
    raise exception 'We''re getting a lot of messages right now. Please try again in an hour, or email us directly.' using errcode = 'P0001';
  end if;
  return new;
end;
$$;
revoke all on function public.contact_messages_limits() from public, anon, authenticated;
drop trigger if exists contact_messages_limits on public.contact_messages;
create trigger contact_messages_limits
  before insert on public.contact_messages
  for each row execute function public.contact_messages_limits();
