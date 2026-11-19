"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { GoogleSignIn } from "@/components/google-sign-in";
import { formatMoney } from "@/lib/money";
import { costRange } from "@/lib/plan/cost";
import { DEFAULT_GUESTS, generatePlan, type PlanAnswers } from "@/lib/plan/generate-plan";
import { saveStartAnswers } from "@/lib/start-storage";
import { createClient } from "@/lib/supabase/client";
import { todayIso } from "@/lib/today";

type DateAnswer = PlanAnswers["date"];
type Season = "spring" | "summer" | "fall" | "winter";

const btn = "rounded-pill px-5 py-3 font-medium transition disabled:opacity-50";
const primary = `${btn} bg-primary text-on-primary shadow-float hover:opacity-90`;
const quiet = `${btn} border border-border bg-surface text-text hover:bg-primary-soft`;
const input = "w-full rounded-sm border border-border bg-surface px-4 py-3 text-lg text-text";

function Choice({ selected, onClick, children }: { selected: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className="w-full rounded-md border border-border bg-surface px-4 py-3 text-left text-text transition hover:bg-primary-soft aria-pressed:border-primary aria-pressed:bg-primary-soft"
    >
      {children}
    </button>
  );
}

const noSubscribe = () => () => {};

export function StartFlow({ supabaseReady }: { supabaseReady: boolean }) {
  // "Today" is read in the browser after mount, so the page stays a static prerender.
  const today = useSyncExternalStore(noSubscribe, todayIso, () => null);
  if (!today) return <p className="text-sm text-text-muted" aria-busy="true">Loading…</p>;
  return <Flow supabaseReady={supabaseReady} today={today} />;
}

