-- Local development seed. FICTIONAL DATA ONLY. Never put real names, guests or documents here.
-- The sample wedding ("Jordan & Sam") is the public, read-only demo: about 7 months out, six vendors
-- booked, payments, a guest list with some RSVPs, and a draft of The Day. Dates move with current_date.

insert into public.wedding (id, name, date, location_text, region_code, lat, lng, guest_estimate, budget_total,
  is_sample, style_tags, rsvp_deadline, meal_options, ceremony_time, planning_stage, priorities)
values ('00000000-0000-4000-8000-000000000001', 'Jordan & Sam', current_date + 210, 'Asheville, NC', 'US-NC', 35.5951, -82.5515, 110, 32000,
  true, '{garden,relaxed,warm}', current_date + 160, '{"Chicken","Trout","Mushroom risotto (v)"}', '16:30', 'some_vendors',
  '{food,photos}')
on conflict (id) do nothing;

insert into public.event (wedding_id, name, sort) values
  ('00000000-0000-4000-8000-000000000001', 'Welcome drinks', 0), ('00000000-0000-4000-8000-000000000001', 'Ceremony', 1), ('00000000-0000-4000-8000-000000000001', 'Reception', 2);

insert into public.budget_category (wedding_id, key, name, target_amount, sort, per_guest) values
  ('00000000-0000-4000-8000-000000000001', 'venue', 'Venue', 9000, 0, false),
  ('00000000-0000-4000-8000-000000000001', 'catering', 'Food & drink', 7500, 1, true),
  ('00000000-0000-4000-8000-000000000001', 'photo', 'Photography', 3200, 2, false),
  ('00000000-0000-4000-8000-000000000001', 'video', 'Videography', 1200, 3, false),
  ('00000000-0000-4000-8000-000000000001', 'music', 'Music & DJ', 1400, 4, false),
  ('00000000-0000-4000-8000-000000000001', 'flowers', 'Flowers & decor', 2600, 5, false),
  ('00000000-0000-4000-8000-000000000001', 'attire', 'Attire', 1900, 6, false),
  ('00000000-0000-4000-8000-000000000001', 'beauty', 'Hair & makeup', 600, 7, false),
  ('00000000-0000-4000-8000-000000000001', 'cake', 'Cake & desserts', 700, 8, true),
  ('00000000-0000-4000-8000-000000000001', 'stationery', 'Invitations & paper', 600, 9, true),
  ('00000000-0000-4000-8000-000000000001', 'rings', 'Rings', 1000, 10, false),
  ('00000000-0000-4000-8000-000000000001', 'officiant', 'Officiant', 400, 11, false),
  ('00000000-0000-4000-8000-000000000001', 'transport', 'Transportation', 500, 12, false),
  ('00000000-0000-4000-8000-000000000001', 'favors', 'Favors & gifts', 300, 13, true),
  ('00000000-0000-4000-8000-000000000001', 'rentals', 'Rentals', 900, 14, true),
  ('00000000-0000-4000-8000-000000000001', 'other', 'Cushion', 200, 15, false);

insert into public.contribution (wedding_id, from_label, amount) values
  ('00000000-0000-4000-8000-000000000001', 'Us', 22000), ('00000000-0000-4000-8000-000000000001', 'Jordan''s parents', 8000), ('00000000-0000-4000-8000-000000000001', 'Sam''s grandmother', 2000);

