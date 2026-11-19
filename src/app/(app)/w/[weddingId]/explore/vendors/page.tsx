import Link from "next/link";
import { Suspense } from "react";
import { Back, NoLocation, SourceNote } from "@/components/explore/explore-bits";
import { PlaceList, PlaceMap } from "@/components/explore/place-bits";
import { Loading } from "@/components/shell/page-bits";
import { EmptyState } from "@/components/ui/status";
import { placesNear, savedPlaces } from "@/lib/explore/load";
import { formatMoney } from "@/lib/money";
import { categoryBenchmark } from "@/lib/plan/benchmarks";
import { CATEGORIES } from "@/lib/plan/templates";
import { createClient } from "@/lib/supabase/server";
import { loadWedding } from "@/lib/wedding";

export default function ExploreVendorsPage({ params, searchParams }: PageProps<"/w/[weddingId]/explore/vendors">) {
  return (
    <Suspense fallback={<Loading />}>
      <ExploreVendors params={params} searchParams={searchParams} />
    </Suspense>
  );
}

const VENDOR_CATS = CATEGORIES.filter((c) => !["venue", "other", "favors"].includes(c.key));

async function ExploreVendors({ params, searchParams }: { params: Promise<{ weddingId: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { weddingId } = await params;
  const sp = await searchParams;
  const ctx = await loadWedding(weddingId);
  const base = `/w/${weddingId}`;
  const cat = VENDOR_CATS.find((c) => c.key === sp.cat) ?? VENDOR_CATS.find((c) => !ctx.byCategory[c.key]?.committed) ?? VENDOR_CATS[0];
  const view = sp.view === "map" ? "map" : "list";
  const { lat, lng } = ctx.wedding;
  const href = (k: string, v = view) => `${base}/explore/vendors?cat=${k}${v === "map" ? "&view=map" : ""}`;

  let body: React.ReactNode;
  if (lat == null || lng == null) body = <NoLocation weddingId={weddingId} />;
  else {
    const [places, saved] = await Promise.all([placesNear({ lat, lng, category: cat.key, kind: "vendor", limit: 40 }), savedPlaces(weddingId)]);
    if (places.length === 0) body = <EmptyState title={`No ${cat.vendorNoun}s listed near you yet`}>Public listings are thin for some categories. You can still add one you know in <Link className="underline" href={`${base}/vendors/category/${cat.key}`}>Your vendors</Link>.</EmptyState>;
    else body = (
      <div className={view === "map" ? "grid gap-4 md:grid-cols-2" : ""}>
        {view === "map" && <PlaceMap places={places.slice(0, 20)} home={{ lat, lng }} homeLabel={ctx.wedding.location_text ?? "your wedding"} />}
        <PlaceList places={view === "map" ? places.slice(0, 20) : places} weddingId={weddingId} saved={saved} readOnly={ctx.readOnly} numbered={view === "map"} />
      </div>
    );
  }

  // Budget fit: the couple's plan next to the typical range for their size.
  let fit: React.ReactNode = null;
  if (ctx.money) {
    const supabase = await createClient();
    const { data: bc } = await supabase.from("budget_category").select("target_amount").eq("wedding_id", weddingId).eq("key", cat.key).maybeSingle();
    const b = categoryBenchmark(cat.key, ctx.wedding.guest_estimate ?? 100);
    const committed = ctx.byCategory[cat.key]?.committed ?? 0;
    fit = (
      <p className="card card-pad mb-4 text-sm">
        {committed > 0 ? <>You&apos;ve already booked {cat.name.toLowerCase()} for <span className="money">{formatMoney(committed)}</span>. </> : null}
        Your plan: <strong className="money">{formatMoney(Number(bc?.target_amount ?? 0))}</strong>
        {b ? <> · typical for your size <span className="money">{formatMoney(b.low)}–{formatMoney(b.high)}</span></> : null}.{" "}
        <Link href={`${base}/explore/cost`} className="text-primary hover:underline">What things cost</Link>
      </p>
    );
  }

  return (
    <>
      <Back href={`${base}/explore`} />
      <h1 className="h-page mb-1">Vendors near you</h1>
      <p className="mb-4 text-text-muted">{ctx.wedding.location_text ? `Around ${ctx.wedding.location_text}, closest first.` : "Closest first."}</p>
      <nav aria-label="Category" className="-mx-4 mb-4 flex gap-2 overflow-x-auto px-4 pb-1">
        {VENDOR_CATS.map((c) => (
          <Link key={c.key} href={href(c.key)} className={`chip chip-toggle shrink-0 ${c.key === cat.key ? "chip-success" : ""}`} aria-current={c.key === cat.key ? "page" : undefined}>
            {c.name}{ctx.byCategory[c.key]?.committed ? " ✓" : ""}
          </Link>
        ))}
      </nav>
      {fit}
      <div className="mb-3 flex gap-2" role="group" aria-label="View">
        <Link href={href(cat.key, "list")} className={`btn btn-sm ${view === "list" ? "btn-secondary" : "btn-quiet"}`} aria-current={view === "list" ? "page" : undefined}>List</Link>
        <Link href={href(cat.key, "map")} className={`btn btn-sm ${view === "map" ? "btn-secondary" : "btn-quiet"}`} aria-current={view === "map" ? "page" : undefined}>Map</Link>
      </div>
      {body}
      <SourceNote />
    </>
  );
}
