-- Full prototype: vendors, quotes, payments, contacts, guests and RSVP, contributions, invites,
-- The Day, boards, and the open places index for Explore. See docs/architecture.md section 4.

-- ---------- wedding and budget additions ----------
alter table public.wedding
  add column rsvp_deadline date,
  add column meal_options text[] not null default '{}',
  add column ceremony_time time,
  add column planning_stage text check (planning_stage in ('just_engaged', 'venue_booked', 'some_vendors', 'final_stretch')),
  add column priorities text[] not null default '{}';

alter table public.budget_category add column per_guest boolean not null default false;

-- Planners: everyone who works on the plan (not funders or vendors). Sample is readable by anyone.
create or replace function public.is_planner(w uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select public.is_sample(w)
      or public.is_member(w, array['owner', 'collaborator', 'viewer']::public.member_role[]);
$$;

-- ---------- open places index (public business listings for Explore) ----------
-- Loaded by scripts/etl/places.py from Overture Maps (CDLA-Permissive-2.0). Not wedding data.
create table public.place (
  id text primary key,                         -- '<source>:<record id>'
  source text not null,                        -- 'overture', later 'fsq', 'osm', 'claimed'
  kind text not null check (kind in ('vendor', 'venue')),
  category_key text not null,                  -- matches budget category keys
  subtype text,                                -- e.g. 'winery', 'hotel', 'historic_site'
  name text not null,
  lat double precision not null,
  lng double precision not null,
  address text,
  locality text,
  region text,
  postcode text,
  website text,
  phone text,
  confidence real,
  license text not null,
  fetched_at timestamptz not null default now(),
  -- Facts read from the venue's own website (polite background read), with provenance. Never paid ranking.
  site_mentions_weddings boolean,
  site_capacity integer,
  site_price_from numeric(12, 2),
  site_checked_at timestamptz
);
create index place_cat_geo_idx on public.place (category_key, lat, lng);
create index place_kind_geo_idx on public.place (kind, lat, lng);
alter table public.place enable row level security;
create policy "anyone reads places" on public.place for select using (true);

-- Places near a point, nearest first. Plain haversine with a bounding box; fine at metro scale.
create or replace function public.places_near(
  p_lat double precision, p_lng double precision, p_category text default null,
  p_kind text default null, p_radius_km double precision default 40, p_limit integer default 60)
returns table (id text, kind text, category_key text, subtype text, name text, lat double precision,
  lng double precision, address text, locality text, website text, phone text,
  site_mentions_weddings boolean, site_capacity integer, site_price_from numeric, distance_km double precision)
language sql stable set search_path = '' as $$
  with box as (
    select p_radius_km / 111.0 as dlat,
           p_radius_km / (111.0 * greatest(cos(radians(p_lat)), 0.2)) as dlng
  )
  select p.id, p.kind, p.category_key, p.subtype, p.name, p.lat, p.lng, p.address, p.locality, p.website,
         p.phone, p.site_mentions_weddings, p.site_capacity, p.site_price_from,
         6371 * 2 * asin(sqrt(power(sin(radians(p.lat - p_lat) / 2), 2)
           + cos(radians(p_lat)) * cos(radians(p.lat)) * power(sin(radians(p.lng - p_lng) / 2), 2))) as distance_km
  from public.place p, box
  where p.lat between p_lat - box.dlat and p_lat + box.dlat
    and p.lng between p_lng - box.dlng and p_lng + box.dlng
    and (p_category is null or p.category_key = p_category)
    and (p_kind is null or p.kind = p_kind)
  order by distance_km
  limit least(p_limit, 200);
$$;

-- ---------- vendors ----------
create type public.vendor_status as enum ('idea', 'contacted', 'quoted', 'booked', 'passed');

create table public.vendor (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references public.wedding (id) on delete cascade,
  category_key text not null,
  name text not null,
  status public.vendor_status not null default 'idea',
  place_id text references public.place (id) on delete set null,
  phone text,
  email text,
  website text,
  address text,
  lat double precision,
  lng double precision,
  notes text,
  tags text[] not null default '{}',
  pass_reason text,
  follow_up_on date,
  arrival_time text,                           -- day-of details feed The Day
  onsite_contact text,
  booked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index vendor_wedding_idx on public.vendor (wedding_id, category_key);
create trigger vendor_touch before update on public.vendor for each row execute function public.touch_updated_at();

create table public.quote (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references public.wedding (id) on delete cascade,
  vendor_id uuid not null references public.vendor (id) on delete cascade,
  pricing_basis text not null default 'flat' check (pricing_basis in ('flat', 'per_guest')),
  total numeric(12, 2) not null check (total >= 0),       -- flat total, or per-guest x guests when entered
  per_guest_amount numeric(12, 2) check (per_guest_amount is null or per_guest_amount >= 0),
  inclusions text,
  expires_on date,
  accepted_at timestamptz,
  created_at timestamptz not null default now()
);
create index quote_vendor_idx on public.quote (vendor_id);

create type public.payment_kind as enum ('deposit', 'installment', 'final', 'tip', 'other');
create table public.payment (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references public.wedding (id) on delete cascade,
  vendor_id uuid references public.vendor (id) on delete cascade,
  label text not null,
  kind public.payment_kind not null default 'installment',
  amount numeric(12, 2) not null check (amount >= 0),
  due_on date,
  paid_on date,
  created_at timestamptz not null default now()
);
create index payment_wedding_due_idx on public.payment (wedding_id, paid_on, due_on);

create table public.vendor_contact (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references public.wedding (id) on delete cascade,
  vendor_id uuid not null references public.vendor (id) on delete cascade,
  channel text not null check (channel in ('call', 'text', 'email', 'in_person', 'other')),
  note text,
  contacted_at timestamptz not null default now(),
  member_id uuid references public.wedding_member (id) on delete set null
);

alter table public.task
  add column vendor_id uuid references public.vendor (id) on delete cascade,
  add column why text;

-- ---------- money: contributions ----------
create table public.contribution (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references public.wedding (id) on delete cascade,
  from_label text not null,                    -- 'Us', 'Jordan''s parents'
  from_member_id uuid references public.wedding_member (id) on delete set null,
  amount numeric(12, 2) not null check (amount >= 0),
  covers_category_id uuid references public.budget_category (id) on delete set null,
  created_at timestamptz not null default now()
);

-- ---------- guests and RSVP ----------
create table public.household (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references public.wedding (id) on delete cascade,
  name text not null,                          -- 'Ana & Luis Pérez'
  side text,                                   -- free text: 'Jordan', 'Sam', 'Both'
  group_name text,                             -- 'College friends'
  email text,
  address text,
  plus_one_allowed boolean not null default false,
  rsvp_token text not null unique default replace(gen_random_uuid()::text, '-', ''),
  responded_at timestamptz,
  note text,
  created_at timestamptz not null default now()
);
create index household_wedding_idx on public.household (wedding_id);

create table public.guest (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references public.wedding (id) on delete cascade,
  household_id uuid not null references public.household (id) on delete cascade,
  first_name text not null,
  last_name text,
  is_child boolean not null default false,
  is_plus_one boolean not null default false,
  attending boolean,                           -- null = waiting
  meal text,
  dietary text,
  sort integer not null default 0
);
create index guest_household_idx on public.guest (household_id);
create index guest_wedding_idx on public.guest (wedding_id);

-- ---------- sharing ----------
create table public.invite (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references public.wedding (id) on delete cascade,
  token text not null unique default replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', ''),
  role public.member_role not null default 'collaborator' check (role in ('collaborator', 'funder', 'viewer')),
  label text,                                  -- 'Sam', 'Mom'
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '30 days',
  accepted_at timestamptz,
  accepted_by uuid references auth.users (id) on delete set null
);

-- ---------- The Day ----------
create table public.timeline_event (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references public.wedding (id) on delete cascade,
  starts_at time not null,
  ends_at time,
  title text not null,
  location text,
  owner text,                                  -- who is responsible
  vendor_id uuid references public.vendor (id) on delete set null,
  sort integer not null default 0
);

-- ---------- boards (saved ideas and places) ----------
create table public.board_item (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references public.wedding (id) on delete cascade,
  kind text not null check (kind in ('photo', 'place', 'note')),
  title text not null,
  image_url text,
  credit text,                                 -- 'Photo by X on Unsplash'
  source_url text,
  place_id text references public.place (id) on delete set null,
  category_key text,
  note text,
  created_at timestamptz not null default now()
);

-- ---------- row level security ----------
alter table public.vendor enable row level security;
alter table public.quote enable row level security;
alter table public.payment enable row level security;
alter table public.vendor_contact enable row level security;
alter table public.contribution enable row level security;
alter table public.household enable row level security;
alter table public.guest enable row level security;
alter table public.invite enable row level security;
alter table public.timeline_event enable row level security;
alter table public.board_item enable row level security;

-- Vendors, quotes, payments, contributions: budget readers (funders see names, quotes and payments).
create policy "budget readers read vendors" on public.vendor for select using (public.can_see_budget(wedding_id) or public.is_planner(wedding_id));
create policy "editors write vendors" on public.vendor for all using (public.can_edit(wedding_id)) with check (public.can_edit(wedding_id));
create policy "budget readers read quotes" on public.quote for select using (public.can_see_budget(wedding_id) or public.is_planner(wedding_id));
create policy "editors write quotes" on public.quote for all using (public.can_edit(wedding_id)) with check (public.can_edit(wedding_id));
create policy "budget readers read payments" on public.payment for select using (public.can_see_budget(wedding_id));
create policy "editors write payments" on public.payment for all using (public.can_edit(wedding_id)) with check (public.can_edit(wedding_id));
create policy "budget readers read contributions" on public.contribution for select using (public.can_see_budget(wedding_id));
create policy "editors write contributions" on public.contribution for all using (public.can_edit(wedding_id)) with check (public.can_edit(wedding_id));

-- Contact log, guests, The Day, boards: planners only. Funders never see guest data.
create policy "planners read contacts" on public.vendor_contact for select using (public.is_planner(wedding_id));
create policy "editors write contacts" on public.vendor_contact for all using (public.can_edit(wedding_id)) with check (public.can_edit(wedding_id));
create policy "planners read households" on public.household for select using (public.is_planner(wedding_id));
create policy "editors write households" on public.household for all using (public.can_edit(wedding_id)) with check (public.can_edit(wedding_id));
create policy "planners read guests" on public.guest for select using (public.is_planner(wedding_id));
create policy "editors write guests" on public.guest for all using (public.can_edit(wedding_id)) with check (public.can_edit(wedding_id));
create policy "planners read timeline" on public.timeline_event for select using (public.is_planner(wedding_id));
create policy "editors write timeline" on public.timeline_event for all using (public.can_edit(wedding_id)) with check (public.can_edit(wedding_id));
create policy "planners read boards" on public.board_item for select using (public.is_planner(wedding_id));
create policy "editors write boards" on public.board_item for all using (public.can_edit(wedding_id)) with check (public.can_edit(wedding_id));
create policy "owners manage invites" on public.invite for all
  using (public.is_member(wedding_id, array['owner', 'collaborator']::public.member_role[]))
  with check (public.is_member(wedding_id, array['owner', 'collaborator']::public.member_role[]));

-- ---------- atomic actions ----------

-- Book a vendor: accept the quote, add the payment schedule, check off the matching "book" task,
-- and add the vendor's to-do list. Tasks are computed in src/lib/vendors/templates.ts.
create or replace function public.book_vendor(p_vendor uuid, p_quote uuid, p_payments jsonb, p_tasks jsonb)
returns void language plpgsql security definer set search_path = '' as $$
declare v public.vendor;
begin
  select * into v from public.vendor where id = p_vendor;
  if v.id is null or not public.can_edit(v.wedding_id) then raise exception 'not allowed'; end if;

  update public.vendor set status = 'booked', booked_at = now() where id = p_vendor;
  if p_quote is not null then
    update public.quote set accepted_at = now() where id = p_quote and vendor_id = p_vendor;
  end if;

  insert into public.payment (wedding_id, vendor_id, label, kind, amount, due_on)
  select v.wedding_id, p_vendor, x ->> 'label', coalesce((x ->> 'kind')::public.payment_kind, 'installment'),
         (x ->> 'amount')::numeric, (x ->> 'dueOn')::date
  from jsonb_array_elements(coalesce(p_payments, '[]')) as t(x);

  update public.task set status = 'done'
  where wedding_id = v.wedding_id and status = 'todo' and category = v.category_key
    and (template_key like 'book_%' or template_key in ('order_cake', 'attire', 'transport', 'rings'));

  insert into public.task (wedding_id, title, why, category, due_date, due_offset_days, status, source, template_key, vendor_id)
  select v.wedding_id, x ->> 'title', x ->> 'why', v.category_key, (x ->> 'dueDate')::date,
         (x ->> 'dueOffsetDays')::int, 'todo', 'template', x ->> 'key', p_vendor
  from jsonb_array_elements(coalesce(p_tasks, '[]')) as t(x);

  insert into public.activity (wedding_id, actor_type, actor_id, action, entity_type, entity_id, diff)
    values (v.wedding_id, 'user', (select auth.uid()), 'vendor.booked', 'vendor', p_vendor, jsonb_build_object('name', v.name));
end $$;
revoke execute on function public.book_vendor(uuid, uuid, jsonb, jsonb) from anon;

-- Mark a payment paid. A smaller amount splits it: the paid part is logged, the rest stays scheduled.
create or replace function public.mark_payment_paid(p_payment uuid, p_amount numeric, p_paid_on date)
returns void language plpgsql security definer set search_path = '' as $$
declare p public.payment;
begin
  select * into p from public.payment where id = p_payment;
  if p.id is null or not public.can_edit(p.wedding_id) then raise exception 'not allowed'; end if;
  if p.paid_on is not null then return; end if;
  if p_amount is null or p_amount <= 0 or p_amount > p.amount then raise exception 'bad amount'; end if;

  if p_amount < p.amount then
    insert into public.payment (wedding_id, vendor_id, label, kind, amount, due_on)
      values (p.wedding_id, p.vendor_id, p.label || ' (rest)', p.kind, p.amount - p_amount, p.due_on);
  end if;
  update public.payment set amount = p_amount, paid_on = coalesce(p_paid_on, current_date) where id = p_payment;
  insert into public.activity (wedding_id, actor_type, actor_id, action, entity_type, entity_id, diff)
    values (p.wedding_id, 'user', (select auth.uid()), 'payment.paid', 'payment', p_payment, jsonb_build_object('amount', p_amount));
end $$;
revoke execute on function public.mark_payment_paid(uuid, numeric, date) from anon;

-- Accept an invite link: the signed-in person joins the wedding with the invite's role.
create or replace function public.accept_invite(p_token text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare i public.invite; uid uuid := auth.uid();
begin
  if uid is null then raise exception 'not signed in'; end if;
  select * into i from public.invite where token = p_token;
  if i.id is null or i.expires_at < now() then raise exception 'invite expired'; end if;
  if i.accepted_at is not null and i.accepted_by <> uid then raise exception 'invite used'; end if;
  insert into public.wedding_member (wedding_id, user_id, role, display_name)
    values (i.wedding_id, uid, i.role, i.label)
    on conflict do nothing;
  update public.invite set accepted_at = coalesce(accepted_at, now()), accepted_by = uid where id = i.id;
  insert into public.activity (wedding_id, actor_type, actor_id, action, entity_type, entity_id)
    values (i.wedding_id, 'user', uid, 'member.joined', 'wedding', i.wedding_id);
  return i.wedding_id;
end $$;
revoke execute on function public.accept_invite(text) from anon;

-- What an invite link shows before sign-in: just the wedding's name and the role.
create or replace function public.invite_preview(p_token text)
returns table (wedding_name text, role public.member_role, label text, expired boolean)
language sql stable security definer set search_path = '' as $$
  select w.name, i.role, i.label, (i.expires_at < now())
  from public.invite i join public.wedding w on w.id = i.wedding_id
  where i.token = p_token;
$$;

-- ---------- public RSVP (only when the couple turned outbound on; the app also requires APP_ENV=production) ----------
create or replace function public.rsvp_household(p_token text)
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'wedding', jsonb_build_object('name', w.name, 'date', w.date, 'location', w.location_text,
                                  'deadline', w.rsvp_deadline, 'meals', w.meal_options),
    'household', jsonb_build_object('name', h.name, 'plusOneAllowed', h.plus_one_allowed, 'respondedAt', h.responded_at),
    'guests', coalesce((select jsonb_agg(jsonb_build_object('id', g.id, 'firstName', g.first_name,
                         'attending', g.attending, 'meal', g.meal, 'dietary', g.dietary, 'isPlusOne', g.is_plus_one)
                         order by g.sort) from public.guest g where g.household_id = h.id), '[]'))
  from public.household h join public.wedding w on w.id = h.wedding_id
  where h.rsvp_token = p_token and w.outbound_enabled;
$$;

create or replace function public.rsvp_submit(p_token text, p_guests jsonb, p_note text default null)
returns boolean language plpgsql security definer set search_path = '' as $$
declare h public.household; ok boolean;
begin
  select hh.* into h from public.household hh join public.wedding w on w.id = hh.wedding_id
   where hh.rsvp_token = p_token and w.outbound_enabled;
  if h.id is null then return false; end if;
  update public.guest g set attending = (x ->> 'attending')::boolean,
         meal = nullif(x ->> 'meal', ''), dietary = nullif(left(x ->> 'dietary', 200), '')
  from jsonb_array_elements(p_guests) as t(x)
  where g.household_id = h.id and g.id = (x ->> 'id')::uuid;
  update public.household set responded_at = now(), note = coalesce(nullif(left(p_note, 500), ''), note) where id = h.id;
  insert into public.activity (wedding_id, actor_type, action, entity_type, entity_id)
    values (h.wedding_id, 'guest', 'rsvp.received', 'household', h.id);
  return true;
end $$;
grant execute on function public.rsvp_household(text) to anon;
grant execute on function public.rsvp_submit(text, jsonb, text) to anon;

-- save_plan v2: also stores location, stage, priorities, per-guest flags and task reasons.
create or replace function public.save_plan(p_wedding jsonb, p_categories jsonb, p_tasks jsonb)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  w uuid;
  uid uuid := auth.uid();
begin
  if uid is null then raise exception 'not signed in'; end if;

  insert into public.wedding (name, date, date_flex, date_is_estimate, guest_estimate,
      guest_estimate_is_estimate, budget_total, budget_is_estimate, location_text, lat, lng, planning_stage, priorities)
  values (
    coalesce(p_wedding ->> 'name', 'Our wedding'),
    (p_wedding ->> 'date')::date,
    p_wedding ->> 'date_flex',
    coalesce((p_wedding ->> 'date_is_estimate')::boolean, false),
    (p_wedding ->> 'guest_estimate')::integer,
    coalesce((p_wedding ->> 'guest_estimate_is_estimate')::boolean, false),
    (p_wedding ->> 'budget_total')::numeric,
    coalesce((p_wedding ->> 'budget_is_estimate')::boolean, false),
    p_wedding ->> 'location_text',
    (p_wedding ->> 'lat')::double precision,
    (p_wedding ->> 'lng')::double precision,
    p_wedding ->> 'planning_stage',
    coalesce(array(select jsonb_array_elements_text(p_wedding -> 'priorities')), '{}'))
  returning id into w;

  insert into public.wedding_member (wedding_id, user_id, role) values (w, uid, 'owner');
  insert into public.onboarding_state (wedding_id, current_step, answers)
    values (w, 'survey', coalesce(p_wedding -> 'answers', '{}'));

  insert into public.budget_category (wedding_id, key, name, target_amount, sort, per_guest)
  select w, c ->> 'key', c ->> 'name', (c ->> 'planned')::numeric, (ord - 1)::int, coalesce((c ->> 'perGuest')::boolean, false)
  from jsonb_array_elements(p_categories) with ordinality as t(c, ord);

  insert into public.task (wedding_id, title, why, category, due_date, due_offset_days, status, source, template_key)
  select w, t ->> 'title', t ->> 'why', t ->> 'category', (t ->> 'dueDate')::date, (t ->> 'dueOffsetDays')::int,
         (t ->> 'status')::public.task_status, 'template', t ->> 'key'
  from jsonb_array_elements(p_tasks) as x(t);

  insert into public.activity (wedding_id, actor_type, actor_id, action, entity_type, entity_id)
    values (w, 'user', uid, 'plan.saved', 'wedding', w);
  return w;
end $$;