insert into public.vendor (id, wedding_id, category_key, name, status, phone, email, website, lat, lng, notes, tags, arrival_time, onsite_contact, booked_at, follow_up_on) values
  ('00000000-0000-4000-8000-000000000101', '00000000-0000-4000-8000-000000000001', 'venue', 'Laurel Ridge Farm', 'booked', '(828) 555-0141', 'events@laurelridge.example', 'https://laurelridge.example', '35.62', '-82.66', 'Barn and meadow, rain plan in the barn.', '{"Loved the meadow"}', '15:00', 'Dana (venue manager)', now() - interval '30 days', null),
  ('00000000-0000-4000-8000-000000000102', '00000000-0000-4000-8000-000000000001', 'photo', 'Juniper & Pine Photo', 'booked', '(828) 555-0177', 'hello@juniperpine.example', 'https://juniperpine.example', null, null, '8 hours, second shooter included.', '{"Loved their portfolio"}', '13:30', 'Mara', now() - interval '60 days', null),
  ('00000000-0000-4000-8000-000000000103', '00000000-0000-4000-8000-000000000001', 'catering', 'Blue Ridge Table', 'booked', '(828) 555-0102', 'book@blueridgetable.example', 'https://blueridgetable.example', null, null, 'Family-style dinner. Final headcount 3 weeks out.', '{}', '14:00', 'Chef Luis', now() - interval '90 days', null),
  ('00000000-0000-4000-8000-000000000104', '00000000-0000-4000-8000-000000000001', 'flowers', 'Wild Fern Florals', 'booked', '(828) 555-0190', 'studio@wildfern.example', null, null, null, 'Garden style, lots of greenery.', '{}', '12:00', null, now() - interval '120 days', null),
  ('00000000-0000-4000-8000-000000000105', '00000000-0000-4000-8000-000000000001', 'music', 'Night Owl Sound', 'booked', '(828) 555-0133', null, 'https://nightowl.example', null, null, 'DJ plus ceremony mics.', '{"Slow to reply"}', '15:30', null, now() - interval '150 days', null),
  ('00000000-0000-4000-8000-000000000106', '00000000-0000-4000-8000-000000000001', 'officiant', 'Alex Rivera, officiant', 'booked', '(828) 555-0119', null, null, null, null, 'Friend of the family.', '{}', '16:00', null, now() - interval '180 days', null),
  ('00000000-0000-4000-8000-000000000107', '00000000-0000-4000-8000-000000000001', 'cake', 'Sugar Hollow Bakery', 'quoted', '(828) 555-0160', 'orders@sugarhollow.example', null, null, null, null, '{}', null, null, null, null),
  ('00000000-0000-4000-8000-000000000108', '00000000-0000-4000-8000-000000000001', 'cake', 'Honeycomb Cakes', 'quoted', '(828) 555-0124', null, 'https://honeycomb.example', null, null, null, '{}', null, null, null, null),
  ('00000000-0000-4000-8000-000000000109', '00000000-0000-4000-8000-000000000001', 'video', 'Reel Love Films', 'contacted', '(828) 555-0158', 'hi@reellove.example', null, null, null, 'Asked about a 4-hour package.', '{}', null, null, null, current_date + 3),
  ('00000000-0000-4000-8000-000000000110', '00000000-0000-4000-8000-000000000001', 'beauty', 'Glow Studio', 'idea', null, null, null, null, null, null, '{}', null, null, null, null);

insert into public.quote (wedding_id, vendor_id, pricing_basis, total, per_guest_amount, inclusions, expires_on, accepted_at) values
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000101', 'flat', 8800, null, 'Barn, meadow, tables and chairs for 120, 10-hour rental', null, now()),
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000102', 'flat', 3400, null, '8 hours, second shooter, online gallery', null, now()),
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000103', 'per_guest', 7480, '68', 'Family-style dinner, staff, linens', null, now()),
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000104', 'flat', 2450, null, 'Bouquets, 8 centerpieces, arch greenery', null, now()),
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000105', 'flat', 1350, null, '5 hours, ceremony and reception sound', null, now()),
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000106', 'flat', 400, null, 'Ceremony and rehearsal', null, now()),
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000107', 'flat', 650, null, 'Two-tier cake plus 60 cupcakes', current_date + 6, null),
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000108', 'per_guest', 715, '6.5', 'Naked cake, three flavors', current_date + 20, null);

