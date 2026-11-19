import Link from "next/link";
import { Suspense } from "react";
import { Back, NoLocation, SourceNote } from "@/components/explore/explore-bits";
import { PlaceList, PlaceMap } from "@/components/explore/place-bits";
import { Loading } from "@/components/shell/page-bits";
import { EmptyState } from "@/components/ui/status";
import { placesNear, savedPlaces } from "@/lib/explore/load";
import { VENUE_TYPES } from "@/lib/explore/places";
import { formatMoney } from "@/lib/money";
import { createClient } from "@/lib/supabase/server";
import { loadWedding } from "@/lib/wedding";

export default function VenuesPage({ params, searchParams }: PageProps<"/w/[weddingId]/explore/venues">) {
  return (
    <Suspense fallback={<Loading />}>
      <Venues params={params} searchParams={searchParams} />
    </Suspense>
  );
}

const RADII = [10, 25, 50];

async function Venues({ params, searchParams }: { params: Promise<{ weddingId: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { weddingId } = await params;
  const sp = await searchParams;
  const ctx = await loadWedding(weddingId);
  const base = `/w/${weddingId}`;
  const type = VENUE_TYPES.find((t) => t.key === sp.type) ?? null;
  const miles = RADII.includes(Number(sp.mi)) ? Number(sp.mi) : 25;
  const view = sp.view === "map" ? "map" : "list";
  const q = (o: { type?: string | null; mi?: number; view?: string }) => {
    const u = new URLSearchParams();
    const t = o.type === undefined ? type?.key : o.type;
    if (t) u.set("type", t);
    const m = o.mi ?? miles; if (m !== 25) u.set("mi", String(m));
    const v = o.view ?? view; if (v === "map") u.set("view", "map");
    const s = u.toString();
    return `${base}/explore/venues${s ? `?${s}` : ""}`;
  };
  const { lat, lng } = ctx.wedding;
  const booked = (ctx.byCategory.venue?.committed ?? 0) > 0;
  let venuePlan = 0;
  if (ctx.money) {
    const { data } = await (await createClient()).from("budget_category").select("target_amount").eq("wedding_id", weddingId).eq("key", "venue").maybeSingle();
    venuePlan = Number(data?.target_amount ?? 0);
  }

  let body: React.ReactNode;
  if (lat == null || lng == null) body = <NoLocation weddingId={weddingId} />;
  else {
    const [all, saved] = await Promise.all([placesNear({ lat, lng, kind: "venue", radiusKm: miles * 1.609, limit: 200 }), savedPlaces(weddingId)]);
    const places = (type ? all.filter((p) => type.subtypes.includes(p.subtype ?? "")) : all)
      // Places that say they host weddings come first within the same distance band; never paid.
      .sort((a, b) => Number(!!b.site_mentions_weddings) - Number(!!a.site_mentions_weddings) || a.distance_km - b.distance_km)
      .slice(0, 50);
    body = places.length === 0 ? <EmptyState title="Nothing matches yet">Try a wider distance or another kind of place.</EmptyState> : (
      <div className={view === "map" ? "grid gap-4 md:grid-cols-2" : ""}>
        {view === "map" && <PlaceMap places={places.slice(0, 20)} home={{ lat, lng }} homeLabel={ctx.wedding.location_text ?? "your wedding"} />}
        <PlaceList places={view === "map" ? places.slice(0, 20) : places} weddingId={weddingId} saved={saved} readOnly={ctx.readOnly} numbered={view === "map"} />
      </div>
    );
  }

  return (
    <>
      <Back href={`${base}/explore`} />
      <h1 className="h-page mb-1">Venues</h1>
      <p className="mb-4 text-text-muted">
        {booked ? <>You&apos;ve booked your venue. Still looking for a rehearsal dinner or after-party spot? These are near you.</> :
          venuePlan > 0 ? <>Places near you that may host weddings. Your venue plan is <span className="money">{formatMoney(venuePlan)}</span>; ask each for their price.</> : "Places near you that may host weddings."}
      </p>
      <nav aria-label="Kind of place" className="-mx-4 mb-3 flex gap-2 overflow-x-auto px-4 pb-1">
        <Link href={q({ type: null })} className={`chip chip-toggle shrink-0 ${!type ? "chip-success" : ""}`}>All kinds</Link>
        {VENUE_TYPES.map((t) => <Link key={t.key} href={q({ type: t.key })} className={`chip chip-toggle shrink-0 ${type?.key === t.key ? "chip-success" : ""}`}>{t.label}</Link>)}
      </nav>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="text-sm text-text-muted">Within</span>
        {RADII.map((m) => <Link key={m} href={q({ mi: m })} className={`chip chip-toggle ${m === miles ? "chip-success" : ""}`}>{m} mi</Link>)}
        <span className="ml-auto flex gap-2">
          <Link href={q({ view: "list" })} className={`btn btn-sm ${view === "list" ? "btn-secondary" : "btn-quiet"}`}>List</Link>
          <Link href={q({ view: "map" })} className={`btn btn-sm ${view === "map" ? "btn-secondary" : "btn-quiet"}`}>Map</Link>
        </span>
      </div>
      {body}
      <SourceNote />
    </>
  );
}
