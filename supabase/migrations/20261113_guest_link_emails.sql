-- PULP sends guest confirmation emails itself (through Resend), so the wording is ours.
create table if not exists public.guest_link_log (
  id bigint generated always as identity primary key,
  email text not null,
  created_at timestamptz not null default now()
);
create index if not exists guest_link_log_email_idx on public.guest_link_log (lower(email), created_at desc);
alter table public.guest_link_log enable row level security;
revoke all on public.guest_link_log from anon, authenticated;

-- Records a request and says whether it's allowed: 3 per email per hour, 150 per hour overall.
create or replace function public.guest_link_allowed(p_email text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select count(*) from public.guest_link_log where lower(email) = lower(p_email) and created_at > now() - interval '1 hour') >= 3 then
    return false;
  end if;
  if (select count(*) from public.guest_link_log where created_at > now() - interval '1 hour') >= 150 then
    return false;
  end if;
  insert into public.guest_link_log (email) values (lower(p_email));
  delete from public.guest_link_log where created_at < now() - interval '2 days';
  return true;
end;
$$;
revoke all on function public.guest_link_allowed(text) from public, anon, authenticated;
grant execute on function public.guest_link_allowed(text) to service_role;

create or replace function public.auth_user_by_email(p_email text)
returns table (id uuid, has_password boolean)
language sql
stable
security definer
set search_path = ''
as $$
  select u.id, coalesce(u.encrypted_password, '') <> '' from auth.users u where lower(u.email) = lower(p_email) limit 1;
$$;
revoke all on function public.auth_user_by_email(text) from public, anon, authenticated;
grant execute on function public.auth_user_by_email(text) to service_role;
