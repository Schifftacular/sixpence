import { ExternalLink } from "lucide-react";
import Link from "next/link";
import { SaveFromPlace } from "@/components/vendors/vendor-forms";
import { distanceText, project, SUBTYPE_LABEL, type Place } from "@/lib/explore/places";

export function PlaceList({ places, weddingId, saved, readOnly, numbered }: {
  places: Place[]; weddingId: string; saved: Map<string, string>; readOnly: boolean; numbered?: boolean;
}) {
  const base = `/w/${weddingId}`;
  return (
    <ol className="card divide-rows">
      {places.map((p, i) => (
        <li key={p.id} className="flex items-center gap-3 px-4 py-3">
          {numbered && <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary-soft text-xs font-medium text-primary" aria-hidden>{i + 1}</span>}
          <Link href={`${base}/explore/place/${encodeURIComponent(p.id)}`} className="min-w-0 flex-1">
            <span className="block truncate font-medium hover:underline">{p.name}</span>
            <span className="block truncate text-sm text-text-muted">
              {SUBTYPE_LABEL[p.subtype ?? ""] ?? p.subtype} · {distanceText(p.distance_km)}{p.locality ? ` · ${p.locality}` : ""}
            </span>
          </Link>
          {p.website && (
            <a href={p.website} target="_blank" rel="noopener noreferrer" className="hidden text-text-muted hover:text-primary sm:block" aria-label={`${p.name} website`}>
              <ExternalLink size={16} />
            </a>
          )}
          <SaveFromPlace weddingId={weddingId} placeId={p.id} categoryKey={p.category_key} saved={saved.has(p.id)} vendorId={saved.get(p.id)} readOnly={readOnly} />
        </li>
      ))}
    </ol>
  );
}

/** A simple distance plot: no map tiles, no tracking. You are the dot in the middle. */
export function PlaceMap({ places, home, homeLabel }: { places: Place[]; home: { lat: number; lng: number }; homeLabel: string }) {
  const size = 320;
  const { at, radiusKm } = project(places, home, size);
  const ringMi = [5, 10, 20, 40].filter((mi) => mi * 1.609 < radiusKm * 1.05);
  const scale = (size / 2 - 16) / radiusKm;
  return (
    <figure className="card card-pad">
      <svg viewBox={`0 0 ${size} ${size}`} className="mx-auto block w-full max-w-sm" role="img" aria-label={`${places.length} places plotted by distance from ${homeLabel}`}>
        {ringMi.map((mi) => (
          <g key={mi}>
            <circle cx={size / 2} cy={size / 2} r={mi * 1.609 * scale} fill="none" stroke="var(--border)" strokeDasharray="3 4" />
            <text x={size / 2 + 4} y={size / 2 - mi * 1.609 * scale - 3} fontSize="10" fill="var(--text-muted)">{mi} mi</text>
          </g>
        ))}
        {places.map((p, i) => {
          const { x, y } = at(p);
          return (
            <g key={p.id}>
              <title>{p.name}</title>
              <circle cx={x} cy={y} r={9} fill="var(--surface)" stroke="var(--primary)" strokeWidth="1.5" />
              <text x={x} y={y + 3.5} fontSize="9" textAnchor="middle" fill="var(--primary)">{i + 1}</text>
            </g>
          );
        })}
        <circle cx={size / 2} cy={size / 2} r={6} fill="var(--accent)" stroke="var(--surface)" strokeWidth="2" />
      </svg>
      <figcaption className="mt-2 text-center text-xs text-text-muted">The gold dot is {homeLabel}. Numbers match the list.</figcaption>
    </figure>
  );
}
