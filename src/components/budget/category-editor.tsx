"use client";
import { useMemo, useState } from "react";
import { setCategoryPlan } from "@/actions/budget";
import { FormError, useAction } from "@/components/ui/sheet";
import { formatMoney } from "@/lib/money";

type Source = { id: string; name: string; planned: number; free: number; aboveLow: number };

/** Change planned amount: keep the total (pick where it comes from) or raise the total. Nothing moves on its own. */
export function CategoryPlanEditor(props: {
  weddingId: string; categoryId: string; name: string; planned: number; committed: number; total: number; guests: number; sources: Source[];
}) {
  const [open, setOpen] = useState(false);
  const [amountText, setAmountText] = useState(String(Math.round(Math.max(props.planned, props.committed))));
  const [mode, setMode] = useState<"keep" | "raise">("keep");
  const [picked, setPicked] = useState<Record<string, number>>({});
  const { run, pending, error, setError } = useAction(setCategoryPlan);
  const amount = Number(amountText.replace(/[$,\s]/g, "")) || 0;
  const delta = Math.round(amount - props.planned);
  const pickedTotal = Object.values(picked).reduce((a, n) => a + n, 0);

  // Suggest: fill from the top sources until the difference is covered.
  const suggestion = useMemo(() => {
    const out: Record<string, number> = {};
    let left = delta;
    for (const s of props.sources) {
      if (left <= 0) break;
      const take = Math.min(left, Math.floor(s.free / 50) * 50 || s.free);
      if (take > 0) { out[s.id] = take; left -= take; }
    }
    return out;
  }, [delta, props.sources]);

  if (!open) {
    return <button type="button" className="btn btn-primary" onClick={() => setOpen(true)}>Change planned amount</button>;
  }
  const take = Object.keys(picked).length ? picked : suggestion;
  const takeTotal = Object.keys(picked).length ? pickedTotal : Object.values(suggestion).reduce((a, n) => a + n, 0);

  return (
    <form
      className="card card-pad flex flex-col gap-4"
      action={() => {
        if (delta === 0) return setOpen(false);
        if (mode === "keep" && delta > 0 && takeTotal !== delta) return setError(`Pick ${formatMoney(delta)} from other categories (${formatMoney(takeTotal)} so far).`);
        run({
          weddingId: props.weddingId, categoryId: props.categoryId, amount, mode,
          takeFrom: mode === "keep" && delta > 0 ? Object.entries(take).map(([categoryId, a]) => ({ categoryId, amount: a })) : [],
        }, () => setOpen(false));
      }}
    >
      <div>
        <label className="label" htmlFor="planned">New planned amount for {props.name.toLowerCase()}</label>
        <input id="planned" className="input money" inputMode="numeric" value={amountText} onChange={(e) => { setAmountText(e.target.value); setPicked({}); }} />
        {delta !== 0 ? <p className="hint mt-1">That&apos;s {formatMoney(Math.abs(delta))} {delta > 0 ? "more" : "less"} than before.</p> : null}
      </div>
      {delta > 0 ? (
        <fieldset className="flex flex-col gap-2">
          <legend className="label">Where should it come from?</legend>
          <label className="flex cursor-pointer items-start gap-3 rounded-sm border border-border p-3 has-checked:border-primary has-checked:bg-primary-soft">
            <input type="radio" name="mode" className="mt-1 accent-(--primary)" checked={mode === "keep"} onChange={() => setMode("keep")} />
            <span><span className="font-medium">Keep my total at {formatMoney(props.total)}</span><br /><span className="text-sm text-text-muted">and take {formatMoney(delta)} from other categories</span></span>
          </label>
          <label className="flex cursor-pointer items-start gap-3 rounded-sm border border-border p-3 has-checked:border-primary has-checked:bg-primary-soft">
            <input type="radio" name="mode" className="mt-1 accent-(--primary)" checked={mode === "raise"} onChange={() => setMode("raise")} />
            <span><span className="font-medium">Raise my total to {formatMoney(props.total + delta)}</span><br /><span className="text-sm text-text-muted">about {formatMoney(Math.round(delta / Math.max(1, props.guests)))} more per guest</span></span>
          </label>
        </fieldset>
      ) : null}
      {delta > 0 && mode === "keep" ? (
        <div>
          <p className="label">Take it from (suggested: most room above the typical low end)</p>
          <ul className="card divide-rows">
            {props.sources.slice(0, 6).map((s) => {
              const val = take[s.id] ?? 0;
              return (
                <li key={s.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                  <span className="min-w-0"><span className="block font-medium">{s.name}</span><span className="text-text-muted">{formatMoney(s.planned)} planned · {formatMoney(s.free)} not committed</span></span>
                  <input
                    aria-label={`Amount from ${s.name}`}
                    className="input money w-28 text-right"
                    inputMode="numeric"
                    value={val || ""}
                    placeholder="0"
                    onChange={(e) => {
                      const n = Math.min(s.free, Number(e.target.value.replace(/[$,\s]/g, "")) || 0);
                      setPicked({ ...take, [s.id]: n });
                    }}
                  />
                </li>
              );
            })}
          </ul>
          <p className="hint mt-1">{formatMoney(takeTotal)} of {formatMoney(delta)} picked.</p>
        </div>
      ) : null}
      {delta < 0 ? <p className="text-sm text-text-muted">The {formatMoney(-delta)} you free up goes to your cushion. Your total stays {formatMoney(props.total)}.</p> : null}
      <FormError error={error} />
      <div className="flex gap-2">
        <button className="btn btn-primary" disabled={pending}>{pending ? "Saving…" : delta > 0 && mode === "keep" ? `Move ${formatMoney(delta)}` : "Save"}</button>
        <button type="button" className="btn btn-secondary" onClick={() => setOpen(false)}>Cancel</button>
      </div>
    </form>
  );
}
