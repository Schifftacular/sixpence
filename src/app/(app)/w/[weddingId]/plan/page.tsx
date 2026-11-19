import { CalendarClock } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { AddTask } from "@/components/plan/add-task";
import { TaskCheck } from "@/components/plan/task-check";
import { RecoverTask, TaskEdit } from "@/components/plan/task-edit";
import { Loading, PageTitle } from "@/components/shell/page-bits";
import { addDays, daysBetween, shortDate } from "@/lib/dates";
import { CATEGORIES } from "@/lib/plan/templates";
import { createClient } from "@/lib/supabase/server";
import { todayIso } from "@/lib/today";
import { loadWedding } from "@/lib/wedding";

export default function PlanPage({ params, searchParams }: PageProps<"/w/[weddingId]/plan">) {
  return (
    <Suspense fallback={<Loading />}>
      <Plan params={params} searchParams={searchParams} />
    </Suspense>
  );
}

type Task = {
  id: string; title: string; why: string | null; notes: string | null; due_date: string | null; status: "todo" | "done" | "skipped";
  category: string | null; template_key: string | null; assignee_member_id: string | null; vendor: { id: string; name: string } | null;
};

const BUCKETS = [
  { key: "now", title: "Now", sub: "The next month, plus anything that's ready when you are." },
  { key: "next", title: "Next", sub: "One to four months out." },
  { key: "later", title: "Later", sub: "No need to think about these yet." },
] as const;

