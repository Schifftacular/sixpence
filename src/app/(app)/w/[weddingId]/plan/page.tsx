import { Suspense } from "react";
import { AddTask } from "@/components/plan/add-task";
import { TaskCheck } from "@/components/plan/task-check";
import { Loading, PageTitle } from "@/components/shell/page-bits";
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

type Task = { id: string; title: string; due_date: string | null; status: "todo" | "done" | "skipped" };

function monthLabel(iso: string | null, today: string) {
  if (!iso) return "Whenever";
  if (iso <= today) return "Do soon";
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
}

async function Plan({ params, searchParams }: {
  params: Promise<{ weddingId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ weddingId }, sp] = await Promise.all([params, searchParams]);
  const ctx = await loadWedding(weddingId);
  const today = todayIso();
  const supabase = await createClient();
  const { data } = await supabase
    .from("task")
    .select("id,title,due_date,status")
    .eq("wedding_id", weddingId)
    .neq("status", "skipped")
    .order("due_date", { ascending: true, nullsFirst: false })
    .returns<Task[]>();
  const tasks = data ?? [];

  const groups = new Map<string, Task[]>();
  for (const t of tasks.filter((t) => t.status === "todo")) {
    const k = monthLabel(t.due_date, today);
    groups.set(k, [...(groups.get(k) ?? []), t]);
  }
  const done = tasks.filter((t) => t.status === "done");

  return (
    <>
      <PageTitle sub={`${done.length} of ${tasks.length} done`}>Plan</PageTitle>
      {!ctx.readOnly ? <AddTask weddingId={weddingId} autoFocus={sp.add === "task"} /> : null}
      {[...groups].map(([label, list]) => (
        <section key={label} className="mb-6">
          <h2 className="mb-2 text-sm font-medium text-text-muted">{label}</h2>
          <ul className="divide-y divide-border rounded-md border border-border bg-surface">
            {list.map((t) => (
              <li key={t.id} className="px-4 py-3">
                <TaskCheck taskId={t.id} title={t.title} done={false} disabled={ctx.readOnly} />
              </li>
            ))}
          </ul>
        </section>
      ))}
      {done.length > 0 ? (
        <details className="mb-6">
          <summary className="cursor-pointer text-sm font-medium text-text-muted">Done ({done.length})</summary>
          <ul className="mt-2 divide-y divide-border rounded-md border border-border bg-surface">
            {done.map((t) => (
              <li key={t.id} className="px-4 py-3">
                <TaskCheck taskId={t.id} title={t.title} done disabled={ctx.readOnly} />
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </>
  );
}
