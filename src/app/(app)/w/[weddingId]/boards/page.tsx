import { MapPin, StickyNote } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { AddNote, RemoveItem } from "@/components/boards/board-forms";
import { Loading, PageTitle } from "@/components/shell/page-bits";
import { EmptyState } from "@/components/ui/status";
import { categoryName } from "@/lib/plan/templates";
import { createClient } from "@/lib/supabase/server";
import { loadWedding } from "@/lib/wedding";

export default function BoardsPage({ params, searchParams }: PageProps<"/w/[weddingId]/boards">) {
  return (
    <Suspense fallback={<Loading />}>
      <Boards params={params} searchParams={searchParams} />
    </Suspense>
  );
}

type Item = { id: string; kind: "photo" | "place" | "note"; title: string; image_url: string | null; credit: string | null; source_url: string | null; place_id: string | null; category_key: string | null; note: string | null };

async function Boards({ params, searchParams }: { params: Promise<{ weddingId: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { weddingId } = await params;
  const filter = String((await searchParams).cat ?? "");
  const ctx = await loadWedding(weddingId);
  const base = `/w/${weddingId}`;
  const supabase = await createClient();
  const { data } = await supabase.from("board_item").select("id,kind,title,image_url,credit,source_url,place_id,category_key,note").eq("wedding_id", weddingId).order("created_at", { ascending: false }).returns<Item[]>();
  const all = data ?? [];
  const cats = [...new Set(all.map((i) => i.category_key).filter((k): k is string => !!k))];
  const items = filter ? all.filter((i) => i.category_key === filter) : all;

  return (
    <>
      <div className="flex items-start justify-between gap-3">
        <PageTitle sub="Ideas, places and notes you've saved. Only the two of you see this.">Boards</PageTitle>
        {!ctx.readOnly && <AddNote weddingId={weddingId} />}
      </div>
      {cats.length > 1 && (
        <nav aria-label="Filter" className="-mx-4 mb-4 flex gap-2 overflow-x-auto px-4 pb-1">
          <Link href={`${base}/boards`} className={`chip chip-toggle shrink-0 ${!filter ? "chip-success" : ""}`}>Everything</Link>
          {cats.map((k) => <Link key={k} href={`${base}/boards?cat=${k}`} className={`chip chip-toggle shrink-0 ${filter === k ? "chip-success" : ""}`}>{categoryName(k)}</Link>)}
        </nav>
      )}
      {items.length === 0 ? (
        <EmptyState title="Nothing saved yet" action={<Link href={`${base}/explore/ideas`} className="btn btn-primary btn-sm">Browse ideas</Link>}>
          Tap the heart on an idea or a place in Explore and it lands here.
        </EmptyState>
      ) : (
        <ul className="columns-2 gap-3 sm:columns-3">
          {items.map((i) => (
            <li key={i.id} className="card relative mb-3 break-inside-avoid overflow-hidden">
              {i.kind === "photo" && i.image_url ? (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element -- hotlinked per Unsplash guidelines */}
                  <img src={i.image_url} alt={i.title} loading="lazy" className="block w-full" />
                  {i.credit && <a href={i.source_url ?? "#"} target="_blank" rel="noopener noreferrer" className="block px-3 py-2 text-[11px] text-text-muted">{i.credit}</a>}
                </>
              ) : (
                <div className="flex flex-col gap-1 p-4">
                  <span className="text-text-muted">{i.kind === "place" ? <MapPin size={16} /> : <StickyNote size={16} />}</span>
                  {i.kind === "place" && i.place_id ? (
                    <Link href={`${base}/explore/place/${encodeURIComponent(i.place_id)}`} className="font-medium hover:underline">{i.title}</Link>
                  ) : <p className="font-medium">{i.title}</p>}
                  {i.note && <p className="text-sm whitespace-pre-wrap text-text-muted">{i.note}</p>}
                  {i.category_key && <span className="chip chip-muted mt-1 self-start">{categoryName(i.category_key)}</span>}
                </div>
              )}
              {!ctx.readOnly && <div className="absolute top-2 right-2"><RemoveItem itemId={i.id} title={i.title} /></div>}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
