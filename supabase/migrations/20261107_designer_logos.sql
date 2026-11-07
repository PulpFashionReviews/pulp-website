-- Free logos for claimed designer pages. Logos are public images uploaded by the
-- designer's verified managers (or an admin) into designer-logos/<brand id>/...

alter table public.fashion_brands add column if not exists logo_path text check (char_length(logo_path) <= 300);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('designer-logos', 'designer-logos', true, 2097152, array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Only managers of that designer (or admins) can add or remove its logo files.
create or replace function public.can_manage_logo_folder(p_folder text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_admin()
      or (p_folder ~ '^[0-9]+$' and public.is_brand_manager(p_folder::bigint));
$$;
revoke all on function public.can_manage_logo_folder(text) from public, anon;
grant execute on function public.can_manage_logo_folder(text) to authenticated;

drop policy if exists "Designers upload their logo" on storage.objects;
create policy "Designers upload their logo"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'designer-logos' and public.can_manage_logo_folder((storage.foldername(name))[1]));

drop policy if exists "Designers remove their logo" on storage.objects;
create policy "Designers remove their logo"
  on storage.objects for delete to authenticated
  using (bucket_id = 'designer-logos' and public.can_manage_logo_folder((storage.foldername(name))[1]));

-- Set or clear the logo shown on a designer page.
create or replace function public.set_brand_logo(p_brand_id bigint, p_path text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not (public.is_admin() or public.is_brand_manager(p_brand_id)) then
    raise exception 'Only the designer can change this logo.' using errcode = '42501';
  end if;
  if p_path is not null and p_path not like (p_brand_id::text || '/%') then
    raise exception 'Invalid logo file.' using errcode = 'P0001';
  end if;
  update public.fashion_brands set logo_path = p_path where id = p_brand_id;
end;
$$;
revoke all on function public.set_brand_logo(bigint, text) from public, anon;
grant execute on function public.set_brand_logo(bigint, text) to authenticated;
