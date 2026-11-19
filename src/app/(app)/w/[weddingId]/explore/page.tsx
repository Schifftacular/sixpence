import { BookOpen, Building2, Lightbulb, Store, Wallet } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { NoLocation, SourceNote } from "@/components/explore/explore-bits";
import { PlaceList } from "@/components/explore/place-bits";
import { Loading, PageTitle } from "@/components/shell/page-bits";
import { GUIDES } from "@/lib/explore/guides";
import { placesNear, savedPlaces } from "@/lib/explore/load";
import { formatMoney } from "@/lib/money";
import { CATEGORIES, PRIORITY_CATEGORIES, type Priority } from "@/lib/plan/templates";
import { createClient } from "@/lib/supabase/server";
import { loadWedding } from "@/lib/wedding";

// Explore: discovery in one place, always tied to the couple's budget, date and location.
// No paid ranking, no sponsored results, no lead forms. Saving never contacts anyone.
export default function ExplorePage({ params }: PageProps<"/w/[weddingId]/explore">) {
  return (
    <Suspense fallback={<Loading />}>
      <Explore params={params} />
    </Suspense>
  );
}

const STAGE_GUIDE: Record<string, string> = { just_engaged: "first-month", venue_booked: "compare-caterer-quotes", some_vendors: "payment-schedules", final_stretch: "final-month" };

async function Explore({ params }: { params: Promise<{ weddingId: string }> }) {
  const { weddingId } = await params;
  const ctx = await loadWedding(weddingId);
  const base = `/w/${weddingId}`;
  const w = ctx.wedding;
  const supabase = await createClient();
  const { data: vendors } = await supabase.from("vendor").select("category_key,status").eq("wedding_id", weddingId);
  const covered = new Set((vendors ?? []).filter((v) => v.status === "booked").map((v) => v.category_key as string));

  // Picked for you: categories still open, your priorities first, then the usual booking order.
  const prio = (w.priorities ?? []).flatMap((p) => PRIORITY_CATEGORIES[p as Priority] ?? []);
  const order = [...new Set([...prio, ...CATEGORIES.map((c) => c.key)])].filter((k) => !["other", "favors", "rings", "officiant"].includes(k) && !covered.has(k));
  const picks = order.slice(0, 3);
  const [lists, saved] = w.lat != null && w.lng != null
    ? await Promise.all([Promise.all(picks.map((k) => placesNear({ lat: w.lat!, lng: w.lng!, category: k, kind: k === "venue" ? "venue" : "vendor", limit: 3 }))), savedPlaces(weddingId)])
    : [[], new Map<string, string>()];
  const guide = GUIDES.find((g) => g.slug === STAGE_GUIDE[w.planning_stage ?? ""]) ?? GUIDES[0];

  const context = [w.location_text, w.guest_estimate ? `${w.guest_estimate} guests` : null, ctx.money ? `${formatMoney(ctx.money.stillFlexible)} still flexible` : null].filter(Boolean).join(" · ");
  const SECTIONS = [
    { href: `${base}/explore/venues`, icon: Building2, title: "Venues", what: covered.has("venue") ? "Booked. Browse for a rehearsal dinner or after-party." : "Places near you that host weddings." },
    { href: `${base}/explore/vendors`, icon: Store, title: "Vendors near you", what: "Every category, as a list or a map, closest first." },
    { href: `${base}/explore/cost`, icon: Wallet, title: "What things cost", what: "What weddings your size usually spend, by category." },
    { href: `${base}/explore/ideas`, icon: Lightbulb, title: "Ideas", what: "Inspiration by style, with a sense of what it costs." },
    { href: `${base}/explore/guides`, icon: BookOpen, title: "Guides", what: "Short how-tos for each stage." },
  ];

  return (
    <>
      <PageTitle sub={context || "Find venues, vendors and ideas that fit your budget."}>Explore</PageTitle>
      <ul className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-5">
        {SECTIONS.map((s, i) => (
          <li key={s.title} className={i === SECTIONS.length - 1 ? "col-span-2 sm:col-span-1" : undefined}>
            <Link href={s.href} className="card card-pad card-link flex h-full flex-col gap-1">
              <s.icon size={20} className="text-primary" strokeWidth={1.75} aria-hidden />
              <span className="font-medium">{s.title}</span>
              <span className="text-xs text-text-muted">{s.what}</span>
            </Link>
          </li>
        ))}
      </ul>

      <h2 className="h-section mb-1">Picked for you</h2>
      <p className="mb-3 text-sm text-text-muted">What you haven&apos;t booked yet{prio.length ? ", what you said matters most first" : ""}. Closest first.</p>
      {w.lat == null || w.lng == null ? <NoLocation weddingId={weddingId} /> : (
        <div className="flex flex-col gap-5">
          {picks.map((k, i) => {
            const c = CATEGORIES.find((x) => x.key === k)!;
            const list = lists[i] ?? [];
            const more = k === "venue" ? `${base}/explore/venues` : `${base}/explore/vendors?cat=${k}`;
            return (
              <section key={k}>
                <div className="mb-2 flex items-baseline justify-between">
                  <h3 className="font-medium">{c.name}</h3>
                  <Link href={more} className="text-sm text-primary hover:underline">See all</Link>
                </div>
                {list.length ? <PlaceList places={list} weddingId={weddingId} saved={saved} readOnly={ctx.readOnly} /> : <p className="text-sm text-text-muted">No public listings nearby yet.</p>}
              </section>
            );
          })}
        </div>
      )}

      <Link href={`${base}/explore/guides/${guide.slug}`} className="card card-pad card-link mt-8 flex flex-col gap-1">
        <span className="eyebrow">A guide for where you are</span>
        <span className="font-medium">{guide.title}</span>
        <span className="text-sm text-text-muted">{guide.summary}</span>
      </Link>
      <SourceNote />
    </>
  );
}
