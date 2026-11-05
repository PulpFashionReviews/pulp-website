-- Only accounts with a confirmed email address may submit reviews.

create or replace function public.current_user_email_confirmed()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from auth.users
    where id = auth.uid() and email_confirmed_at is not null
  );
$$;

revoke all on function public.current_user_email_confirmed() from public, anon;
grant execute on function public.current_user_email_confirmed() to authenticated;

drop policy if exists "Signed-in users submit their own pending reviews" on public.reviews;
create policy "Signed-in users submit their own pending reviews"
  on public.reviews for insert
  to authenticated
  with check (
    auth.uid() = user_id
    and status = 'pending'
    and public.current_user_email_confirmed()
  );
