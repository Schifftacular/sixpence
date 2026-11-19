-- Milestone 1: budget categories, tasks, partner-activity dot, atomic plan save.

alter table public.wedding_member add column last_seen_activity_at timestamptz not null default now();
alter table public.wedding_member add column display_name text;

create table public.budget_category (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references public.wedding (id) on delete cascade,
  key text,                                  -- template key; null for custom categories
  name text not null,
  target_amount numeric(12, 2) not null default 0 check (target_amount >= 0),
  benchmark_low numeric(12, 2),
  benchmark_high numeric(12, 2),
  is_custom boolean not null default false,
  sort integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index budget_category_wedding_idx on public.budget_category (wedding_id, sort);
create trigger budget_category_touch before update on public.budget_category
  for each row execute function public.touch_updated_at();

create type public.task_status as enum ('todo', 'done', 'skipped');

create table public.task (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references public.wedding (id) on delete cascade,
  title text not null,
  notes text,
  category text,
  due_date date,
  due_offset_days integer,                   -- relative to wedding date; recompute when the date moves
  status public.task_status not null default 'todo',
  source text not null default 'user' check (source in ('template', 'user')),
  template_key text,
  assignee_member_id uuid references public.wedding_member (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index task_wedding_due_idx on public.task (wedding_id, status, due_date);
create trigger task_touch before update on public.task
  for each row execute function public.touch_updated_at();

alter table public.budget_category enable row level security;
alter table public.task enable row level security;

-- Budget: couple, collaborators, funders and viewers with budget access read; editors write.
create or replace function public.can_see_budget(w uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select public.is_sample(w) or exists (
    select 1 from public.wedding_member m
    where m.wedding_id = w and m.user_id = (select auth.uid()) and m.status = 'active'
      and (m.role in ('owner', 'collaborator', 'funder') or (m.role = 'viewer' and m.can_see_budget))
  );
$$;

create policy "budget readers" on public.budget_category
  for select using (public.can_see_budget(wedding_id));
create policy "editors write budget" on public.budget_category
  for all using (public.can_edit(wedding_id)) with check (public.can_edit(wedding_id));

-- Tasks: couple and helpers, not funders or vendors (vendor tasks come with the vendor table).
create policy "planners read tasks" on public.task
  for select using (public.is_sample(wedding_id)
    or public.is_member(wedding_id, array['owner', 'collaborator', 'viewer']::public.member_role[]));
create policy "editors write tasks" on public.task
  for all using (public.can_edit(wedding_id)) with check (public.can_edit(wedding_id));

-- Members can mark their own "last seen" (for the partner-activity dot) and name.
create or replace function public.mark_activity_seen(w uuid) returns void
language sql security definer set search_path = '' as $$
  update public.wedding_member set last_seen_activity_at = now()
  where wedding_id = w and user_id = (select auth.uid());
$$;

-- Atomic save of a generated plan (computed by generatePlan on the server). Returns the wedding id.
create or replace function public.save_plan(p_wedding jsonb, p_categories jsonb, p_tasks jsonb)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  w uuid;
  uid uuid := auth.uid();
begin
  if uid is null then raise exception 'not signed in'; end if;

  insert into public.wedding (name, date, date_flex, date_is_estimate, guest_estimate,
      guest_estimate_is_estimate, budget_total, budget_is_estimate, location_text)
  values (
    coalesce(p_wedding ->> 'name', 'Our wedding'),
    (p_wedding ->> 'date')::date,
    p_wedding ->> 'date_flex',
    coalesce((p_wedding ->> 'date_is_estimate')::boolean, false),
    (p_wedding ->> 'guest_estimate')::integer,
    coalesce((p_wedding ->> 'guest_estimate_is_estimate')::boolean, false),
    (p_wedding ->> 'budget_total')::numeric,
    coalesce((p_wedding ->> 'budget_is_estimate')::boolean, false),
    p_wedding ->> 'location_text')
  returning id into w;

  insert into public.wedding_member (wedding_id, user_id, role) values (w, uid, 'owner');
  insert into public.onboarding_state (wedding_id, current_step, answers)
    values (w, 'survey', coalesce(p_wedding -> 'answers', '{}'));

  insert into public.budget_category (wedding_id, key, name, target_amount, sort)
  select w, c ->> 'key', c ->> 'name', (c ->> 'planned')::numeric, (ord - 1)::int
  from jsonb_array_elements(p_categories) with ordinality as t(c, ord);

  insert into public.task (wedding_id, title, category, due_date, due_offset_days, status, source, template_key)
  select w, t ->> 'title', t ->> 'category', (t ->> 'dueDate')::date, (t ->> 'dueOffsetDays')::int,
         (t ->> 'status')::public.task_status, 'template', t ->> 'key'
  from jsonb_array_elements(p_tasks) as x(t);

  insert into public.activity (wedding_id, actor_type, actor_id, action, entity_type, entity_id)
    values (w, 'user', uid, 'plan.saved', 'wedding', w);
  return w;
end $$;
revoke execute on function public.save_plan(jsonb, jsonb, jsonb) from anon;

-- Activity rows written by server actions. Editors only; actor is always the caller.
create or replace function public.log_activity(w uuid, p_action text, p_entity_type text, p_entity_id uuid, p_diff jsonb default null)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.can_edit(w) then raise exception 'not allowed'; end if;
  insert into public.activity (wedding_id, actor_type, actor_id, action, entity_type, entity_id, diff)
    values (w, 'user', (select auth.uid()), p_action, p_entity_type, p_entity_id, p_diff);
end $$;
revoke execute on function public.log_activity(uuid, text, text, uuid, jsonb) from anon;
