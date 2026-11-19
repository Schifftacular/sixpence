-- Security advisor fixes. Postgres grants EXECUTE to PUBLIC by default, so earlier
-- "revoke ... from anon" lines did not take effect. Write actions are for signed-in users only;
-- the trigger function is for nobody. RLS helper functions (is_member, can_edit, is_sample,
-- is_planner, can_see_budget) stay callable because policies run them as the querying role,
-- and they only answer questions about the caller.

alter function public.touch_updated_at() set search_path = '';

revoke execute on function public.handle_new_user() from public, anon, authenticated;

revoke execute on function public.create_wedding(text) from public, anon;
revoke execute on function public.save_plan(jsonb, jsonb, jsonb) from public, anon;
revoke execute on function public.log_activity(uuid, text, text, uuid, jsonb) from public, anon;
revoke execute on function public.mark_activity_seen(uuid) from public, anon;
revoke execute on function public.book_vendor(uuid, uuid, jsonb, jsonb) from public, anon;
revoke execute on function public.mark_payment_paid(uuid, numeric, date) from public, anon;
revoke execute on function public.accept_invite(text) from public, anon;

grant execute on function public.create_wedding(text) to authenticated;
grant execute on function public.save_plan(jsonb, jsonb, jsonb) to authenticated;
grant execute on function public.log_activity(uuid, text, text, uuid, jsonb) to authenticated;
grant execute on function public.mark_activity_seen(uuid) to authenticated;
grant execute on function public.book_vendor(uuid, uuid, jsonb, jsonb) to authenticated;
grant execute on function public.mark_payment_paid(uuid, numeric, date) to authenticated;
grant execute on function public.accept_invite(text) to authenticated;
