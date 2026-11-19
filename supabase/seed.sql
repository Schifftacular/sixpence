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

-- Sample wedding budget and checklist (fictional).
insert into public.budget_category (wedding_id, key, name, target_amount, sort) values
  ('00000000-0000-4000-8000-000000000001', 'venue', 'Venue', 9600, 0),
  ('00000000-0000-4000-8000-000000000001', 'catering', 'Food & drink', 7700, 1),
  ('00000000-0000-4000-8000-000000000001', 'photo', 'Photography', 3200, 2),
  ('00000000-0000-4000-8000-000000000001', 'music', 'Music & DJ', 1300, 3),
  ('00000000-0000-4000-8000-000000000001', 'flowers', 'Flowers & decor', 2550, 4),
  ('00000000-0000-4000-8000-000000000001', 'attire', 'Attire', 1900, 5),
  ('00000000-0000-4000-8000-000000000001', 'other', 'Everything else', 5750, 6);

insert into public.task (wedding_id, title, category, due_date, status, source) values
  ('00000000-0000-4000-8000-000000000001', 'Book your venue', 'venue', current_date - 60, 'done', 'template'),
  ('00000000-0000-4000-8000-000000000001', 'Book your photographer', 'photo', current_date - 20, 'done', 'template'),
  ('00000000-0000-4000-8000-000000000001', 'Book your florist', 'flowers', current_date + 5, 'todo', 'template'),
  ('00000000-0000-4000-8000-000000000001', 'Set up a hotel block for guests', 'guests', current_date + 6, 'todo', 'template'),
  ('00000000-0000-4000-8000-000000000001', 'Book hair and makeup', 'beauty', current_date + 30, 'todo', 'template'),
  ('00000000-0000-4000-8000-000000000001', 'Send invitations', 'stationery', current_date + 135, 'todo', 'template');
