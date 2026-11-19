import { Check, ChevronRight, Lightbulb } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { MarkPaid } from "@/components/budget/mark-paid";
import { Loading } from "@/components/shell/page-bits";
import { TaskDone } from "@/components/week/task-done";
import { describeActivity, relativeTime, type ActivityRow } from "@/lib/activity-text";
import { countdown, longDate, shortDate } from "@/lib/dates";
import { formatMoney } from "@/lib/money";
import { CATEGORIES } from "@/lib/plan/templates";
import { createClient } from "@/lib/supabase/server";
import { thisWeek, type WeekCard } from "@/lib/this-week";
import { todayIso } from "@/lib/today";
import { loadWedding } from "@/lib/wedding";

export default function ThisWeekPage({ params }: PageProps<"/w/[weddingId]">) {
  return (
    <Suspense fallback={<Loading />}>
      <ThisWeek params={params} />
    </Suspense>
  );
}

type Pay = { id: string; label: string; amount: number; due_on: string | null; vendor: { name: string } | null };
type Quote = { total: number; expires_on: string | null; accepted_at: string | null; vendor: { id: string; name: string; status: string } | null };

async function ThisWeek({ params }: { params: Promise<{ weddingId: string }> }) {
  const { weddingId } = await params;
  const ctx = await loadWedding(weddingId);
  const base = `/w/${weddingId}`;
  const today = todayIso();
  const w = ctx.wedding;
  const supabase = await createClient();
  const planner = ctx.role !== "funder";
  const canMoney = !!ctx.money;

  const [{ data: tasks }, { count: total }, { count: done }, payRes, quoteRes, hhRes, actRes, { data: members }, { data: vendors }] = await Promise.all([
    supabase.from("task").select("id,title,due_date,vendor_id").eq("wedding_id", weddingId).eq("status", "todo").order("due_date", { ascending: true, nullsFirst: false }).limit(20),
    supabase.from("task").select("id", { count: "exact", head: true }).eq("wedding_id", weddingId).neq("status", "skipped"),
    supabase.from("task").select("id", { count: "exact", head: true }).eq("wedding_id", weddingId).eq("status", "done"),
    canMoney ? supabase.from("payment").select("id,label,amount,due_on,vendor:vendor_id(name)").eq("wedding_id", weddingId).is("paid_on", null).order("due_on").returns<Pay[]>() : Promise.resolve({ data: [] as Pay[] }),
    canMoney ? supabase.from("quote").select("total,expires_on,accepted_at,vendor:vendor_id(id,name,status)").eq("wedding_id", weddingId).is("accepted_at", null).returns<Quote[]>() : Promise.resolve({ data: [] as Quote[] }),
    planner ? supabase.from("household").select("id,responded_at") .eq("wedding_id", weddingId) : Promise.resolve({ data: [] as { id: string; responded_at: string | null }[] }),
    ctx.userId && ctx.lastSeen
      ? supabase.from("activity").select("id,actor_type,actor_id,action,entity_type,entity_id,diff,created_at").eq("wedding_id", weddingId)
          .in("actor_type", ["user", "guest"]).or(`actor_id.neq.${ctx.userId},actor_id.is.null`).gt("created_at", ctx.lastSeen)
          .order("created_at", { ascending: false }).limit(6).returns<ActivityRow[]>()
      : Promise.resolve({ data: [] as ActivityRow[] }),
    supabase.from("wedding_member").select("user_id,display_name,role").eq("wedding_id", weddingId).eq("status", "active"),
    supabase.from("vendor").select("category_key,status").eq("wedding_id", weddingId),
  ]);
  if (ctx.userId && ctx.role) await supabase.rpc("mark_activity_seen", { w: weddingId });

  const payments = payRes.data ?? [];
  const households = hhRes.data ?? [];
  const waiting = households.filter((h) => !h.responded_at).length;
  const week = thisWeek({
    today,
    tasks: planner ? tasks ?? [] : [],
    payments: payments.map((p) => ({ id: p.id, label: p.label, vendor_name: p.vendor?.name ?? null, amount: Number(p.amount), due_on: p.due_on })),
    quotes: (quoteRes.data ?? []).filter((q) => q.vendor && q.vendor.status !== "booked" && q.vendor.status !== "passed")
      .map((q) => ({ vendor_id: q.vendor!.id, vendor_name: q.vendor!.name, total: Number(q.total), expires_on: q.expires_on })),
    rsvp: { waiting: planner ? waiting : 0, deadline: w.rsvp_deadline },
  });
  const payById = new Map(payments.map((p) => [p.id, p]));
  const names = new Map((members ?? []).map((m) => [m.user_id as string, (m.display_name as string | null) ?? "Your partner"]));
  const news = actRes.data ?? [];
  const bookedKeys = new Set((vendors ?? []).filter((v) => v.status === "booked").map((v) => v.category_key as string));
  const openCats = CATEGORIES.filter((c) => !["other", "favors"].includes(c.key) && !bookedKeys.has(c.key));
  const nextPay = payments.find((p) => p.due_on && p.due_on >= today);

  // Setup checklist (F1): shown until everything is in.
  const setup = [
    { done: !!w.date && !w.date_is_estimate, label: "Pick your date", href: `${base}/settings` },
    { done: w.lat != null, label: "Add where it is", href: `${base}/settings` },
    { done: !!w.guest_estimate && !w.guest_estimate_is_estimate, label: "Settle a guest count", href: `${base}/budget/what-if` },
    { done: (members ?? []).length > 1, label: "Invite your partner", href: `${base}/together` },
    { done: bookedKeys.has("venue"), label: "Book a venue", href: `${base}/explore/venues` },
  ];
  const setupLeft = setup.filter((s) => !s.done);

  return (
    <>
      <header className="mb-6">
        <p className="eyebrow">{w.name}</p>
        <h1 className="h-page">{countdown(w.date, today, w.date_is_estimate)}</h1>
        <p className="mt-1 text-text-muted">
          {[w.date ? longDate(w.date) + (w.date_is_estimate ? " (estimate)" : "") : null, w.location_text, w.guest_estimate ? `${w.guest_estimate} guests` : null].filter(Boolean).join(" · ")}
        </p>
      </header>

      {news.length > 0 && (
        <section className="card card-pad mb-6 bg-primary-soft">
          <h2 className="text-sm font-medium">Since you last looked</h2>
          <ul className="mt-2 space-y-1 text-sm">
            {news.map((n) => (
              <li key={n.id}>
                <span className="font-medium">{n.actor_type === "guest" ? "A guest" : names.get(n.actor_id ?? "") ?? "Your partner"}</span> {describeActivity(n)}{" "}
                <span className="text-text-muted">· {relativeTime(n.created_at)}</span>
              </li>
            ))}
          </ul>
          <Link href={`${base}/together`} className="mt-2 inline-block text-sm text-primary hover:underline">See everything</Link>
        </section>
      )}

      <section className="mb-8">
        <h2 className="h-section mb-3">This week</h2>
        {week.cards.length === 0 ? (
          <p className="card card-pad text-text-muted">Nothing needs you this week. Enjoy it.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {week.cards.map((c) => <WeekCardView key={c.key} c={c} base={base} weddingId={weddingId} today={today} readOnly={ctx.readOnly} pay={payById.get(c.refId)} />)}
          </ul>
        )}
        {week.more > 0 && planner && <Link href={`${base}/plan`} className="mt-3 inline-block text-sm text-primary hover:underline">{week.more} more on your plan →</Link>}
      </section>

      {ctx.money && (
        <Link href={`${base}/budget`} className="card card-pad card-link mb-6 block">
          <div className="flex items-baseline justify-between">
            <span className="eyebrow">Money</span>
            <ChevronRight size={16} className="text-text-muted" aria-hidden />
          </div>
          <p className={`money text-2xl font-semibold ${ctx.money.stillFlexible < 0 ? "text-over-plan" : ""}`}>
            {ctx.money.stillFlexible >= 0 ? `${formatMoney(ctx.money.stillFlexible)} still flexible` : `${formatMoney(-ctx.money.stillFlexible)} over plan`}
          </p>
          <div className="bar-track mt-3" aria-hidden>
            <div className="bar-fill" style={{ width: `${Math.min(100, (ctx.money.committed / Math.max(1, ctx.money.total)) * 100)}%` }} />
            <div className="bar-fill bar-fill-paid" style={{ width: `${Math.min(100, (ctx.money.paid / Math.max(1, ctx.money.total)) * 100)}%` }} />
          </div>
          <p className="mt-2 text-sm text-text-muted">
            <span className="money">{formatMoney(ctx.money.committed)}</span> committed · <span className="money">{formatMoney(ctx.money.paid)}</span> paid of <span className="money">{formatMoney(ctx.money.total)}</span>
            {nextPay ? <> · next payment <span className="money">{formatMoney(Number(nextPay.amount))}</span> {shortDate(nextPay.due_on)}</> : null}
          </p>
        </Link>
      )}

      {planner && setupLeft.length > 0 && (
        <section className="mb-6">
          <h2 className="h-section mb-2">Getting set up</h2>
          <ul className="card divide-rows">
            {setup.map((s) => (
              <li key={s.label}>
                <Link href={s.href} className="flex items-center gap-3 px-4 py-3 text-sm hover:bg-primary-soft/50">
                  <span className={`flex size-5 items-center justify-center rounded-full border ${s.done ? "border-success bg-success text-surface" : "border-border"}`} aria-hidden>{s.done && <Check size={12} />}</span>
                  <span className={s.done ? "text-text-muted line-through" : ""}>{s.label}</span>
                  <span className="sr-only">{s.done ? "(done)" : ""}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {planner && (
        <>
          <section className="mb-6 grid grid-cols-3 gap-3 text-center">
            <Link href={`${base}/vendors`} className="card card-pad card-link"><span className="block text-2xl font-semibold">{bookedKeys.size}</span><span className="text-xs text-text-muted">vendors booked</span></Link>
            <Link href={`${base}/plan`} className="card card-pad card-link"><span className="block text-2xl font-semibold">{done ?? 0}<span className="text-base text-text-muted">/{total ?? 0}</span></span><span className="text-xs text-text-muted">tasks done</span></Link>
            <Link href={`${base}/guests`} className="card card-pad card-link"><span className="block text-2xl font-semibold">{households.length - waiting}<span className="text-base text-text-muted">/{households.length}</span></span><span className="text-xs text-text-muted">RSVPs in</span></Link>
          </section>
          {openCats.length > 0 && (
            <Link href={`${base}/explore`} className="card card-pad card-link flex items-start gap-3">
              <Lightbulb size={20} className="mt-0.5 shrink-0 text-accent" aria-hidden />
              <span>
                <span className="block font-medium">Still to find: {openCats.slice(0, 3).map((c) => c.name.toLowerCase()).join(", ")}</span>
                <span className="text-sm text-text-muted">See who&apos;s near you in Explore. Saving never contacts anyone.</span>
              </span>
            </Link>
          )}
        </>
      )}
    </>
  );
}

function WeekCardView({ c, base, weddingId, today, readOnly, pay }: { c: WeekCard; base: string; weddingId: string; today: string; readOnly: boolean; pay?: Pay }) {
  let action: React.ReactNode = null;
  if (c.kind === "payment" && pay && !readOnly) action = <MarkPaid weddingId={weddingId} today={today} buttonClass="btn btn-secondary btn-sm" payment={{ id: pay.id, label: pay.label, vendor: pay.vendor?.name ?? null, amount: Number(pay.amount), due_on: pay.due_on }} />;
  else if (c.kind === "task" && !readOnly) action = <TaskDone taskId={c.refId} />;
  else if (c.kind === "rsvp") action = <Link className="btn btn-secondary btn-sm" href={`${base}/guests?show=waiting`}>{c.action}</Link>;
  else if (c.kind === "quote") action = <Link className="btn btn-secondary btn-sm" href={`${base}/vendors/${c.refId}`}>Decide</Link>;
  const tone = c.kind === "payment" ? "border-l-accent" : c.kind === "quote" ? "border-l-primary" : "border-l-border";
  return (
    <li className={`card card-pad flex items-center gap-3 border-l-4 ${tone}`}>
      <div className="min-w-0 flex-1">
        <p className="font-medium">{c.title}</p>
        <p className="text-sm text-text-muted">{c.sub}</p>
      </div>
      {action}
    </li>
  );
}
