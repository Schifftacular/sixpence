import { ExternalLink, MapPin, Phone } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { SaveToBoard } from "@/components/boards/board-forms";
import { Back, SourceNote } from "@/components/explore/explore-bits";
import { PlaceList } from "@/components/explore/place-bits";
import { Loading } from "@/components/shell/page-bits";
import { SaveFromPlace } from "@/components/vendors/vendor-forms";
import { placesNear, savedPlaces } from "@/lib/explore/load";
import { distanceText, mapsLink, SUBTYPE_LABEL } from "@/lib/explore/places";
import { formatMoney } from "@/lib/money";
import { categoryName } from "@/lib/plan/templates";
import { createClient } from "@/lib/supabase/server";
import { loadWedding } from "@/lib/wedding";

export default function PlacePage({ params }: PageProps<"/w/[weddingId]/explore/place/[placeId]">) {
  return (
    <Suspense fallback={<Loading />}>
      <PlaceDetail params={params} />
    </Suspense>
  );
}

async function PlaceDetail({ params }: { params: Promise<{ weddingId: string; placeId: string }> }) {
  const { weddingId, placeId: raw } = await params;
  const placeId = decodeURIComponent(raw);
  const ctx = await loadWedding(weddingId);
  const base = `/w/${weddingId}`;
  const supabase = await createClient();
  const { data: p } = await supabase.from("place").select("id,kind,category_key,subtype,name,lat,lng,address,locality,region,postcode,website,phone,license,fetched_at,site_mentions_weddings,site_capacity,site_price_from").eq("id", placeId).maybeSingle();
  if (!p) notFound();
  const [nearby, saved] = await Promise.all([
    placesNear({ lat: p.lat, lng: p.lng, category: p.category_key, kind: p.kind, radiusKm: 25, limit: 6 }),
    savedPlaces(weddingId),
  ]);
  const similar = nearby.filter((x) => x.id !== p.id).slice(0, 5);
  const fromWedding = ctx.wedding.lat != null && ctx.wedding.lng != null
    ? 6371 * 2 * Math.asin(Math.sqrt(Math.sin(((p.lat - ctx.wedding.lat) * Math.PI) / 360) ** 2 + Math.cos((ctx.wedding.lat * Math.PI) / 180) * Math.cos((p.lat * Math.PI) / 180) * Math.sin(((p.lng - ctx.wedding.lng) * Math.PI) / 360) ** 2))
    : null;
  const back = p.kind === "venue" ? `${base}/explore/venues` : `${base}/explore/vendors?cat=${p.category_key}`;
  const addr = p.address ? [p.address, p.locality, p.region?.replace(/^US-/, ""), p.postcode].filter(Boolean).join(", ") : [p.locality, p.region?.replace(/^US-/, "")].filter(Boolean).join(", ");

  return (
    <>
      <Back href={back} label={p.kind === "venue" ? "Venues" : categoryName(p.category_key)} />
      <h1 className="h-page">{p.name}</h1>
      <p className="mb-4 text-text-muted">
        {SUBTYPE_LABEL[p.subtype ?? ""] ?? p.subtype}{fromWedding != null ? ` · ${distanceText(fromWedding)} from ${ctx.wedding.location_text ?? "your wedding"}` : ""}
      </p>
      <div className="mb-5 flex flex-wrap gap-2">
        <SaveFromPlace weddingId={weddingId} placeId={p.id} categoryKey={p.category_key} saved={saved.has(p.id)} vendorId={saved.get(p.id)} readOnly={ctx.readOnly} />
        {!ctx.readOnly && <SaveToBoard weddingId={weddingId} item={{ kind: "place", title: p.name, placeId: p.id, categoryKey: p.category_key }} />}
      </div>

      <section className="card card-pad mb-5 flex flex-col gap-3 text-sm">
        {addr && <p className="flex items-start gap-2"><MapPin size={16} className="mt-0.5 shrink-0 text-text-muted" /> {addr}</p>}
        {p.phone && <p className="flex items-center gap-2"><Phone size={16} className="text-text-muted" /> <a className="underline" href={`tel:${p.phone.replace(/[^\d+]/g, "")}`}>{p.phone}</a></p>}
        {p.website && <p className="flex items-center gap-2"><ExternalLink size={16} className="text-text-muted" /> <a className="break-all underline" href={p.website} target="_blank" rel="noopener noreferrer">{p.website.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "")}</a></p>}
        {(p.site_capacity || p.site_price_from) && (
          <p className="text-text-muted">From their website: {p.site_capacity ? `up to ${p.site_capacity} guests` : ""}{p.site_capacity && p.site_price_from ? ", " : ""}{p.site_price_from ? `prices from ${formatMoney(Number(p.site_price_from))}` : ""}.</p>
        )}
        <a className="btn btn-secondary btn-sm self-start" href={mapsLink(p.name, addr)} target="_blank" rel="noopener noreferrer">Photos and reviews on Google Maps</a>
      </section>

      <section className="mb-5 text-sm text-text-muted">
        <h2 className="h-section mb-1 text-text">Before you reach out</h2>
        <ul className="list-disc pl-5">
          <li>Ask if your date is open{ctx.wedding.guest_estimate ? ` for about ${ctx.wedding.guest_estimate} guests` : ""}.</li>
          <li>Ask for a full price with everything included, not just a starting price.</li>
          <li>Save them first, then use Email or Call on their page. We draft the message, you send it.</li>
        </ul>
      </section>

      {similar.length > 0 && (
        <section>
          <h2 className="h-section mb-2">Similar nearby</h2>
          <PlaceList places={similar} weddingId={weddingId} saved={saved} readOnly={ctx.readOnly} />
          <p className="mt-2 text-xs text-text-muted">Distances here are from {p.name}.</p>
        </section>
      )}
      <p className="mt-6 text-sm"><Link className="text-primary hover:underline" href={back}>See all</Link></p>
      <SourceNote />
    </>
  );
}
