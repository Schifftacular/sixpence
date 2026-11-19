import { ChevronRight, Download } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { PasteList, QuickAdd, RsvpSettings } from "@/components/guests/guest-forms";
import { Loading, PageTitle } from "@/components/shell/page-bits";
import { EmptyState } from "@/components/ui/status";
import { shortDate } from "@/lib/dates";
import { rsvpCounts } from "@/lib/guests/parse";
import { formatMoney } from "@/lib/money";
import { createClient } from "@/lib/supabase/server";
import { loadWedding } from "@/lib/wedding";

export default function GuestsPage({ params, searchParams }: PageProps<"/w/[weddingId]/guests">) {
  return (
    <Suspense fallback={<Loading />}>
      <Guests params={params} searchParams={searchParams} />
    </Suspense>
  );
}

type Guest = { id: string; first_name: string; last_name: string | null; is_child: boolean; is_plus_one: boolean; attending: boolean | null };
type Household = { id: string; name: string; side: string | null; group_name: string | null; responded_at: string | null; plus_one_allowed: boolean; guest: Guest[] };
const SHOW = { all: "Everyone", waiting: "Waiting", yes: "Coming", no: "Can't come" } as const;

async function Guests({ params, searchParams }: { params: Promise<{ weddingId: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { weddingId } = await params;
  const sp = await searchParams;
  const ctx = await loadWedding(weddingId);
  const base = `/w/${weddingId}`;
  const w = ctx.wedding;
  const show = (Object.keys(SHOW) as (keyof typeof SHOW)[]).find((k) => k === sp.show) ?? "all";
  const side = typeof sp.side === "string" ? sp.side : "";
  const q = typeof sp.q === "string" ? sp.q.trim().toLowerCase() : "";
  const supabase = await createClient();
  const [{ data }, { data: cats }] = await Promise.all([
    supabase.from("household").select("id,name,side,group_name,responded_at,plus_one_allowed,guest(id,first_name,last_name,is_child,is_plus_one,attending)")
      .eq("wedding_id", weddingId).order("name").returns<Household[]>(),
    ctx.money ? supabase.from("budget_category").select("target_amount,per_guest").eq("wedding_id", weddingId).eq("per_guest", true) : Promise.resolve({ data: [] }),
  ]);
  const all = data ?? [];
  const counts = rsvpCounts(all.map((h) => ({ responded_at: h.responded_at, guests: h.guest })));
  const sides = [...new Set([...w.name.split(/\s*&\s*|\s+and\s+/).map((s) => s.trim()).filter((s) => s && s.length < 30), ...all.map((h) => h.side).filter((s): s is string => !!s)])].slice(0, 4);
  const estimate = w.guest_estimate ?? 0;
  const perGuest = estimate > 0 ? (cats ?? []).reduce((a, c) => a + Number(c.target_amount), 0) / estimate : 0;

  const matches = (h: Household) => {
    if (side && h.side !== side) return false;
    if (q && !h.name.toLowerCase().includes(q) && !h.guest.some((g) => `${g.first_name} ${g.last_name ?? ""}`.toLowerCase().includes(q))) return false;
    if (show === "waiting") return h.guest.some((g) => g.attending == null);
    if (show === "yes") return h.guest.some((g) => g.attending === true);
    if (show === "no") return h.guest.some((g) => g.attending === false);
    return true;
  };
  const list = all.filter(matches);
  const href = (o: Record<string, string>) => {
    const u = new URLSearchParams({ ...(show !== "all" ? { show } : {}), ...(side ? { side } : {}), ...(q ? { q } : {}), ...o });
    for (const [k, v] of [...u]) if (!v || (k === "show" && v === "all")) u.delete(k);
    const s = u.toString();
    return `${base}/guests${s ? `?${s}` : ""}`;
  };
  const outboundOn = process.env.APP_ENV === "production" && w.outbound_enabled;

  return (
    <>
      <div className="flex items-start justify-between gap-3">
        <PageTitle sub={`${counts.guests} people in ${counts.households} households${estimate && counts.guests !== estimate ? ` · your budget plans for ${estimate}` : ""}`}>Guests</PageTitle>
        <a href={`${base}/guests/export`} className="btn btn-quiet btn-sm" download><Download size={16} /> CSV</a>
      </div>

      <section className="mb-5 grid grid-cols-3 gap-3 text-center">
        <div className="card card-pad"><span className="block text-2xl font-semibold">{counts.yes}</span><span className="text-xs text-text-muted">coming</span></div>
        <div className="card card-pad"><span className="block text-2xl font-semibold">{counts.waiting}</span><span className="text-xs text-text-muted">still thinking</span></div>
        <div className="card card-pad"><span className="block text-2xl font-semibold">{counts.no}</span><span className="text-xs text-text-muted">can&apos;t come</span></div>
      </section>
      {perGuest > 0 && (
        <p className="mb-5 text-sm text-text-muted">
          Each guest adds about <span className="money font-medium text-text">{formatMoney(Math.round(perGuest))}</span> (food, cake, rentals and so on).{" "}
          <Link href={`${base}/budget/what-if${counts.guests ? `?guests=${counts.guests}` : ""}`} className="text-primary hover:underline">See the what-if</Link>
        </p>
      )}

      {!ctx.readOnly && (
        <>
          <QuickAdd weddingId={weddingId} sides={sides} />
          <div className="mb-5 flex flex-wrap gap-2">
            <PasteList weddingId={weddingId} />
            <RsvpSettings weddingId={weddingId} deadline={w.rsvp_deadline} meals={w.meal_options ?? []} />
          </div>
        </>
      )}

      <section className="card card-pad mb-6 text-sm">
        <p className="font-medium">RSVP links {outboundOn ? "are on" : "are off"}</p>
        <p className="text-text-muted">
          {outboundOn ? "Each household has its own private link." : "Guests can't reply online yet, so nothing goes out by accident. You can still record RSVPs you hear about."}
          {w.rsvp_deadline ? ` Replies due ${shortDate(w.rsvp_deadline)}.` : ""}
        </p>
        <Link href={`${base}/guests/rsvp-preview`} className="mt-1 inline-block text-primary hover:underline">Preview what guests will see</Link>
      </section>

      <form className="mb-3" action={`${base}/guests`}>
        {show !== "all" && <input type="hidden" name="show" value={show} />}
        {side && <input type="hidden" name="side" value={side} />}
        <input className="input" type="search" name="q" defaultValue={q} placeholder="Find a name" aria-label="Find a name" />
      </form>
      <nav aria-label="Filter" className="-mx-4 mb-4 flex gap-2 overflow-x-auto px-4 pb-1">
        {(Object.keys(SHOW) as (keyof typeof SHOW)[]).map((k) => <Link key={k} href={href({ show: k })} className={`chip chip-toggle shrink-0 ${show === k ? "chip-success" : ""}`}>{SHOW[k]}</Link>)}
        {sides.map((s) => <Link key={s} href={href({ side: side === s ? "" : s })} className={`chip chip-toggle shrink-0 ${side === s ? "chip-success" : ""}`}>{s}&apos;s side</Link>)}
      </nav>

      {all.length === 0 ? (
        <EmptyState title="No guests yet">Type a household above, like Ana &amp; Luis Pérez, or paste your whole list.</EmptyState>
      ) : list.length === 0 ? (
        <p className="text-sm text-text-muted">Nobody matches. <Link href={`${base}/guests`} className="text-primary hover:underline">Show everyone</Link></p>
      ) : (
        <ul className="card divide-rows">
          {list.map((h) => {
            const yes = h.guest.filter((g) => g.attending === true).length;
            const wait = h.guest.filter((g) => g.attending == null).length;
            const status = wait === h.guest.length ? "Waiting" : yes === 0 ? "Can't come" : yes === h.guest.length ? "Coming" : `${yes} of ${h.guest.length} coming`;
            return (
              <li key={h.id}>
                <Link href={`${base}/guests/${h.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-primary-soft/50">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{h.name}</span>
                    <span className="block truncate text-sm text-text-muted">
                      {h.guest.map((g) => (g.is_plus_one ? "guest" : g.first_name) + (g.is_child ? " (child)" : "")).join(", ")}
                      {h.group_name ? ` · ${h.group_name}` : ""}
                    </span>
                  </span>
                  <span className={`chip ${status === "Coming" ? "chip-success" : status === "Waiting" ? "" : "chip-muted"}`}>{status}</span>
                  <ChevronRight size={16} className="text-text-muted" aria-hidden />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
