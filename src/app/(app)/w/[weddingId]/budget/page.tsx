import { Suspense } from "react";
import { EstimateChip, Loading, PageTitle } from "@/components/shell/page-bits";
import { formatMoney } from "@/lib/money";
import { createClient } from "@/lib/supabase/server";
import { loadWedding } from "@/lib/wedding";

export default function BudgetPage({ params }: PageProps<"/w/[weddingId]/budget">) {
  return (
    <Suspense fallback={<Loading />}>
      <Budget params={params} />
    </Suspense>
  );
}

async function Budget({ params }: { params: Promise<{ weddingId: string }> }) {
  const { weddingId } = await params;
  const ctx = await loadWedding(weddingId);
  if (!ctx.money) {
    return (
      <>
        <PageTitle>Budget</PageTitle>
        <p className="text-text-muted">The couple hasn&apos;t shared the budget with you.</p>
      </>
    );
  }
  const supabase = await createClient();
  const { data: cats } = await supabase
    .from("budget_category")
    .select("id,name,target_amount")
    .eq("wedding_id", weddingId)
    .order("sort");

  const m = ctx.money;
  const over = m.stillFlexible < 0;
  const numbers = [
    { label: "Total budget", value: formatMoney(m.total), chip: ctx.wedding.budget_is_estimate },
    { label: "Committed", value: formatMoney(m.committed), hint: "Signed or agreed" },
    { label: "Paid", value: formatMoney(m.paid), hint: "Already out the door" },
    over
      ? { label: "Over plan", value: formatMoney(-m.stillFlexible), over: true, hint: "Let's find room together" }
      : { label: "Still flexible", value: formatMoney(m.stillFlexible), hint: "Yours to decide" },
  ];

  return (
    <>
      <PageTitle sub="Four numbers, always in the same place.">Budget</PageTitle>
      <dl className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {numbers.map((n) => (
          <div key={n.label} className="rounded-md border border-border bg-surface p-4">
            <dt className="text-sm text-text-muted">{n.label}</dt>
            <dd className={`mt-1 font-display text-2xl ${n.over ? "text-over-plan" : "text-text"}`}>
              {n.value}
              {n.chip ? <EstimateChip /> : null}
            </dd>
            {n.hint ? <p className="mt-1 text-xs text-text-muted">{n.hint}</p> : null}
          </div>
        ))}
      </dl>

      <h2 className="mb-3 font-medium text-text">Your plan by category</h2>
      <ul className="divide-y divide-border rounded-md border border-border bg-surface">
        {(cats ?? []).map((c) => (
          <li key={c.id} className="flex items-center justify-between px-4 py-3">
            <span className="text-text">{c.name}</span>
            <span className="text-sm text-text-muted">{formatMoney(Number(c.target_amount))} planned</span>
          </li>
        ))}
      </ul>
      {ctx.wedding.budget_is_estimate ? (
        <p className="mt-3 text-sm text-text-muted">
          This total is an estimate from typical weddings your size. Change it any time; nothing is locked in.
        </p>
      ) : null}
    </>
  );
}