insert into public.payment (wedding_id, vendor_id, label, kind, amount, due_on, paid_on) values
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000101', 'Deposit', 'deposit', 3000, current_date - 60, current_date - 60),
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000101', 'Installment', 'installment', 2900, current_date + 10, null),
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000101', 'Final payment', 'final', 2900, current_date + 180, null),
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000102', 'Deposit', 'deposit', 1000, current_date - 45, current_date - 45),
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000102', 'Balance', 'final', 2400, current_date + 196, null),
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000103', 'Deposit', 'deposit', 2000, current_date - 20, current_date - 20),
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000103', 'Balance', 'final', 5480, current_date + 196, null),
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000104', 'Deposit', 'deposit', 600, current_date + 5, null),
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000104', 'Balance', 'final', 1850, current_date + 180, null),
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000105', 'Deposit', 'deposit', 400, current_date - 15, current_date - 15),
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000105', 'Balance', 'final', 950, current_date + 203, null),
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000106', 'Payment in full', 'final', 400, current_date - 5, current_date - 5);

insert into public.vendor_contact (wedding_id, vendor_id, channel, note, contacted_at) values
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000109', 'email', 'Asked about a 4-hour package and Sunday pricing', now() - interval '4 days'),
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000107', 'call', 'Tasting booked for next week', now() - interval '9 days');

insert into public.task (wedding_id, title, why, category, due_date, due_offset_days, status, source) values
  ('00000000-0000-4000-8000-000000000001', 'Agree on a budget together', null, 'planning', current_date + 210 + (-365), -365, 'done', 'template'),
  ('00000000-0000-4000-8000-000000000001', 'Draft your guest list', null, 'guests', current_date + 210 + (-350), -350, 'done', 'template'),
  ('00000000-0000-4000-8000-000000000001', 'Book your venue', null, 'venue', current_date + 210 + (-330), -330, 'done', 'template'),
  ('00000000-0000-4000-8000-000000000001', 'Book your photographer', null, 'photo', current_date + 210 + (-300), -300, 'done', 'template'),
  ('00000000-0000-4000-8000-000000000001', 'Book catering', null, 'catering', current_date + 210 + (-290), -290, 'done', 'template'),
  ('00000000-0000-4000-8000-000000000001', 'Book music or a DJ', null, 'music', current_date + 210 + (-270), -270, 'done', 'template'),
  ('00000000-0000-4000-8000-000000000001', 'Choose your officiant', null, 'officiant', current_date + 210 + (-240), -240, 'done', 'template'),
  ('00000000-0000-4000-8000-000000000001', 'Book your florist', null, 'flowers', current_date + 210 + (-210), -210, 'done', 'template'),
  ('00000000-0000-4000-8000-000000000001', 'Find your wedding attire', 'Alterations take two to three months.', 'attire', greatest(current_date, current_date + 210 + (-240)), -240, 'todo', 'template'),
  ('00000000-0000-4000-8000-000000000001', 'Set up a hotel block for guests', null, 'guests', greatest(current_date, current_date + 210 + (-205)), -205, 'todo', 'template'),
  ('00000000-0000-4000-8000-000000000001', 'Send save-the-dates', 'Gives travelling guests time to plan.', 'stationery', greatest(current_date, current_date + 210 + (-200)), -200, 'todo', 'template'),
  ('00000000-0000-4000-8000-000000000001', 'Decide on videography', null, 'video', greatest(current_date, current_date + 210 + (-195)), -195, 'todo', 'template'),
  ('00000000-0000-4000-8000-000000000001', 'Book hair and makeup', null, 'beauty', greatest(current_date, current_date + 210 + (-180)), -180, 'todo', 'template'),
  ('00000000-0000-4000-8000-000000000001', 'Choose your cake', null, 'cake', greatest(current_date, current_date + 210 + (-150)), -150, 'todo', 'template'),
  ('00000000-0000-4000-8000-000000000001', 'Sort out rentals (tables, chairs, linens)', null, 'rentals', greatest(current_date, current_date + 210 + (-140)), -140, 'todo', 'template'),
  ('00000000-0000-4000-8000-000000000001', 'Plan the rehearsal dinner', null, 'planning', greatest(current_date, current_date + 210 + (-120)), -120, 'todo', 'template'),
  ('00000000-0000-4000-8000-000000000001', 'Arrange transportation', null, 'transport', greatest(current_date, current_date + 210 + (-120)), -120, 'todo', 'template'),
  ('00000000-0000-4000-8000-000000000001', 'Order invitations', null, 'stationery', greatest(current_date, current_date + 210 + (-110)), -110, 'todo', 'template'),
  ('00000000-0000-4000-8000-000000000001', 'Send invitations', 'Six to eight weeks ahead is the usual.', 'stationery', greatest(current_date, current_date + 210 + (-75)), -75, 'todo', 'template'),
  ('00000000-0000-4000-8000-000000000001', 'Buy your rings', null, 'rings', greatest(current_date, current_date + 210 + (-60)), -60, 'todo', 'template'),
  ('00000000-0000-4000-8000-000000000001', 'Write your vows', null, 'planning', greatest(current_date, current_date + 210 + (-45)), -45, 'todo', 'template'),
  ('00000000-0000-4000-8000-000000000001', 'Get your marriage license', 'Check your county''s waiting period and expiry.', 'planning', greatest(current_date, current_date + 210 + (-30)), -30, 'todo', 'template'),
  ('00000000-0000-4000-8000-000000000001', 'Give caterer the final headcount', null, 'catering', greatest(current_date, current_date + 210 + (-14)), -14, 'todo', 'template'),
  ('00000000-0000-4000-8000-000000000001', 'Finish the seating chart', null, 'guests', greatest(current_date, current_date + 210 + (-14)), -14, 'todo', 'template'),
  ('00000000-0000-4000-8000-000000000001', 'Share the day-of timeline', null, 'planning', greatest(current_date, current_date + 210 + (-7)), -7, 'todo', 'template');

