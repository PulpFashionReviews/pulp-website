-- "Suggest a designer" no longer needs an account. Visitors can leave an email (optional).

alter table public.designer_submissions alter column submitted_by drop not null;
alter table public.designer_submissions
  add column if not exists contact_email text check (contact_email is null or (char_length(contact_email) between 3 and 200 and contact_email like '%@%'));

drop policy if exists "Confirmed users suggest designers" on public.designer_submissions;
drop policy if exists "Anyone can suggest designers" on public.designer_submissions;
create policy "Anyone can suggest designers"
  on public.designer_submissions for insert
  to anon, authenticated
  with check (
    (submitted_by is null or submitted_by = auth.uid())
    and status = 'pending'
    and approved_brand_id is null
  );
grant insert on public.designer_submissions to anon;

-- Limits: per account as before; for visitors without an account, a site-wide hourly cap
-- (spam guard) and no repeat of a designer that's already waiting for review.
create or replace function public.designer_submissions_limits()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.brand_name := trim(new.brand_name);
  new.contact_email := nullif(trim(new.contact_email), '');
  if new.submitted_by is not null then
    if (select count(*) from public.designer_submissions
        where submitted_by = new.submitted_by and created_at > now() - interval '1 day') >= 10 then
      raise exception 'You''ve reached today''s limit of 10 suggestions. Thank you — please try again tomorrow.' using errcode = 'P0001';
    end if;
  else
    if (select count(*) from public.designer_submissions
        where submitted_by is null and created_at > now() - interval '1 hour') >= 30 then
      raise exception 'We''re getting a lot of suggestions right now. Please try again in an hour.' using errcode = 'P0001';
    end if;
  end if;
  if exists (select 1 from public.designer_submissions
             where status = 'pending'
               and regexp_replace(lower(brand_name), '[^a-z0-9]', '', 'g') = regexp_replace(lower(new.brand_name), '[^a-z0-9]', '', 'g')) then
    raise exception 'Thanks! This designer has already been suggested and is waiting for review.' using errcode = 'P0001';
  end if;
  return new;
end;
$$;
revoke all on function public.designer_submissions_limits() from public, anon, authenticated;

-- Admin queue: show the account email, or the email the visitor left.
create or replace function public.admin_submission_queue(p_status text default 'pending')
returns table(id bigint, created_at timestamptz, brand_name text, website text, instagram text, facebook text, categories text,
  price_range text, ships_to text[], relationship text, notes text, status text, submitter_email text, approved_brand_id bigint, similar_existing text)
language plpgsql
stable
security definer
set search_path = ''
as $function$
begin
  if not public.is_admin() then raise exception 'Not authorized' using errcode = '42501'; end if;
  return query
    select s.id, s.created_at, s.brand_name, s.website, s.instagram, s.facebook,
           (select string_agg(c.name, ', ' order by c.sort_order) from public.categories c where c.id = any (s.category_ids)),
           s.price_range, s.ships_to, s.relationship, s.notes, s.status,
           coalesce(u.email::text, s.contact_email), s.approved_brand_id,
           (select string_agg(b."Brand", ', ') from public.fashion_brands b
             where regexp_replace(lower(b."Brand"), '[^a-z0-9]', '', 'g')
                   = regexp_replace(lower(s.brand_name), '[^a-z0-9]', '', 'g'))
    from public.designer_submissions s
    left join auth.users u on u.id = s.submitted_by
    where s.status = p_status
    order by case when p_status = 'pending' then s.created_at end asc,
             s.created_at desc
    limit 200;
end;
$function$;

-- "I'm the designer" as its own answer to "How do you know this designer?"
alter table public.designer_submissions drop constraint if exists designer_submissions_relationship_check;
alter table public.designer_submissions add constraint designer_submissions_relationship_check
  check (relationship in ('designer', 'works_for_brand', 'customer', 'marketer'));

-- Categories are optional on suggestions (the admin can add them when approving).
alter table public.designer_submissions drop constraint if exists designer_submissions_category_ids_check;
alter table public.designer_submissions add constraint designer_submissions_category_ids_check check (cardinality(category_ids) <= 20);
