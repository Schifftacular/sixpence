"use client";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { applyGuestCount } from "@/actions/budget";
import { FormError, useAction } from "@/components/ui/sheet";
import { guestWhatIf, type CostCategory, type PerGuestQuote } from "@/lib/guest-cost";
import { formatMoney } from "@/lib/money";

const signed = (n: number) => (n === 0 ? "no change" : `${n > 0 ? "+" : "−"}${formatMoney(Math.abs(n))}`);

export function GuestSlider(props: {
  weddingId: string; readOnly: boolean; currentGuests: number; startGuests: number;
  total: number; committed: number; categories: CostCategory[]; quotes: PerGuestQuote[];
}) {
  const { weddingId, readOnly, currentGuests, total, committed, categories, quotes } = props;
  const [guests, setGuests] = useState(props.startGuests);
  const router = useRouter();
  const { run, pending, error } = useAction(applyGuestCount);
  const w = useMemo(() => guestWhatIf({ categories, quotes, currentGuests, newGuests: guests, total, committed }), [categories, quotes, currentGuests, guests, total, committed]);
  const moved = w.categories.filter((c) => c.newPlanned !== c.planned);
  const max = Math.max(300, Math.ceil(currentGuests * 1.6 / 10) * 10);
  const plannedSum = w.categories.reduce((a, c) => a + c.newPlanned, 0);
  const diff = guests - currentGuests;

  return (
    <div className="flex flex-col gap-6">
      <section className="card card-pad">
        <label htmlFor="guests" className="label">Guests</label>
        <div className="flex items-baseline gap-3">
          <span className="num-hero">{guests}</span>
          <span className="text-text-muted text-sm">{diff === 0 ? "your current estimate" : `${Math.abs(diff)} ${diff > 0 ? "more" : "fewer"} than now (${currentGuests})`}</span>
        </div>
        <input id="guests" type="range" min={10} max={max} step={1} value={guests} onChange={(e) => setGuests(Number(e.target.value))} className="w-full mt-3 accent-[var(--color-primary)]" />
        <div className="flex justify-between text-xs text-text-muted"><span>10</span><span>{max}</span></div>
      </section>

      <section className="grid grid-cols-2 gap-3">
        <div className="card card-pad">
          <p className="eyebrow">Planned spending</p>
          <p className="money text-xl font-semibold">{signed(w.plannedDelta)}</p>
          <p className="hint">Categories that grow with guests: food, cake, rentals and so on.</p>
        </div>
        <div className="card card-pad">
          <p className="eyebrow">Still flexible</p>
          <p className={`money text-xl font-semibold ${w.newStillFlexible < 0 ? "text-over-plan" : ""}`}>{formatMoney(w.newStillFlexible)}</p>
          <p className="hint">{w.committedDelta === 0 ? "Your booked prices don't change." : `Booked per-guest prices change by ${signed(w.committedDelta)}.`}</p>
        </div>
      </section>

      {plannedSum > total && (
        <p className="card card-pad text-sm border-l-4 border-l-[var(--color-over-plan)]">
          At {guests} guests your categories add up to {formatMoney(plannedSum)}, which is {formatMoney(plannedSum - total)} more than your total. You can still apply it and trim later.
        </p>
      )}

      <section>
        <h2 className="h-section mb-2">What moves</h2>
        {moved.length === 0 ? (
          <p className="text-text-muted text-sm">Move the slider to see which categories change.</p>
        ) : (
          <ul className="card divide-rows">
            {moved.map((c) => (
              <li key={c.id} className="flex items-center justify-between px-4 py-3 text-sm">
                <span>{c.name}</span>
                <span className="money">{formatMoney(c.planned)} → <strong>{formatMoney(c.newPlanned)}</strong></span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <FormError error={error} />
      <div className="flex gap-3">
        {!readOnly && (
          <button className="btn btn-primary" disabled={pending || diff === 0}
            onClick={() => run({ weddingId, guests, categories: moved.map((c) => ({ id: c.id, planned: c.newPlanned })) }, () => router.push(`/w/${weddingId}/budget`))}>
            {pending ? "Applying…" : `Apply ${guests} guests`}
          </button>
        )}
        <button className="btn btn-secondary" onClick={() => router.push(`/w/${weddingId}/budget`)}>Just looking</button>
      </div>
    </div>
  );
}