insert into public.task (wedding_id, title, category, due_date, due_offset_days, status, source, vendor_id) values
  ('00000000-0000-4000-8000-000000000001', 'Schedule a tasting', 'catering', current_date + 4, -206, 'todo', 'template', '00000000-0000-4000-8000-000000000103'),
  ('00000000-0000-4000-8000-000000000001', 'Send your photographer a shot list', 'photo', current_date + 180, -30, 'todo', 'template', '00000000-0000-4000-8000-000000000102'),
  ('00000000-0000-4000-8000-000000000001', 'Do a walkthrough with the venue', 'venue', current_date + 150, -60, 'todo', 'template', '00000000-0000-4000-8000-000000000101'),
  ('00000000-0000-4000-8000-000000000001', 'Send your DJ the song list', 'music', current_date + 180, -30, 'todo', 'template', '00000000-0000-4000-8000-000000000105'),
  ('00000000-0000-4000-8000-000000000001', 'Meet your florist about designs', 'flowers', current_date + 90, -120, 'todo', 'template', '00000000-0000-4000-8000-000000000104');

insert into public.household (id, wedding_id, name, side, group_name, plus_one_allowed, responded_at) values
  ('00000000-0000-4000-8000-000000001000', '00000000-0000-4000-8000-000000000001', 'Ana & Luis Pérez', 'Jordan', 'Family', true, now() - interval '0 days'),
  ('00000000-0000-4000-8000-000000001001', '00000000-0000-4000-8000-000000000001', 'Dev Okafor', 'Sam', 'Family', false, now() - interval '1 days'),
  ('00000000-0000-4000-8000-000000001002', '00000000-0000-4000-8000-000000000001', 'Grace & Omar Nguyen', 'Both', 'College friends', false, now() - interval '2 days'),
  ('00000000-0000-4000-8000-000000001003', '00000000-0000-4000-8000-000000000001', 'Felix Schmidt family', 'Jordan', 'Work', false, now() - interval '3 days'),
  ('00000000-0000-4000-8000-000000001004', '00000000-0000-4000-8000-000000000001', 'Nora Haddad', 'Sam', 'Work', false, null),
  ('00000000-0000-4000-8000-000000001005', '00000000-0000-4000-8000-000000000001', 'Sam & Zoe Kowalski', 'Both', 'Neighbors', false, now() - interval '5 days'),
  ('00000000-0000-4000-8000-000000001006', '00000000-0000-4000-8000-000000000001', 'Ada Brennan family', 'Jordan', 'Family', false, null),
  ('00000000-0000-4000-8000-000000001007', '00000000-0000-4000-8000-000000000001', 'Ravi & Tess Tanaka', 'Sam', 'Family', true, now() - interval '7 days'),
  ('00000000-0000-4000-8000-000000001008', '00000000-0000-4000-8000-000000000001', 'Iris Silva family', 'Both', 'College friends', false, now() - interval '8 days'),
  ('00000000-0000-4000-8000-000000001009', '00000000-0000-4000-8000-000000000001', 'Owen & Cleo Moreau', 'Jordan', 'Work', false, now() - interval '9 days'),
  ('00000000-0000-4000-8000-000000001010', '00000000-0000-4000-8000-000000000001', 'Ruth & Abe Lindqvist', 'Sam', 'Work', false, null),
  ('00000000-0000-4000-8000-000000001011', '00000000-0000-4000-8000-000000000001', 'Nico & Pia Abara', 'Both', 'Neighbors', false, now() - interval '11 days'),
  ('00000000-0000-4000-8000-000000001012', '00000000-0000-4000-8000-000000000001', 'Lou Castillo family', 'Jordan', 'Family', false, null),
  ('00000000-0000-4000-8000-000000001013', '00000000-0000-4000-8000-000000000001', 'Dot & Ana Fischer', 'Sam', 'Family', false, now() - interval '13 days'),
  ('00000000-0000-4000-8000-000000001014', '00000000-0000-4000-8000-000000000001', 'Priya & Dev Duarte', 'Both', 'College friends', true, now() - interval '14 days'),
  ('00000000-0000-4000-8000-000000001015', '00000000-0000-4000-8000-000000000001', 'Theo & Grace Mbeki', 'Jordan', 'Work', false, null),
  ('00000000-0000-4000-8000-000000001016', '00000000-0000-4000-8000-000000000001', 'Lena & Felix Romano', 'Sam', 'Work', false, now() - interval '16 days'),
  ('00000000-0000-4000-8000-000000001017', '00000000-0000-4000-8000-000000000001', 'Kai Hart', 'Both', 'Neighbors', false, null),
  ('00000000-0000-4000-8000-000000001018', '00000000-0000-4000-8000-000000000001', 'Ivy & Sam Ivanova', 'Jordan', 'Family', false, now() - interval '18 days'),
  ('00000000-0000-4000-8000-000000001019', '00000000-0000-4000-8000-000000000001', 'Ben Quinn family', 'Sam', 'Family', false, now() - interval '19 days'),
  ('00000000-0000-4000-8000-000000001020', '00000000-0000-4000-8000-000000000001', 'June & Ravi Pérez', 'Both', 'College friends', false, now() - interval '20 days'),
  ('00000000-0000-4000-8000-000000001021', '00000000-0000-4000-8000-000000000001', 'Max Okafor', 'Jordan', 'Work', true, now() - interval '21 days'),
  ('00000000-0000-4000-8000-000000001022', '00000000-0000-4000-8000-000000000001', 'Mila Nguyen family', 'Sam', 'Work', false, null),
  ('00000000-0000-4000-8000-000000001023', '00000000-0000-4000-8000-000000000001', 'Jude Schmidt family', 'Both', 'Neighbors', false, now() - interval '23 days'),
  ('00000000-0000-4000-8000-000000001024', '00000000-0000-4000-8000-000000000001', 'Faye & Nico Haddad', 'Jordan', 'Family', false, null),
  ('00000000-0000-4000-8000-000000001025', '00000000-0000-4000-8000-000000000001', 'Gus & Lou Kowalski', 'Sam', 'Family', false, now() - interval '25 days'),
  ('00000000-0000-4000-8000-000000001026', '00000000-0000-4000-8000-000000000001', 'Cal Brennan family', 'Both', 'College friends', false, now() - interval '26 days'),
  ('00000000-0000-4000-8000-000000001027', '00000000-0000-4000-8000-000000000001', 'Luis & Priya Tanaka', 'Jordan', 'Work', false, null),
  ('00000000-0000-4000-8000-000000001028', '00000000-0000-4000-8000-000000000001', 'Maya & Theo Silva', 'Sam', 'Work', true, now() - interval '28 days'),
  ('00000000-0000-4000-8000-000000001029', '00000000-0000-4000-8000-000000000001', 'Omar & Lena Moreau', 'Both', 'Neighbors', false, now() - interval '29 days'),
  ('00000000-0000-4000-8000-000000001030', '00000000-0000-4000-8000-000000000001', 'Rosa & Kai Lindqvist', 'Jordan', 'Family', false, now() - interval '30 days'),
  ('00000000-0000-4000-8000-000000001031', '00000000-0000-4000-8000-000000000001', 'Eli & Ivy Abara', 'Sam', 'Family', false, now() - interval '31 days');

