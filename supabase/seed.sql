-- Local development seed. FICTIONAL DATA ONLY. Never put real names, guests or documents here.
-- 1) Sample wedding: the public read-only demo ("Jordan & Sam").
insert into public.wedding (id, name, date, location_text, region_code, guest_estimate, budget_total, is_sample, style_tags)
values ('00000000-0000-4000-8000-000000000001', 'Jordan & Sam', current_date + 210,
        'Asheville, NC', 'US-NC', 110, 32000, true, '{classic,outdoor}')
on conflict (id) do nothing;

insert into public.event (wedding_id, name, sort) values
  ('00000000-0000-4000-8000-000000000001', 'Ceremony', 1),
  ('00000000-0000-4000-8000-000000000001', 'Reception', 2),
  ('00000000-0000-4000-8000-000000000001', 'Welcome drinks', 0);

-- 2) Synthetic twin: shaped like the real wedding with fake names. Filled in once the
--    real wedding's shape (guest count, vendors, budget) is known. See docs/architecture.md 6a.
