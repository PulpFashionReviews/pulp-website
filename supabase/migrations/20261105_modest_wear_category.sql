-- New directory category for modest wear and hijab brands.
insert into public.categories (name, sort_order) values ('Modest Wear & Hijabs', 10) on conflict (name) do nothing;