insert into public.guest (wedding_id, household_id, first_name, last_name, is_child, attending, meal, dietary, sort) values
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000001000', 'Ana', 'Pérez', false, true, 'Chicken', null, 0),
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000001000', 'Luis', 'Pérez', false, true, 'Chicken', 'Vegetarian', 1),
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000001001', 'Dev', 'Okafor', false, true, 'Mushroom risotto (v)', 'Vegetarian', 0),
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000001002', 'Grace', 'Nguyen', false, true, 'Chicken', null, 0),
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000001002', 'Omar', 'Nguyen', false, true, 'Chicken', null, 1),
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000001003', 'Felix', 'Schmidt', false, false, null, null, 0),
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000001003', 'Rosa', 'Schmidt', false, false, null, null, 1),
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000001003', 'Kai', 'Schmidt', true, false, null, null, 2),
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000001004', 'Nora', 'Haddad', false, null, null, null, 0),
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000001005', 'Sam', 'Kowalski', false, true, 'Chicken', null, 0),
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000001005', 'Zoe', 'Kowalski', false, true, 'Mushroom risotto (v)', null, 1),
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000001006', 'Ada', 'Brennan', false, null, null, null, 0),
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000001006', 'Leo', 'Brennan', false, null, null, null, 1),
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000001006', 'June', 'Brennan', true, null, null, null, 2),
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000001007', 'Ravi', 'Tanaka', false, true, 'Chicken', 'Gluten-free', 0),
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000001007', 'Tess', 'Tanaka', false, true, 'Trout', null, 1),
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000001008', 'Iris', 'Silva', false, true, 'Mushroom risotto (v)', null, 0),
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000001008', 'Hugo', 'Silva', false, true, 'Mushroom risotto (v)', null, 1),
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000001008', 'Mila', 'Silva', true, true, 'Mushroom risotto (v)', null, 2),
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000001009', 'Owen', 'Moreau', false, true, 'Chicken', null, 0),
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000001009', 'Cleo', 'Moreau', false, true, 'Chicken', null, 1),
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000001010', 'Ruth', 'Lindqvist', false, null, null, null, 0),
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000001010', 'Abe', 'Lindqvist', false, null, null, null, 1),
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000001011', 'Nico', 'Abara', false, false, null, null, 0),
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000001011', 'Pia', 'Abara', false, false, null, null, 1),
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000001012', 'Lou', 'Castillo', false, null, null, null, 0),
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000001012', 'Bea', 'Castillo', false, null, null, null, 1),
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000001012', 'Cal', 'Castillo', true, null, null, null, 2),
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000001012', 'Dot', 'Castillo', true, null, null, null, 3),
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000001013', 'Dot', 'Fischer', false, true, 'Trout', null, 0),
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000001013', 'Ana', 'Fischer', false, true, 'Trout', null, 1),
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000001014', 'Priya', 'Duarte', false, true, 'Mushroom risotto (v)', null, 0),
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000001014', 'Dev', 'Duarte', false, true, 'Chicken', null, 1),
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000001015', 'Theo', 'Mbeki', false, null, null, null, 0),
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000001015', 'Grace', 'Mbeki', false, null, null, null, 1),
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000001016', 'Lena', 'Romano', false, true, 'Mushroom risotto (v)', null, 0),
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000001016', 'Felix', 'Romano', false, true, 'Mushroom risotto (v)', null, 1),
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000001017', 'Kai', 'Hart', false, null, null, null, 0),
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000001018', 'Ivy', 'Ivanova', false, true, 'Trout', null, 0),
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000001018', 'Sam', 'Ivanova', false, true, 'Trout', null, 1),
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000001019', 'Ben', 'Quinn', false, true, 'Mushroom risotto (v)', null, 0),
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000001019', 'Ada', 'Quinn', false, true, 'Trout', null, 1),
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000001019', 'Leo', 'Quinn', true, true, 'Trout', null, 2),
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000001019', 'June', 'Quinn', true, true, 'Mushroom risotto (v)', null, 3),
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000001020', 'June', 'Pérez', false, true, 'Chicken', null, 0),
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000001020', 'Ravi', 'Pérez', false, true, 'Trout', null, 1),
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000001021', 'Max', 'Okafor', false, true, 'Mushroom risotto (v)', null, 0),
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000001022', 'Mila', 'Nguyen', false, null, null, null, 0),
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000001022', 'Owen', 'Nguyen', false, null, null, null, 1),
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000001022', 'Cleo', 'Nguyen', true, null, null, null, 2),
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000001022', 'Jude', 'Nguyen', true, null, null, null, 3),
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000001023', 'Jude', 'Schmidt', false, false, null, null, 0),
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000001023', 'Ruth', 'Schmidt', false, false, null, null, 1),
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000001023', 'Abe', 'Schmidt', true, false, null, null, 2),
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000001023', 'Faye', 'Schmidt', true, false, null, null, 3),
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000001024', 'Faye', 'Haddad', false, null, null, null, 0),
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000001024', 'Nico', 'Haddad', false, null, null, null, 1),
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000001025', 'Gus', 'Kowalski', false, false, null, null, 0),
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000001025', 'Lou', 'Kowalski', false, false, null, null, 1),
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000001026', 'Cal', 'Brennan', false, true, 'Chicken', null, 0),
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000001026', 'Dot', 'Brennan', false, true, 'Trout', null, 1),
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000001026', 'Ana', 'Brennan', true, true, 'Chicken', null, 2),
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000001026', 'Luis', 'Brennan', true, true, 'Chicken', null, 3),
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000001027', 'Luis', 'Tanaka', false, null, null, null, 0),
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000001027', 'Priya', 'Tanaka', false, null, null, null, 1),
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000001028', 'Maya', 'Silva', false, false, null, null, 0),
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000001028', 'Theo', 'Silva', false, false, null, null, 1),
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000001029', 'Omar', 'Moreau', false, false, null, null, 0),
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000001029', 'Lena', 'Moreau', false, false, null, null, 1),
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000001030', 'Rosa', 'Lindqvist', false, true, 'Chicken', null, 0),
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000001030', 'Kai', 'Lindqvist', false, true, 'Mushroom risotto (v)', null, 1),
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000001031', 'Eli', 'Abara', false, false, null, null, 0),
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000001031', 'Ivy', 'Abara', false, false, null, null, 1);

