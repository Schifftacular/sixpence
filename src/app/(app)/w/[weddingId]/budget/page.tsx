import Link from "next/link";
import { Suspense } from "react";
import { ChevronRight } from "lucide-react";
import { AddCategory, AddContribution, BudgetTotal } from "@/components/budget/budget-forms";
import { MarkPaid } from "@/components/budget/mark-paid";
import { EstimateChip, Loading, PageTitle } from "@/components/shell/page-bits";
import { Money } from "@/components/ui/status";
import { addDays, monthLabel, shortDate } from "@/lib/dates";
import { formatMoney } from "@/lib/money";
import { categoryBenchmark } from "@/lib/plan/benchmarks";
import { createClient } from "@/lib/supabase/server";
import { todayIso } from "@/lib/today";
import { loadWedding } from "@/lib/wedding";

export default function BudgetPage({ params }: PageProps<"/w/[weddingId]/budget">) {
  return (
    <Suspense fallback={<Loading />}>
      <Budget params={params} />
    </Suspense>
  );
}

type Cat = { id: string; key: string | null; name: string; target_amount: number; per_guest: boolean };
type Pay = { id: string; label: string; amount: number; due_on: string | null; paid_on: string | null; vendor: { name: string } | null };

async function Budget({ params }: { params: Promise<{ weddingId: string }> }) {
  const { weddingId } = await params;
  const ctx = await loadWedding(weddingId);
  const base = `/w/${weddingId}`;
  if (!ctx.money) {
    return (
      <>
        <PageTitle>Budget</PageTitle>
        <p className="text-text-muted">The couple hasn&apos;t shared the budget with you.</p>
      </>
    );
  }
  const today = todayIso();
  const supabase = await createClient();
  const [{ data: catsRaw }, { data: paysRaw }, { data: contribs }] = await Promise.all([
    supabase.from("budget_category").select("id,key,name,target_amount,per_guest").eq("wedding_id", weddingId).order("sort").returns<Cat[]>(),
    supabase.from("payment").select("id,label,amount,due_on,paid_on,vendor:vendor_id(name)").eq("wedding_id", weddingId).order("due_on").returns<Pay[]>(),
    supabase.from("contribution").select("id,from_label,amount").eq("wedding_id", weddingId).order("amount", { ascending: false }),
  ]);
  const cats = (catsRaw ?? []).map((c) => ({ ...c, planned: Number(c.target_amount) }));
  const m = ctx.money;
  const guests = ctx.wedding.guest_estimate ?? 0;
  const over = m.stillFlexible < 0;
  const gap = -m.stillFlexible;

  // Three ways to close the gap (copy section 7): fewer guests, trim open categories, or raise the total.
  const perHead = guests > 0 ? cats.filter((c) => c.per_guest).reduce((a, c) => a + c.planned, 0) / guests : 0;
  const fewerGuests = perHead > 0 ? Math.ceil(gap / perHead) : null;
  const room = cats
    .filter((c) => c.key !== "other")
    .map((c) => ({ c, room: c.planned - (ctx.byCategory[c.key ?? ""]?.committed ?? 0) }))
    .filter((x) => x.room > 0 && !(ctx.byCategory[x.c.key ?? ""]?.committed))
    .sort((a, b) => b.room - a.room)
    .slice(0, 2);

  const unpaid = (paysRaw ?? []).filter((p) => !p.paid_on);
  const in30 = unpaid.filter((p) => p.due_on && p.due_on <= addDays(today, 30));
  const due30 = in30.reduce((a, p) => a + Number(p.amount), 0);
  const byMonth = new Map<string, Pay[]>();
  for (const p of unpaid) {
    const k = p.due_on ? p.due_on.slice(0, 7) : "unscheduled";
    byMonth.set(k, [...(byMonth.get(k) ?? []), p]);
  }
  const strip = Array.from({ length: 8 }, (_, i) => {
    const d = new Date(`${today.slice(0, 7)}-15T12:00:00Z`);
    d.setUTCMonth(d.getUTCMonth() + i);
    const key = d.toISOString().slice(0, 7);
    return { key, label: d.toLocaleDateString("en-US", { month: "short", timeZone: "UTC" }), total: (byMonth.get(key) ?? []).reduce((a, p) => a + Number(p.amount), 0) };
  });
  const stripMax = Math.max(1, ...strip.map((s) => s.total));
  const funded = (contribs ?? []).reduce((a, c) => a + Number(c.amount), 0);

  return (
    <>
      <PageTitle sub="Four numbers, always in the same order.">Budget</PageTitle>

      {over ? (
        <section className="card card-pad mb-6 border-accent">
          <p className="font-medium text-text">You&apos;ve committed {formatMoney(gap)} more than your budget.</p>
          <p className="mt-1 text-sm text-text-muted">Here are three ways couples usually close the gap. Nothing changes until you pick one.</p>
          <ul className="mt-3 divide-rows text-sm">
            {fewerGuests ? (
              <li className="flex items-center justify-between gap-3 py-2">
                <span>Invite about {fewerGuests} fewer guests</span>
                <Link className="btn btn-secondary btn-sm" href={`${base}/budget/what-if?guests=${Math.max(1, guests - fewerGuests)}`}>Try it</Link>
              </li>
            ) : null}
            {room.map((r) => (
              <li key={r.c.id} className="flex items-center justify-between gap-3 py-2">
                <span>Trim {r.c.name.toLowerCase()} (nothing booked yet, {formatMoney(r.room)} planned)</span>
                <Link className="btn btn-secondary btn-sm" href={`${base}/budget/${r.c.id}`}>Review</Link>
              </li>
            ))}
            <li className="flex items-center justify-between gap-3 py-2">
              <span>Raise your total to {formatMoney(m.committed)}</span>
              {!ctx.readOnly ? <BudgetTotal weddingId={weddingId} current={m.total} suggested={m.committed} label="Raise" /> : null}
            </li>
          </ul>
        </section>
      ) : null}

      <section className="card card-pad mb-8">
        <p className="eyebrow">{over ? "Over plan" : "Still flexible"}</p>
        <p className={`num-hero mt-1 ${over ? "text-over-plan" : "text-text"}`}>{formatMoney(over ? gap : m.stillFlexible)}</p>
        <p className="mt-1 text-sm text-text-muted">{over ? "More than your total, across what you've booked." : "Total minus what you've committed. Yours to decide."}</p>
        <dl className="mt-4 grid grid-cols-3 gap-2 text-sm">
          <div className="rounded-sm bg-bg p-3">
            <dt className="text-text-muted">Total budget</dt>
            <dd className="money mt-0.5 font-semibold">{formatMoney(m.total)}{ctx.wedding.budget_is_estimate ? <EstimateChip /> : null}</dd>
          </div>
          <div className="rounded-sm bg-bg p-3">
            <dt className="text-text-muted">Committed</dt>
            <dd className="money mt-0.5 font-semibold">{formatMoney(m.committed)}</dd>
          </div>
          <div className="rounded-sm bg-bg p-3">
            <dt className="text-text-muted">Paid</dt>
            <dd className="money mt-0.5 font-semibold">{formatMoney(m.paid)}</dd>
          </div>
        </dl>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          {!ctx.readOnly ? <BudgetTotal weddingId={weddingId} current={m.total} label="Change total" /> : null}
          <Link href={`${base}/budget/what-if`} className="btn btn-quiet">What if we invite more or fewer guests?</Link>
        </div>
      </section>

      <section className="mb-8">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
          <h2 className="h-section">Categories</h2>
          <div className="flex items-center gap-3 text-xs text-text-muted">
            <span className="inline-flex items-center gap-1"><span className="inline-block h-2 w-4 rounded-full bg-primary" /> Committed</span>
            <span className="inline-flex items-center gap-1"><span className="bar-band static inline-block h-2 w-4 rounded-full" /> Typical for {guests} guests</span>
          </div>
        </div>
        <ul className="card divide-rows">
          {cats.map((c) => {
            const mny = ctx.byCategory[c.key ?? ""] ?? { committed: 0, paid: 0, due: 0 };
            const b = c.key ? categoryBenchmark(c.key, guests || 117) : null;
            const scale = Math.max(c.planned, mny.committed, b?.high ?? 0) * 1.1 || 1;
            const overCat = mny.committed > c.planned;
            return (
              <li key={c.id}>
                <Link href={`${base}/budget/${c.id}`} className="card-link flex flex-col gap-2 px-4 py-3">
                  <span className="flex items-center justify-between gap-3">
                    <span className="font-medium text-text">{c.name}{c.per_guest ? <span className="ml-2 text-xs font-normal text-text-muted">per guest</span> : null}</span>
                    <span className="flex items-center gap-1 text-sm text-text-muted">
                      {mny.committed ? (
                        <span className="money"><Money value={mny.committed} over={overCat} /> of {formatMoney(c.planned)}</span>
                      ) : (
                        <span className="money">{formatMoney(c.planned)} planned</span>
                      )}
                      <ChevronRight size={16} strokeWidth={1.75} aria-hidden="true" />
                    </span>
                  </span>
                  <span className="bar-track" aria-hidden="true">
                    {b ? <span className="bar-band" style={{ left: `${(b.low / scale) * 100}%`, width: `${((b.high - b.low) / scale) * 100}%` }} /> : null}
                    <span className={`bar-fill ${overCat ? "bar-fill-over" : ""}`} style={{ width: `calc(${(Math.min(mny.committed, scale) / scale) * 100}% - 4px)`, opacity: mny.committed ? 1 : 0 }} />
                    <span className="absolute top-0 bottom-0 w-0.5 bg-text/50" style={{ left: `${(c.planned / scale) * 100}%` }} />
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
        <p className="hint mt-2">The thin line is your plan. The shaded band is the typical range for weddings your size (national figures).</p>
        {!ctx.readOnly ? <div className="mt-3"><AddCategory weddingId={weddingId} /></div> : null}
      </section>

      <section id="coming-up" className="mb-8 scroll-mt-20">
        <div className="mb-3 flex items-end justify-between gap-2">
          <h2 className="h-section">Coming up</h2>
          <span className="text-sm text-text-muted">{due30 > 0 ? `${formatMoney(due30)} in the next 30 days` : "Nothing in the next 30 days"}</span>
        </div>
        {unpaid.length === 0 ? (
          <p className="card card-pad text-sm text-text-muted">No payments scheduled yet. They&apos;ll show up here when you book a vendor.</p>
        ) : (
          <>
            <div className="card card-pad mb-3">
              <p className="eyebrow mb-2">Cash needed by month</p>
              <div className="flex h-24 items-end gap-2">
                {strip.map((s) => (
                  <div key={s.key} className="flex flex-1 flex-col items-center gap-1">
                    <span className="money text-[0.6875rem] text-text-muted">{s.total ? `$${Math.round(s.total / 100) / 10}k` : ""}</span>
                    <span className="w-full rounded-t-sm bg-primary/70" style={{ height: `${Math.max(2, (s.total / stripMax) * 56)}px`, opacity: s.total ? 1 : 0.25 }} />
                    <span className="text-[0.6875rem] text-text-muted">{s.label}</span>
                  </div>
                ))}
              </div>
            </div>
            {[...byMonth].map(([k, list]) => (
              <div key={k} className="mb-3">
                <p className="eyebrow mb-1.5">{k === "unscheduled" ? "No date yet" : monthLabel(`${k}-15`)}</p>
                <ul className="card divide-rows">
                  {list.map((p) => (
                    <li key={p.id} className="flex items-center justify-between gap-3 px-4 py-3">
                      <span className="min-w-0">
                        <span className="block truncate font-medium text-text">{p.vendor?.name ?? "Payment"} · {p.label.toLowerCase()}</span>
                        <span className="text-sm text-text-muted">{p.due_on ? `Due ${shortDate(p.due_on)}` : "No date yet"}</span>
                      </span>
                      <span className="flex shrink-0 items-center gap-3">
                        <Money value={Number(p.amount)} className="font-medium" />
                        {!ctx.readOnly ? <MarkPaid weddingId={weddingId} today={today} payment={{ id: p.id, label: p.label, vendor: p.vendor?.name ?? null, amount: Number(p.amount), due_on: p.due_on }} /> : null}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </>
        )}
      </section>

      <section className="mb-8">
        <div className="mb-3 flex items-end justify-between gap-2">
          <h2 className="h-section">Who&apos;s paying</h2>
          <span className="text-sm text-text-muted money">{formatMoney(funded)} of {formatMoney(m.total)} accounted for</span>
        </div>
        {(contribs ?? []).length ? (
          <>
            <div className="mb-3 flex h-3 overflow-hidden rounded-full bg-border/60" aria-hidden="true">
              {(contribs ?? []).map((c, i) => (
                <span key={c.id} style={{ width: `${(Number(c.amount) / Math.max(m.total, funded)) * 100}%`, background: ["var(--primary)", "var(--accent)", "var(--success)", "var(--color-blush)"][i % 4] }} />
              ))}
            </div>
            <ul className="card divide-rows">
              {(contribs ?? []).map((c) => (
                <li key={c.id} className="flex items-center justify-between px-4 py-3">
                  <span className="text-text">{c.from_label}</span>
                  <Money value={Number(c.amount)} className="text-text-muted" />
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p className="card card-pad text-sm text-text-muted">If family is chipping in, add it here so everyone can see what it covers.</p>
        )}
        {!ctx.readOnly ? <div className="mt-3"><AddContribution weddingId={weddingId} /></div> : null}
      </section>
    </>
  );
}