async function Plan({ params, searchParams }: { params: Promise<{ weddingId: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const [{ weddingId }, sp] = await Promise.all([params, searchParams]);
  const ctx = await loadWedding(weddingId);
  const base = `/w/${weddingId}`;
  const today = todayIso();
  const supabase = await createClient();
  const [{ data }, { data: members }] = await Promise.all([
    supabase.from("task").select("id,title,why,notes,due_date,status,category,template_key,assignee_member_id,vendor:vendor_id(id,name)")
      .eq("wedding_id", weddingId).order("due_date", { ascending: true, nullsFirst: false }).returns<Task[]>(),
    supabase.from("wedding_member").select("id,display_name,role").eq("wedding_id", weddingId).eq("status", "active").in("role", ["owner", "collaborator"]),
  ]);
  const people = (members ?? []).map((m) => ({ id: m.id as string, name: (m.display_name as string | null) ?? (m.id === ctx.memberId ? "Me" : "Partner") }));
  const nameOf = new Map(people.map((p) => [p.id, p.id === ctx.memberId ? "You" : p.name]));
  const filter = sp.who === "mine" ? "mine" : "all";
  const all = data ?? [];
  const visible = all.filter((t) => filter === "all" || t.assignee_member_id === ctx.memberId || (filter === "mine" && !ctx.memberId));
  const todo = visible.filter((t) => t.status === "todo");
  const done = visible.filter((t) => t.status === "done");
  const skipped = visible.filter((t) => t.status === "skipped");
  const bucketOf = (t: Task) => {
    if (!t.due_date) return "later";
    const d = daysBetween(today, t.due_date);
    return d <= 30 ? "now" : d <= 120 ? "next" : "later";
  };
  const totalActive = all.filter((t) => t.status !== "skipped").length;
  const doneAll = all.filter((t) => t.status === "done").length;
  const pct = totalActive ? Math.round((doneAll / totalActive) * 100) : 0;
  const dayOut = ctx.wedding.date ? daysBetween(today, ctx.wedding.date) : null;

  const row = (t: Task) => {
    const cat = CATEGORIES.find((c) => c.key === t.category);
    const browse = t.status === "todo" && t.template_key?.startsWith("book_") && cat
      ? cat.key === "venue" ? `${base}/explore/venues` : `${base}/explore/vendors?cat=${cat.key}` : null;
    const ready = t.status === "todo" && t.due_date && t.due_date < today;
    return (
      <li key={t.id} className="flex items-start gap-2 px-4 py-3">
        <div className="min-w-0 flex-1">
          <TaskCheck taskId={t.id} title={t.title} done={t.status === "done"} disabled={ctx.readOnly} />
          <div className="mt-1 ml-8 flex flex-col gap-1 text-sm text-text-muted">
            {t.why && t.status === "todo" && <p>{t.why}</p>}
            <p className="flex flex-wrap items-center gap-x-3 gap-y-1">
              {t.due_date && <span>{ready ? "Ready when you are" : shortDate(t.due_date)}</span>}
              {t.assignee_member_id && <span className="chip chip-muted">{nameOf.get(t.assignee_member_id) ?? "Someone"}</span>}
              {t.vendor && <Link className="text-primary hover:underline" href={`${base}/vendors/${t.vendor.id}`}>{t.vendor.name}</Link>}
              {browse && <Link className="text-primary hover:underline" href={browse}>Find {cat!.vendorNoun}s near you</Link>}
            </p>
            {t.notes && <p className="whitespace-pre-wrap">{t.notes}</p>}
          </div>
        </div>
        {!ctx.readOnly && t.status !== "skipped" && <TaskEdit task={t} members={people} />}
      </li>
    );
  };

  return (
    <>
      <PageTitle sub={`${doneAll} of ${totalActive} done`}>Plan</PageTitle>
      <div className="bar-track mb-5" aria-hidden><div className="bar-fill bar-fill-paid" style={{ width: `${pct}%` }} /></div>

      {dayOut != null && dayOut >= 0 && (
        <Link href={`${base}/plan/day`} className="card card-pad card-link mb-5 flex items-center gap-3">
          <CalendarClock size={20} className="text-primary" aria-hidden />
          <span className="flex-1">
            <span className="block font-medium">The day</span>
            <span className="text-sm text-text-muted">Your timeline, who arrives when, and who to call.</span>
          </span>
        </Link>
      )}

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Link href={`${base}/plan`} className={`chip chip-toggle ${filter === "all" ? "chip-success" : ""}`}>Everything</Link>
        {ctx.memberId && <Link href={`${base}/plan?who=mine`} className={`chip chip-toggle ${filter === "mine" ? "chip-success" : ""}`}>Mine</Link>}
      </div>

      {!ctx.readOnly && <AddTask weddingId={weddingId} autoFocus={sp.add === "task"} />}

      {BUCKETS.map((b) => {
        const list = todo.filter((t) => bucketOf(t) === b.key);
        if (!list.length) return null;
        return (
          <section key={b.key} className="mb-6">
            <h2 className="h-section">{b.title} <span className="text-sm font-normal text-text-muted">· {list.length}</span></h2>
            <p className="mb-2 text-sm text-text-muted">{b.key === "next" && ctx.wedding.date ? `Until ${shortDate(addDays(today, 120))}.` : b.sub}</p>
            <ul className="card divide-rows">{list.map(row)}</ul>
          </section>
        );
      })}
      {todo.length === 0 && <p className="card card-pad mb-6 text-text-muted">{filter === "mine" ? "Nothing assigned to you. Nice." : "Everything's done. Truly."}</p>}

      {done.length > 0 && (
        <details className="mb-4">
          <summary className="cursor-pointer text-sm font-medium text-text-muted">Done ({done.length})</summary>
          <ul className="card divide-rows mt-2">{done.map(row)}</ul>
        </details>
      )}
      {skipped.length > 0 && (
        <details className="mb-6">
          <summary className="cursor-pointer text-sm font-medium text-text-muted">Skipped ({skipped.length})</summary>
          <ul className="card divide-rows mt-2">
            {skipped.map((t) => (
              <li key={t.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                <span className="text-text-muted">{t.title}</span>
                {!ctx.readOnly && <RecoverTask taskId={t.id} />}
              </li>
            ))}
          </ul>
        </details>
      )}
    </>
  );
}