insert into public.timeline_event (wedding_id, starts_at, ends_at, title, location, owner, vendor_id, sort) values
  ('00000000-0000-4000-8000-000000000001', '13:30', '14:00', 'Photographer arrives', 'Getting-ready suite', 'Juniper & Pine Photo', '00000000-0000-4000-8000-000000000102', 0),
  ('00000000-0000-4000-8000-000000000001', '14:00', '15:30', 'Hair and makeup finishes', 'Getting-ready suite', null, null, 1),
  ('00000000-0000-4000-8000-000000000001', '15:00', null, 'Venue opens for vendors', 'Laurel Ridge Farm', 'Dana (venue manager)', '00000000-0000-4000-8000-000000000101', 2),
  ('00000000-0000-4000-8000-000000000001', '15:30', '16:15', 'First look and couple photos', 'The meadow', null, '00000000-0000-4000-8000-000000000102', 3),
  ('00000000-0000-4000-8000-000000000001', '16:30', '17:00', 'Ceremony', 'The meadow', 'Alex Rivera', '00000000-0000-4000-8000-000000000106', 4),
  ('00000000-0000-4000-8000-000000000001', '17:00', '18:00', 'Cocktail hour', 'Barn porch', 'Blue Ridge Table', '00000000-0000-4000-8000-000000000103', 5),
  ('00000000-0000-4000-8000-000000000001', '18:00', '20:00', 'Dinner and toasts', 'The barn', 'Blue Ridge Table', '00000000-0000-4000-8000-000000000103', 6),
  ('00000000-0000-4000-8000-000000000001', '20:00', '22:30', 'Dancing', 'The barn', 'Night Owl Sound', '00000000-0000-4000-8000-000000000105', 7),
  ('00000000-0000-4000-8000-000000000001', '22:30', null, 'Sparkler send-off', 'Front lawn', null, null, 8);

