-- Supabase now gives email-link accounts a hidden random password, so "no password" no longer
-- identifies guests. Use the guest flag set when the guest link was requested instead.
create or replace function public.current_user_is_guest()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from auth.users
    where id = auth.uid()
      and (coalesce(raw_app_meta_data->>'guest', raw_user_meta_data->>'guest', 'false') = 'true'
           or coalesce(encrypted_password, '') = '')
  );
$$;
