-- Sixpence core schema (Milestone 0). See docs/architecture.md section 4.
-- Planning, guest and money tables arrive in later migrations.

create extension if not exists postgis with schema extensions;

-- ---------- helpers ----------
create or replace function public.touch_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

-- ---------- profiles ----------
create table public.profile (
  user_id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger profile_touch before update on public.profile
  for each row execute function public.touch_updated_at();

-- Create a profile row for every new auth user (Google sign-in).
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profile (user_id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'));
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- weddings ----------
create table public.wedding (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'Our wedding',
  date date,
  date_flex text,                          -- e.g. 'fall 2027' when no date yet
  date_is_estimate boolean not null default false,
  location_text text,
  geom extensions.geography(point, 4326),
  region_code text,
  guest_estimate integer check (guest_estimate is null or guest_estimate >= 0),
  guest_estimate_is_estimate boolean not null default false,
  budget_total numeric(12, 2) check (budget_total is null or budget_total >= 0),
  budget_is_estimate boolean not null default false,
  currency text not null default 'USD',
  style_tags text[] not null default '{}',
  rsvp_slug text unique,
  rsvp_lookup_enabled boolean not null default false,
  outbound_enabled boolean not null default false, -- guest email + public RSVP; off until the couple says go
  is_sample boolean not null default false,        -- read-only demo wedding, readable by anyone
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger wedding_touch before update on public.wedding
  for each row execute function public.touch_updated_at();

create type public.member_role as enum ('owner', 'collaborator', 'funder', 'viewer', 'vendor');
create type public.member_status as enum ('invited', 'active', 'removed');

create table public.wedding_member (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references public.wedding (id) on delete cascade,
  user_id uuid references auth.users (id) on delete cascade,
  role public.member_role not null,
  vendor_id uuid,                          -- FK added when the vendor table lands
  invited_email text,
  status public.member_status not null default 'active',
  can_see_budget boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (wedding_id, user_id)
);
create index wedding_member_user_idx on public.wedding_member (user_id) where status = 'active';
create trigger wedding_member_touch before update on public.wedding_member
  for each row execute function public.touch_updated_at();

create table public.event (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references public.wedding (id) on delete cascade,
  name text not null,
  starts_at timestamptz,
  venue_place_id uuid,
  sort integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index event_wedding_idx on public.event (wedding_id);
create trigger event_touch before update on public.event
  for each row execute function public.touch_updated_at();

-- ---------- onboarding, notifications ----------
create table public.onboarding_state (
  wedding_id uuid primary key references public.wedding (id) on delete cascade,
  current_step text not null default 'basics',
  answers jsonb not null default '{}',
  checklist jsonb not null default '{}',
  dismissed_at timestamptz,
  updated_at timestamptz not null default now()
);
create trigger onboarding_state_touch before update on public.onboarding_state
  for each row execute function public.touch_updated_at();

create type public.notification_kind as enum
  ('payment_reminder', 'weekly_checkin', 'partner_digest', 'rsvp_updates', 'nudges');

create table public.notification_pref (
  member_id uuid not null references public.wedding_member (id) on delete cascade,
  kind public.notification_kind not null,
  channel text not null default 'email' check (channel in ('email', 'push')),
  enabled boolean not null default true,
  day_of_week smallint check (day_of_week between 0 and 6),
  primary key (member_id, kind, channel)
);

-- ---------- platform ----------
create table public.activity (
  id bigint generated always as identity primary key,
  wedding_id uuid not null references public.wedding (id) on delete cascade,
  actor_type text not null check (actor_type in ('user', 'guest', 'system', 'agent')),
  actor_id uuid,
  action text not null,
  entity_type text,
  entity_id uuid,
  diff jsonb,
  created_at timestamptz not null default now()
);
create index activity_wedding_idx on public.activity (wedding_id, created_at desc);

create table public.entitlement (
  wedding_id uuid not null references public.wedding (id) on delete cascade,
  feature text not null,
  granted_at timestamptz not null default now(),
  expires_at timestamptz,
  primary key (wedding_id, feature)
);

-- First-party, privacy-friendly funnel events. No PII, no free text.
create table public.product_event (
  id bigint generated always as identity primary key,
  name text not null check (name ~ '^[a-z0-9_.]+$'),
  wedding_hash text,
  props jsonb not null default '{}',
  occurred_at timestamptz not null default now()
);

-- ---------- access helpers ----------
create or replace function public.is_member(w uuid, roles public.member_role[] default null)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.wedding_member m
    where m.wedding_id = w
      and m.user_id = (select auth.uid())
      and m.status = 'active'
      and (roles is null or m.role = any (roles))
  );
$$;

create or replace function public.can_edit(w uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select public.is_member(w, array['owner', 'collaborator']::public.member_role[]);
$$;

create or replace function public.is_sample(w uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((select is_sample from public.wedding where id = w), false);
$$;

-- Create a wedding and make the caller its owner, in one step.
create or replace function public.create_wedding(p_name text default 'Our wedding')
returns uuid language plpgsql security definer set search_path = '' as $$
declare w uuid;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  insert into public.wedding (name) values (coalesce(p_name, 'Our wedding')) returning id into w;
  insert into public.wedding_member (wedding_id, user_id, role) values (w, auth.uid(), 'owner');
  insert into public.onboarding_state (wedding_id) values (w);
  insert into public.activity (wedding_id, actor_type, actor_id, action, entity_type, entity_id)
    values (w, 'user', auth.uid(), 'wedding.created', 'wedding', w);
  return w;
end $$;
revoke execute on function public.create_wedding(text) from anon;

-- ---------- row level security ----------
alter table public.profile enable row level security;
alter table public.wedding enable row level security;
alter table public.wedding_member enable row level security;
alter table public.event enable row level security;
alter table public.onboarding_state enable row level security;
alter table public.notification_pref enable row level security;
alter table public.activity enable row level security;
alter table public.entitlement enable row level security;
alter table public.product_event enable row level security;

create policy "own profile" on public.profile
  for all using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy "members and sample read weddings" on public.wedding
  for select using (is_sample or public.is_member(id));
create policy "editors update weddings" on public.wedding
  for update using (public.can_edit(id) and not is_sample) with check (public.can_edit(id) and not is_sample);
-- Inserts go through create_wedding(); deletes through an owner-only action (export + delete flow).
create policy "owners delete weddings" on public.wedding
  for delete using (public.is_member(id, array['owner']::public.member_role[]) and not is_sample);

create policy "members read members" on public.wedding_member
  for select using (public.is_member(wedding_id) or public.is_sample(wedding_id));
create policy "owners manage members" on public.wedding_member
  for all using (public.is_member(wedding_id, array['owner']::public.member_role[]))
  with check (public.is_member(wedding_id, array['owner']::public.member_role[]));

create policy "members and sample read events" on public.event
  for select using (public.is_member(wedding_id) or public.is_sample(wedding_id));
create policy "editors write events" on public.event
  for all using (public.can_edit(wedding_id)) with check (public.can_edit(wedding_id));

create policy "editors use onboarding" on public.onboarding_state
  for all using (public.can_edit(wedding_id)) with check (public.can_edit(wedding_id));

create policy "own notification prefs" on public.notification_pref
  for all using (exists (select 1 from public.wedding_member m
                         where m.id = member_id and m.user_id = (select auth.uid())))
  with check (exists (select 1 from public.wedding_member m
                      where m.id = member_id and m.user_id = (select auth.uid())));

create policy "members read activity" on public.activity
  for select using (public.is_member(wedding_id));
-- Activity rows are written by security-definer functions and server actions, never directly.

create policy "members read entitlements" on public.entitlement
  for select using (public.is_member(wedding_id));

-- Anyone may log a funnel event; nobody can read them through the API.
create policy "insert product events" on public.product_event
  for insert to anon, authenticated with check (true);
