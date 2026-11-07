-- Guests no longer need proof of purchase; they need at least one photo of what they received.
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
    if new.proof_path is not null and new.proof_path not like (auth.uid()::text || '/%') then
      raise exception 'Proof of purchase must be uploaded from your own account.' using errcode = 'P0001';
    end if;
    if public.current_user_is_guest() and cardinality(coalesce(new.photo_paths, '{}')) = 0 then
      raise exception 'Guest reviews need at least one photo of what you received.' using errcode = 'P0001';
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
      new.verified_purchase := case when new.proof_path is not distinct from old.proof_path
                                    then old.verified_purchase else false end;
    end if;
    new.updated_at := case when is_reviewer then now() else old.updated_at end;
  end if;
  return new;
end;
$$;