-- Activity feed and boards for the sample (fictional). "who" stands in for member names, since the sample has no members.
insert into public.activity (wedding_id, actor_type, action, entity_type, entity_id, diff, created_at) values
  ('00000000-0000-4000-8000-000000000001', 'user', 'plan.saved', 'wedding', '00000000-0000-4000-8000-000000000001', '{"who":"Jordan"}', now() - interval '120 days'),
  ('00000000-0000-4000-8000-000000000001', 'user', 'vendor.booked', 'vendor', '00000000-0000-4000-8000-000000000101', '{"who":"Sam","name":"Laurel Ridge Farm"}', now() - interval '60 days'),
  ('00000000-0000-4000-8000-000000000001', 'user', 'vendor.booked', 'vendor', '00000000-0000-4000-8000-000000000102', '{"who":"Jordan","name":"Juniper & Pine Photo"}', now() - interval '41 days'),
  ('00000000-0000-4000-8000-000000000001', 'user', 'vendor.booked', 'vendor', '00000000-0000-4000-8000-000000000103', '{"who":"Sam","name":"Blue Ridge Table"}', now() - interval '30 days'),
  ('00000000-0000-4000-8000-000000000001', 'user', 'contribution.added', 'wedding', '00000000-0000-4000-8000-000000000001', '{"who":"Jordan","from":"Jordan''s parents"}', now() - interval '25 days'),
  ('00000000-0000-4000-8000-000000000001', 'user', 'quote.added', 'vendor', '00000000-0000-4000-8000-000000000107', '{"who":"Sam","total":650}', now() - interval '6 days'),
  ('00000000-0000-4000-8000-000000000001', 'user', 'quote.added', 'vendor', '00000000-0000-4000-8000-000000000108', '{"who":"Jordan","total":715}', now() - interval '4 days'),
  ('00000000-0000-4000-8000-000000000001', 'guest', 'rsvp.received', 'household', '00000000-0000-4000-8000-000000001026', null, now() - interval '2 days'),
  ('00000000-0000-4000-8000-000000000001', 'user', 'payment.paid', 'wedding', '00000000-0000-4000-8000-000000000001', '{"who":"Sam","amount":1000}', now() - interval '1 day');

insert into public.board_item (wedding_id, kind, title, category_key, note) values
  ('00000000-0000-4000-8000-000000000001', 'note', 'Colors we keep coming back to', 'flowers', 'Sage, cream and a little rust. Nothing too shiny.'),
  ('00000000-0000-4000-8000-000000000001', 'note', 'Pie table instead of a tall cake', 'cake', 'Small cutting cake plus pies from a local bakery. Ask both bakers.'),
  ('00000000-0000-4000-8000-000000000001', 'note', 'Shuttle for the mountain road', 'transport', 'One run at 4pm, two runs back at 10:30 and 11.'),
  ('00000000-0000-4000-8000-000000000001', 'note', 'Songs for the first dance', 'music', 'Shortlist three and pick after the tasting.');
