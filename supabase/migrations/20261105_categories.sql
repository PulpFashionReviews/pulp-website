-- PULP categories: a clean category list, rules that map the raw labels in
-- fashion_brands."Category" to it, and the resulting brand ↔ category links.
-- fashion_brands."Category" is left untouched as the original source text.

create table if not exists public.categories (
  id smallint generated always as identity primary key,
  name text not null unique,
  sort_order smallint not null
);

-- One raw label can map to more than one category (e.g. "bridal luxury formal").
create table if not exists public.category_rules (
  raw_label text not null check (raw_label = lower(trim(raw_label))),
  category_id smallint not null references public.categories(id) on delete cascade,
  primary key (raw_label, category_id)
);

create table if not exists public.brand_categories (
  brand_id bigint not null references public.fashion_brands(id) on delete cascade,
  category_id smallint not null references public.categories(id) on delete cascade,
  primary key (brand_id, category_id)
);
create index if not exists brand_categories_category_idx on public.brand_categories (category_id);

insert into public.categories (name, sort_order) values
  ('Bridal', 1), ('Formal', 2), ('Luxury Pret/Festive', 3), ('Pret', 4), ('Lawn', 5),
  ('Unstitched', 6), ('Menswear', 7), ('Kids', 8), ('Jewelry/Accessories', 9)
on conflict (name) do nothing;

insert into public.category_rules (raw_label, category_id)
select r.raw_label, c.id
from (values
  ('bridal', 'Bridal'),
  ('wedding wear', 'Bridal'),
  ('bridal couture', 'Bridal'),
  ('bridal luxury formal', 'Bridal'),
  ('bridal luxury formal', 'Formal'),
  ('couture', 'Formal'),
  ('formal', 'Formal'),
  ('luxury pret formal', 'Luxury Pret/Festive'),
  ('luxury pret formal', 'Formal'),
  ('luxury pret', 'Luxury Pret/Festive'),
  ('festive', 'Luxury Pret/Festive'),
  ('pret', 'Pret'),
  ('basics', 'Pret'),
  ('lawn', 'Lawn'),
  ('unstitched', 'Unstitched'),
  ('ready-to-wear unstitched', 'Unstitched')
) as r(raw_label, category_name)
join public.categories c on c.name = r.category_name
on conflict do nothing;

-- Assign categories to existing brands from their raw labels.
-- Re-runnable: call again after adding rules to pick up new matches.
create or replace function public.apply_category_rules()
returns integer
language sql
security definer
set search_path = public
as $$
  with inserted as (
    insert into public.brand_categories (brand_id, category_id)
    select distinct b.id, r.category_id
    from public.fashion_brands b
    cross join lateral unnest(string_to_array(coalesce(b."Category", ''), ',')) as raw(label)
    join public.category_rules r on r.raw_label = lower(trim(raw.label))
    on conflict do nothing
    returning 1
  )
  select count(*)::integer from inserted;
$$;
revoke all on function public.apply_category_rules() from public, anon, authenticated;

select public.apply_category_rules();

-- Public visitors may read these; nobody but the dashboard/service role may write.
alter table public.categories enable row level security;
alter table public.category_rules enable row level security;
alter table public.brand_categories enable row level security;

drop policy if exists "Anyone can read categories" on public.categories;
create policy "Anyone can read categories" on public.categories for select using (true);

drop policy if exists "Anyone can read category rules" on public.category_rules;
create policy "Anyone can read category rules" on public.category_rules for select using (true);

drop policy if exists "Anyone can read brand categories" on public.brand_categories;
create policy "Anyone can read brand categories" on public.brand_categories for select using (true);
