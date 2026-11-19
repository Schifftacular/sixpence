import { Phone } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { DraftDay, EventSheet, PrintButton } from "@/components/plan/day-forms";
import { Loading } from "@/components/shell/page-bits";
import { EmptyState } from "@/components/ui/status";
import { countdown, longDate } from "@/lib/dates";
import { timeLabel } from "@/lib/plan/day";
import { categoryName } from "@/lib/plan/templates";
import { createClient } from "@/lib/supabase/server";
import { todayIso } from "@/lib/today";
import { loadWedding } from "@/lib/wedding";

export default function DayPage({ params }: PageProps<"/w/[weddingId]/plan/day">) {
  return (
    <Suspense fallback={<Loading />}>
      <Day params={params} />
    </Suspense>
  );
}

async function Day({ params }: { params: Promise<{ weddingId: string }> }) {
  const { weddingId } = await params;
  const ctx = await loadWedding(weddingId);
  const base = `/w/${weddingId}`;
  const supabase = await createClient();
  const [{ data: events }, { data: vendors }] = await Promise.all([
    supabase.from("timeline_event").select("id,starts_at,ends_at,title,location,owner").eq("wedding_id", weddingId).order("starts_at").order("sort"),
    supabase.from("vendor").select("id,name,category_key,phone,arrival_time,onsite_contact").eq("wedding_id", weddingId).eq("status", "booked").order("arrival_time", { nullsFirst: false }),
  ]);
  const ev = events ?? [];
  const w = ctx.wedding;

  return (
    <>
      <Link href={`${base}/plan`} className="btn btn-quiet -ml-2 mb-2 print:hidden">← Plan</Link>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h1 className="h-page">The day</h1>
          <p className="text-text-muted">{w.date ? `${longDate(w.date)} · ${countdown(w.date, todayIso())}` : "Date not set yet"}{w.location_text ? ` · ${w.location_text}` : ""}</p>
        </div>
        <PrintButton />
      </div>

      {ev.length === 0 ? (
        <EmptyState title="No timeline yet" action={!ctx.readOnly ? <DraftDay weddingId={weddingId} ceremonyTime={w.ceremony_time} hasEvents={false} /> : null}>
          Start from a typical day built around your ceremony time, then make it yours.
        </EmptyState>
      ) : (
        <ol className="relative mb-4 ml-2 border-l-2 border-border">
          {ev.map((e) => (
            <li key={e.id} className="relative mb-1 flex items-start gap-3 py-2 pl-5">
              <span className={`absolute top-3.5 -left-[7px] size-3 rounded-full border-2 border-surface ${e.title === "Ceremony" ? "bg-accent" : "bg-primary"}`} aria-hidden />
              <span className="money w-20 shrink-0 pt-0.5 text-sm font-medium">{timeLabel(e.starts_at)}</span>
              <span className="min-w-0 flex-1">
                <span className={`block ${e.title === "Ceremony" ? "font-display text-lg" : "font-medium"}`}>{e.title}</span>
                <span className="block text-sm text-text-muted">{[e.ends_at ? `until ${timeLabel(e.ends_at)}` : null, e.location, e.owner].filter(Boolean).join(" · ")}</span>
              </span>
              {!ctx.readOnly && <span className="print:hidden"><EventSheet weddingId={weddingId} ev={e} /></span>}
            </li>
          ))}
        </ol>
      )}
      {!ctx.readOnly && ev.length > 0 && (
        <div className="mb-8 flex flex-wrap gap-2 print:hidden">
          <EventSheet weddingId={weddingId} />
          <DraftDay weddingId={weddingId} ceremonyTime={w.ceremony_time} hasEvents />
        </div>
      )}

      <section>
        <h2 className="h-section mb-2">Who to call on the day</h2>
        {(vendors ?? []).length === 0 ? <p className="text-sm text-text-muted">Booked vendors show up here with their arrival time and day-of contact.</p> : (
          <ul className="card divide-rows">
            {(vendors ?? []).map((v) => (
              <li key={v.id} className="flex items-center gap-3 px-4 py-3 text-sm">
                <span className="min-w-0 flex-1">
                  <Link href={`${base}/vendors/${v.id}`} className="block font-medium hover:underline">{v.name}</Link>
                  <span className="block text-text-muted">{categoryName(v.category_key)}{v.arrival_time ? ` · arrives ${timeLabel(v.arrival_time)}` : ""}{v.onsite_contact ? ` · ${v.onsite_contact}` : ""}</span>
                </span>
                {v.phone && <a className="btn btn-quiet btn-sm" href={`tel:${v.phone.replace(/[^\d+]/g, "")}`}><Phone size={14} /> {v.phone}</a>}
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
