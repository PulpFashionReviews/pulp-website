-- Contact page messages. Anyone can send one; only admins can read them.
create table if not exists public.contact_messages (
  id bigint generated always as identity primary key,
  name text check (char_length(name) <= 100),
  email text not null check (char_length(email) between 3 and 200 and email like '%@%'),
  topic text not null check (topic in ('question', 'feedback', 'review', 'designer', 'press', 'other')),
  message text not null check (char_length(btrim(message)) between 10 and 5000),
  user_id uuid default auth.uid() references auth.users(id) on delete set null,
  handled boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.contact_messages enable row level security;

drop policy if exists "Anyone can send a message" on public.contact_messages;
create policy "Anyone can send a message"
  on public.contact_messages for insert to anon, authenticated
  with check (handled = false and (user_id is null or user_id = auth.uid()));

grant insert on public.contact_messages to anon, authenticated;

create or replace function public.admin_message_feed(p_handled boolean default false)
returns table (id bigint, name text, email text, topic text, message text, handled boolean, created_at timestamptz, account_email text)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then raise exception 'Not authorized' using errcode = '42501'; end if;
  return query
    select m.id, m.name, m.email, m.topic, m.message, m.handled, m.created_at, u.email::text
    from public.contact_messages m
    left join auth.users u on u.id = m.user_id
    where m.handled = p_handled
    order by m.created_at desc
    limit 200;
end;
$$;
revoke all on function public.admin_message_feed(boolean) from public, anon;
grant execute on function public.admin_message_feed(boolean) to authenticated;

create or replace function public.admin_set_message_handled(p_id bigint, p_handled boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then raise exception 'Not authorized' using errcode = '42501'; end if;
  update public.contact_messages set handled = p_handled where id = p_id;
end;
$$;
revoke all on function public.admin_set_message_handled(bigint, boolean) from public, anon;
grant execute on function public.admin_set_message_handled(bigint, boolean) to authenticated;