function Flow({ supabaseReady, today }: { supabaseReady: boolean; today: string }) {
  const router = useRouter();
  const thisYear = Number(today.slice(0, 4));
  const [step, setStep] = useState(0);
  const [date, setDate] = useState<DateAnswer>({ kind: "unknown" });
  const [dateMode, setDateMode] = useState<"exact" | "season" | "unknown" | null>(null);
  const [exact, setExact] = useState("");
  const [season, setSeason] = useState<Season>("fall");
  const [year, setYear] = useState(thisYear + 1);
  const [guestsText, setGuestsText] = useState("");
  const [budgetText, setBudgetText] = useState("");
  const [guests, setGuests] = useState<number | null>(null);
  const [budget, setBudget] = useState<number | null>(null);
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    if (!supabaseReady) return;
    createClient().auth.getClaims().then(({ data }) => setSignedIn(Boolean(data?.claims?.sub)));
  }, [supabaseReady]);

  const answers = useMemo(
    () => ({ date, guests, budget, stage: "just_engaged", priorities: [], location: null }) satisfies PlanAnswers,
    [date, guests, budget],
  );
  const plan = useMemo(() => (step === 3 ? generatePlan(answers, today) : null), [step, answers, today]);
  useEffect(() => {
    if (step === 3) saveStartAnswers(answers);
  }, [step, answers]);

  const range = costRange(guests ?? DEFAULT_GUESTS);
  const parsedNumber = (s: string) => {
    const n = Number(s.replace(/[$,\s]/g, ""));
    return Number.isFinite(n) && n > 0 ? Math.round(n) : null;
  };

  function nextFromDate() {
    if (dateMode === "exact" && exact) setDate({ kind: "exact", value: exact });
    else if (dateMode === "season") setDate({ kind: "season", season, year });
    else setDate({ kind: "unknown" });
    setStep(1);
  }

  return (
    <div className="flex flex-col gap-6">
      <p className="text-sm text-text-muted">
        {step < 3 ? `Question ${step + 1} of 3` : "Your starting plan"}
      </p>

      {step === 0 ? (
        <section className="flex flex-col gap-4">
          <h1 className="font-display text-3xl">When&apos;s the wedding?</h1>
          <Choice selected={dateMode === "exact"} onClick={() => setDateMode("exact")}>We have a date</Choice>
          {dateMode === "exact" ? (
            <input type="date" min={today} value={exact} onChange={(e) => setExact(e.target.value)} className={input} aria-label="Wedding date" />
          ) : null}
          <Choice selected={dateMode === "season"} onClick={() => setDateMode("season")}>We know roughly</Choice>
          {dateMode === "season" ? (
            <div className="flex gap-3">
              <select value={season} onChange={(e) => setSeason(e.target.value as Season)} className={input} aria-label="Season">
                <option value="spring">Spring</option>
                <option value="summer">Summer</option>
                <option value="fall">Fall</option>
                <option value="winter">Winter</option>
              </select>
              <select value={year} onChange={(e) => setYear(Number(e.target.value))} className={input} aria-label="Year">
                {[0, 1, 2, 3].map((i) => (
                  <option key={i} value={thisYear + i}>{thisYear + i}</option>
                ))}
              </select>
            </div>
          ) : null}
          <Choice selected={dateMode === "unknown"} onClick={() => setDateMode("unknown")}>Not sure yet</Choice>
          <div className="flex gap-3">
            <button type="button" className={primary} disabled={!dateMode || (dateMode === "exact" && !exact)} onClick={nextFromDate}>
              Next
            </button>
          </div>
        </section>
      ) : null}

      {step === 1 ? (
        <section className="flex flex-col gap-4">
          <h1 className="font-display text-3xl">About how many guests?</h1>
          <input inputMode="numeric" placeholder="e.g. 120" value={guestsText} onChange={(e) => setGuestsText(e.target.value)} className={input} aria-label="Guest count" />
          <div className="flex flex-wrap gap-3">
            <button type="button" className={quiet} onClick={() => setStep(0)}>Back</button>
            <button type="button" className={primary} disabled={!parsedNumber(guestsText)} onClick={() => { setGuests(parsedNumber(guestsText)); setStep(2); }}>
              Next
            </button>
            <button type="button" className={quiet} onClick={() => { setGuests(null); setGuestsText(""); setStep(2); }}>
              Not sure yet
            </button>
          </div>
        </section>
      ) : null}

      {step === 2 ? (
        <section className="flex flex-col gap-4">
          <h1 className="font-display text-3xl">Do you have a budget in mind?</h1>
          <p className="text-text-muted">
            Weddings with {guests ?? `about ${DEFAULT_GUESTS}`} guests usually land between {formatMoney(range.low)} and {formatMoney(range.high)}.
          </p>
          <input inputMode="numeric" placeholder={`e.g. ${range.typical.toLocaleString("en-US")}`} value={budgetText} onChange={(e) => setBudgetText(e.target.value)} className={input} aria-label="Budget" />
          <div className="flex flex-wrap gap-3">
            <button type="button" className={quiet} onClick={() => setStep(1)}>Back</button>
            <button type="button" className={primary} disabled={!parsedNumber(budgetText)} onClick={() => { setBudget(parsedNumber(budgetText)); setStep(3); }}>
              See my plan
            </button>
            <button type="button" className={quiet} onClick={() => { setBudget(null); setBudgetText(""); setStep(3); }}>
              Not sure yet
            </button>
          </div>
        </section>
      ) : null}

      {step === 3 && plan ? (
        <section className="flex flex-col gap-6">
          <h1 className="font-display text-3xl">Here&apos;s a calm place to start</h1>
          <dl className="grid grid-cols-3 gap-3">
            {[
              { k: "Date", v: new Date(`${plan.date}T12:00:00Z`).toLocaleDateString("en-US", { month: "short", year: "numeric", timeZone: "UTC" }), est: plan.dateIsEstimate },
              { k: "Guests", v: String(plan.guests), est: plan.guestsIsEstimate },
              { k: "Budget", v: formatMoney(plan.budget), est: plan.budgetIsEstimate },
            ].map((x) => (
              <div key={x.k} className="rounded-md border border-border bg-surface p-3">
                <dt className="text-xs text-text-muted">{x.k}{x.est ? " (estimate)" : ""}</dt>
                <dd className="font-display text-xl">{x.v}</dd>
              </div>
            ))}
          </dl>

          <div>
            <h2 className="mb-2 font-medium">Where the money could go</h2>
            <ul className="divide-y divide-border rounded-md border border-border bg-surface">
              {[...plan.categories].sort((a, b) => b.planned - a.planned).slice(0, 5).map((c) => (
                <li key={c.key} className="flex justify-between px-4 py-2 text-sm">
                  <span>{c.name}</span>
                  <span className="text-text-muted">{formatMoney(c.planned)}</span>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h2 className="mb-2 font-medium">Your first three steps</h2>
            <ol className="list-decimal space-y-1 pl-5">
              {plan.firstSteps.map((t) => <li key={t.key}>{t.title}</li>)}
            </ol>
          </div>

          <p className="text-sm text-text-muted">Every number here is a starting point. You can change any of it later.</p>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            {signedIn ? (
              <button type="button" className={primary} onClick={() => router.push("/onboarding/save")}>Save my plan</button>
            ) : (
              <GoogleSignIn next="/onboarding/save" label="Save my plan with Google" disabled={!supabaseReady} />
            )}
            <button type="button" className={quiet} onClick={() => setStep(0)}>Change answers</button>
          </div>
          <p className="text-xs text-text-muted">
            Just looking? <Link href="/sample" className="underline">Explore a sample wedding</Link> first.
          </p>
        </section>
      ) : null}
    </div>
  );
}
