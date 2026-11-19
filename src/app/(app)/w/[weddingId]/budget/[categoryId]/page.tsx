import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { CategoryPlanEditor } from "@/components/budget/category-editor";
import { MarkPaid } from "@/components/budget/mark-paid";
import { Loading } from "@/components/shell/page-bits";
import { Money, VendorStatusChip } from "@/components/ui/status";
import { shortDate } from "@/lib/dates";
import { formatMoney } from "@/lib/money";
import { BENCHMARK_NOTE, benchmarkNote, categoryBenchmark } from "@/lib/plan/benchmarks";
import { vendorNoun } from "@/lib/plan/templates";
import { createClient } from "@/lib/supabase/server";
import { todayIso } from "@/lib/today";
import { loadWedding } from "@/lib/wedding";

export default function CategoryPage({ params }: PageProps<"/w/[weddingId]/budget/[categoryId]">) {
  return (
    <Suspense fallback={<Loading />}>
      <Category params={params} />
    </Suspense>
  );
}

async function Category({ params }: { params: Promise<{ weddingId: string; categoryId: string }> }) {
  const { weddingId, categoryId } = await params;
  const ctx = await loadWedding(weddingId);
  if (!ctx.money) notFound();
  const base = `/w/${weddingId}`;
  const supabase = await createClient();
  const { data: cats } = await supabase.from("budget_category").select("id,key,name,target_amount").eq("wedding_id", weddingId).order("sort");
  const cat = (cats ?? []).find((c) => c.id === categoryId);
  if (!cat) notFound();
  const key = cat.key ?? "";
  const [{ data: vendors }, { data: payments }] = await Promise.all([
    supabase.from("vendor").select("id,name,status").eq("wedding_id", weddingId).eq("category_key", key).neq("status", "passed"),
    supabase.from("payment").select("id,label,amount,due_on,paid_on,vendor:vendor_id!inner(name,category_key)").eq("wedding_id", weddingId).eq("vendor.category_key", key).order("due_on")
      .returns<{ id: string; label: string; amount: number; due_on: string | null; paid_on: string | null; vendor: { name: string } }[]>(),
  ]);
  const planned = Number(cat.target_amount);
  const mny = ctx.byCategory[key] ?? { committed: 0, paid: 0, due: 0 };
  const guests = ctx.wedding.guest_estimate ?? 117;
  const b = key ? categoryBenchmark(key, guests) : null;
  const note = benchmarkNote(planned, b);
  const scale = Math.max(planned, mny.committed, b?.high ?? 0) * 1.1 || 1;
  const today = todayIso();

  // Rebalance sources: most room above the typical low end first (F3). Committed money can't move.
  const sources = (cats ?? [])
    .filter((c) => c.id !== categoryId)
    .map((c) => {
      const p = Number(c.target_amount);
      const committed = ctx.byCategory[c.key ?? ""]?.committed ?? 0;
      const low = c.key ? categoryBenchmark(c.key, guests)?.low ?? 0 : 0;
      const free = Math.max(0, p - committed);
      return { id: c.id, name: c.name, planned: p, free, aboveLow: Math.max(0, p - Math.max(low, committed)) };
    })
    .filter((s) => s.free > 0)
    .sort((a, b) => b.aboveLow - a.aboveLow);

  return (
    <>
      <Link href={`${base}/budget`} className="btn btn-quiet -ml-2 mb-2">← Budget</Link>
      <h1 className="h-page mb-4">{cat.name}</h1>
      <section className="card card-pad mb-6">
        <dl className="grid grid-cols-3 gap-2 text-sm">
          <div><dt className="text-text-muted">Planned</dt><dd className="money text-lg font-semibold">{formatMoney(planned)}</dd></div>
          <div><dt className="text-text-muted">Committed</dt><dd className={`money text-lg font-semibold ${mny.committed > planned ? "text-over-plan" : ""}`}>{formatMoney(mny.committed)}</dd></div>
          <div><dt className="text-text-muted">Paid</dt><dd className="money text-lg font-semibold">{formatMoney(mny.paid)}</dd></div>
        </dl>
        <div className="bar-track mt-4" aria-hidden="true">
          {b ? <span className="bar-band" style={{ left: `${(b.low / scale) * 100}%`, width: `${((b.high - b.low) / scale) * 100}%` }} /> : null}
          <span className={`bar-fill ${mny.committed > planned ? "bar-fill-over" : ""}`} style={{ width: `calc(${(mny.committed / scale) * 100}% - 4px)`, opacity: mny.committed ? 1 : 0 }} />
          <span className="absolute top-0 bottom-0 w-0.5 bg-text/50" style={{ left: `${(planned / scale) * 100}%` }} />
        </div>
        {b ? <p className="mt-2 text-sm text-text-muted">Typical for {guests} guests: <span className="money">{formatMoney(b.low)} to {formatMoney(b.high)}</span></p> : null}
        {note ? <p className="mt-1 text-sm text-text-muted">{note}</p> : null}
        {mny.committed > planned ? (
          <p className="mt-2 text-sm text-text">You&apos;ve committed {formatMoney(mny.committed - planned)} more than you planned here. That&apos;s fine if this matters most to you. Want to update the plan?</p>
        ) : null}
        {b ? <p className="hint mt-2">{BENCHMARK_NOTE}</p> : null}
      </section>

      {!ctx.readOnly ? (
        <section className="mb-6">
          <CategoryPlanEditor weddingId={weddingId} categoryId={categoryId} name={cat.name} planned={planned} committed={mny.committed} total={ctx.money.total} guests={guests} sources={sources} />
        </section>
      ) : null}

      <section className="mb-6">
        <h2 className="h-section mb-2">Vendors</h2>
        {(vendors ?? []).length ? (
          <ul className="card divide-rows">
            {(vendors ?? []).map((v) => (
              <li key={v.id}>
                <Link href={`${base}/vendors/${v.id}`} className="card-link flex items-center justify-between gap-3 px-4 py-3">
                  <span className="font-medium">{v.name}</span>
                  <VendorStatusChip status={v.status} />
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="card card-pad text-sm text-text-muted">No {vendorNoun(key)} yet.</p>
        )}
        {key && key !== "other" ? (
          <div className="mt-2 flex flex-wrap gap-2">
            <Link href={`${base}/explore/vendors?cat=${key}`} className="btn btn-secondary btn-sm">See {vendorNoun(key)}s that fit {formatMoney(planned)}</Link>
            <Link href={`${base}/vendors/category/${key}`} className="btn btn-quiet">Your {vendorNoun(key)}s</Link>
          </div>
        ) : null}
      </section>

      {(payments ?? []).length ? (
        <section className="mb-6">
          <h2 className="h-section mb-2">Payments</h2>
          <ul className="card divide-rows">
            {(payments ?? []).map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                <span>
                  <span className="block text-text">{p.vendor.name} · {p.label.toLowerCase()}</span>
                  <span className="text-text-muted">{p.paid_on ? `Paid ${shortDate(p.paid_on)}` : p.due_on ? `Due ${shortDate(p.due_on)}` : "No date yet"}</span>
                </span>
                <span className="flex items-center gap-3">
                  <Money value={Number(p.amount)} className={p.paid_on ? "text-success" : ""} />
                  {!p.paid_on && !ctx.readOnly ? <MarkPaid weddingId={weddingId} today={today} payment={{ id: p.id, label: p.label, vendor: p.vendor.name, amount: Number(p.amount), due_on: p.due_on }} /> : null}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </>
  );
}
