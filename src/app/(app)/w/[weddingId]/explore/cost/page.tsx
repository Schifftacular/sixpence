import Link from "next/link";
import { Suspense } from "react";
import { Back } from "@/components/explore/explore-bits";
import { Loading } from "@/components/shell/page-bits";
import { formatMoney } from "@/lib/money";
import { categoryBenchmark } from "@/lib/plan/benchmarks";
import { COST_SOURCE, costRange } from "@/lib/plan/cost";
import { CATEGORIES } from "@/lib/plan/templates";
import { createClient } from "@/lib/supabase/server";
import { loadWedding } from "@/lib/wedding";

export default function CostPage({ params, searchParams }: PageProps<"/w/[weddingId]/explore/cost">) {
  return (
    <Suspense fallback={<Loading />}>
      <Cost params={params} searchParams={searchParams} />
    </Suspense>
  );
}

const SIZES = [50, 75, 100, 125, 150, 200];

async function Cost({ params, searchParams }: { params: Promise<{ weddingId: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { weddingId } = await params;
  const sp = await searchParams;
  const ctx = await loadWedding(weddingId);
  const base = `/w/${weddingId}`;
  const mineGuests = ctx.wedding.guest_estimate ?? 100;
  const guests = Number(sp.guests) > 0 ? Math.min(400, Math.round(Number(sp.guests))) : mineGuests;
  const total = costRange(guests);
  let plans = new Map<string, number>();
  if (ctx.money) {
    const { data } = await (await createClient()).from("budget_category").select("key,target_amount").eq("wedding_id", weddingId);
    plans = new Map((data ?? []).map((c) => [c.key as string, Number(c.target_amount)]));
  }
  const showMine = ctx.money && guests === mineGuests;
  const rows = CATEGORIES.filter((c) => c.key !== "other").map((c) => ({ ...c, b: categoryBenchmark(c.key, guests)! }));
  const max = Math.max(...rows.map((r) => Math.max(r.b.high, showMine ? plans.get(r.key) ?? 0 : 0)));

  return (
    <>
      <Back href={`${base}/explore`} />
      <h1 className="h-page mb-1">What things cost</h1>
      <p className="mb-4 text-text-muted">What weddings your size usually spend, so you know what&apos;s normal before you ask for quotes.</p>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className="text-sm text-text-muted">Guests</span>
        {[...new Set([mineGuests, ...SIZES])].sort((a, b) => a - b).map((n) => (
          <Link key={n} href={`${base}/explore/cost${n === mineGuests ? "" : `?guests=${n}`}`} className={`chip chip-toggle ${n === guests ? "chip-success" : ""}`}>
            {n}{n === mineGuests ? " (you)" : ""}
          </Link>
        ))}
      </div>
      <section className="card card-pad mb-5">
        <p className="eyebrow">A wedding for {guests}</p>
        <p className="money num-hero">{formatMoney(total.low)}–{formatMoney(total.high)}</p>
        <p className="text-sm text-text-muted">Typical is around <span className="money">{formatMoney(total.typical)}</span>.{showMine && ctx.money ? <> Your total is <span className="money">{formatMoney(ctx.money.total)}</span>.</> : null}</p>
      </section>
      <ul className="card divide-rows">
        {rows.map((r) => {
          const plan = showMine ? plans.get(r.key) : undefined;
          const pct = (n: number) => `${(n / max) * 100}%`;
          return (
            <li key={r.key} className="px-4 py-3">
              <div className="flex items-baseline justify-between gap-2 text-sm">
                <span className="font-medium">{r.name}{r.perGuest ? <span className="font-normal text-text-muted"> · per guest</span> : null}</span>
                <span className="money text-text-muted">{formatMoney(r.b.low)}–{formatMoney(r.b.high)}</span>
              </div>
              <div className="bar-track relative mt-2" aria-hidden>
                <div className="bar-band absolute inset-y-0" style={{ left: pct(r.b.low), width: pct(r.b.high - r.b.low) }} />
                {plan != null && <div className="absolute -inset-y-1 w-0.5 bg-primary" style={{ left: pct(plan) }} />}
              </div>
              {plan != null && <p className="mt-1 text-xs text-text-muted">Your plan <span className="money">{formatMoney(plan)}</span></p>}
              {r.perGuest && <p className="mt-1 text-xs text-text-muted">About <span className="money">{formatMoney(Math.round(r.b.typical / guests))}</span> per guest</p>}
            </li>
          );
        })}
      </ul>
      <p className="mt-4 text-xs text-text-muted">
        National figures from the <a className="underline" href={COST_SOURCE.url} target="_blank" rel="noopener noreferrer">{COST_SOURCE.name}</a>, split by typical category shares. Prices vary a lot by place and season; local adjustment is coming. These are estimates, not quotes.
      </p>
    </>
  );
}
