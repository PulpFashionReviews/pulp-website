-- Reword reviewer-facing messages: "vendor" -> "designer".
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
    new.updated_at := now();
  end if;
  return new;
end;
$$;
