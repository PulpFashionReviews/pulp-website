-- Rename the directory category Pret -> Pret/Casual (matches Luxury Pret/Festive).
update public.categories set name = 'Pret/Casual' where name = 'Pret';
