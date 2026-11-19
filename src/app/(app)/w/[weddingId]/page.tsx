import Link from "next/link";
import { Suspense } from "react";
import { Loading, PageTitle } from "@/components/shell/page-bits";
import { formatMoney } from "@/lib/money";
import { createClient } from "@/lib/supabase/server";
import { todayIso } from "@/lib/today";
import { loadWedding } from "@/lib/wedding";

export default function ThisWeekPage({ params }: PageProps<"/w/[weddingId]">) {
  return (
    <Suspense fallback={<Loading />}>
      <ThisWeek params={params} />
    </Suspense>
  );
}

const ACTION_TEXT: Record<string, string> = {
  "plan.saved": "made your starting plan",
  "task.completed": "checked off a task",
  "task.added": "added a task",
  "task.updated": "updated a task",
};

function daysUntil(date: string, today: string) {
  return Math.round((Date.parse(`${date}T12:00:00Z`) - Date.parse(`${today}T12:00:00Z`)) / 86_400_000);
}

function shortDate(iso: string) {
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}

async function ThisWeek({ params }: { params: Promise<{ weddingId: string }> }) {
  const { weddingId } = await params;
  const ctx = await loadWedding(weddingId);
  const base = `/w/${weddingId}`;
  const today = todayIso();
  const supabase = await createClient();

  const isPlanner = ctx.role !== "funder";
  const [{ data: next }, { count: total }, { count: done }, { data: news }] = await Promise.all([
    supabase.from("task").select("id,title,due_date").eq("wedding_id", weddingId).eq("status", "todo")
      .order("due_date", { ascending: true, nullsFirst: false }).limit(3),
    supabase.from("task").select("id", { count: "exact", head: true }).eq("wedding_id", weddingId),
    supabase.from("task").select("id", { count: "exact", head: true }).eq("wedding_id", weddingId).eq("status", "done"),
    ctx.userId && ctx.partnerDot
      ? supabase.from("activity").select("id,action,created_at").eq("wedding_id", weddingId)
          .eq("actor_type", "user").neq("actor_id", ctx.userId).order("created_at", { ascending: false }).limit(5)
      : Promise.resolve({ data: [] as { id: number; action: string; created_at: string }[] }),
  ]);
  if (ctx.userId && ctx.role) await supabase.rpc("mark_activity_seen", { w: weddingId });

  const d = ctx.wedding.date ? daysUntil(ctx.wedding.date, today) : null;
  const countdown =
    d === null ? "Date not set yet" : d > 0 ? `${d} days to go${ctx.wedding.date_is_estimate ? " (estimated)" : ""}` : d === 0 ? "Today's the day" : "Married!";

  const rows = [
    ctx.money && {
      href: `${base}/budget`,
      label: "Budget",
      value:
        ctx.money.stillFlexible >= 0
          ? `${formatMoney(ctx.money.stillFlexible)} still flexible of ${formatMoney(ctx.money.total)}`
          : `${formatMoney(-ctx.money.stillFlexible)} over plan`,
      over: ctx.money.stillFlexible < 0,
    },
    isPlanner && {
      href: `${base}/guests`,
      label: "Guests",
      value: ctx.wedding.guest_estimate ? `About ${ctx.wedding.guest_estimate} guests` : "No guest count yet",
    },
    isPlanner && { href: `${base}/vendors`, label: "Your vendors", value: "None booked yet" },
    isPlanner && { href: `${base}/plan`, label: "Plan", value: `${done ?? 0} of ${total ?? 0} tasks done` },
  ].filter(Boolean) as { href: string; label: string; value: string; over?: boolean }[];

  return (
    <>
      <PageTitle sub={countdown}>This week</PageTitle>

      {news && news.length > 0 ? (
        <section className="mb-6 rounded-md border border-border bg-surface p-4">
          <h2 className="text-sm font-medium text-text">Since you last looked</h2>
          <ul className="mt-2 space-y-1 text-sm text-text-muted">
            {news.map((n) => (
              <li key={n.id}>Your partner {ACTION_TEXT[n.action] ?? "made a change"}.</li>
            ))}
          </ul>
        </section>
      ) : null}

      {isPlanner ? (
        <section className="mb-8">
          <h2 className="mb-3 font-medium text-text">Next up</h2>
          {next && next.length > 0 ? (
            <ul className="divide-y divide-border rounded-md border border-border bg-surface">
              {next.map((t) => (
                <li key={t.id} className="flex items-center justify-between gap-3 px-4 py-3">
                  <span className="text-text">{t.title}</span>
                  {t.due_date ? (
                    <span className="shrink-0 text-sm text-text-muted">
                      {t.due_date <= today ? "Do soon" : shortDate(t.due_date)}
                    </span>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-text-muted">Nothing due. Enjoy the week.</p>
          )}
        </section>
      ) : null}

      <section>
        <h2 className="mb-3 font-medium text-text">At a glance</h2>
        <ul className="divide-y divide-border rounded-md border border-border bg-surface">
          {rows.map((r) => (
            <li key={r.label}>
              <Link href={r.href} className="flex items-center justify-between gap-3 px-4 py-3 transition hover:bg-primary-soft">
                <span className="font-medium text-text">{r.label}</span>
                <span className={`text-right text-sm ${r.over ? "text-over-plan" : "text-text-muted"}`}>{r.value}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
