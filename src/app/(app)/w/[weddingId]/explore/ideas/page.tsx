import Link from "next/link";
import { Suspense } from "react";
import { SaveToBoard } from "@/components/boards/board-forms";
import { Back } from "@/components/explore/explore-bits";
import { Loading } from "@/components/shell/page-bits";
import { COST_WORD, searchPhotos, STYLES } from "@/lib/explore/ideas";
import { categoryName } from "@/lib/plan/templates";
import { loadWedding } from "@/lib/wedding";

export default function IdeasPage({ params, searchParams }: PageProps<"/w/[weddingId]/explore/ideas">) {
  return (
    <Suspense fallback={<Loading />}>
      <Ideas params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function Ideas({ params, searchParams }: { params: Promise<{ weddingId: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { weddingId } = await params;
  const sp = await searchParams;
  const ctx = await loadWedding(weddingId);
  const base = `/w/${weddingId}`;
  const mine = ctx.wedding.style_tags ?? [];
  const style = STYLES.find((s) => s.key === sp.style) ?? STYLES.find((s) => mine.includes(s.key)) ?? STYLES[0];
  const photos = await searchPhotos(style.query);

  return (
    <>
      <Back href={`${base}/explore`} />
      <h1 className="h-page mb-1">Ideas</h1>
      <p className="mb-4 text-text-muted">Inspiration with a sense of what it costs. Save what you love to your board.</p>
      <nav aria-label="Style" className="-mx-4 mb-5 flex gap-2 overflow-x-auto px-4 pb-1">
        {STYLES.map((s) => (
          <Link key={s.key} href={`${base}/explore/ideas?style=${s.key}`} className={`chip chip-toggle shrink-0 ${s.key === style.key ? "chip-success" : ""}`} aria-current={s.key === style.key ? "page" : undefined}>{s.name}</Link>
        ))}
      </nav>

      <section className="mb-6">
        <h2 className="h-section mb-2">{style.name} ideas that fit a budget</h2>
        <ul className="grid gap-3 sm:grid-cols-3">
          {style.ideas.map((i) => (
            <li key={i.title} className="card card-pad flex flex-col gap-2">
              <p className="font-medium">{i.title}</p>
              <p className="text-sm text-text-muted">{i.note}</p>
              <p className="mt-auto flex items-center justify-between gap-2 text-xs">
                <span className={i.cost === "saves" ? "text-success" : i.cost === "adds" ? "text-accent-text" : "text-text-muted"}>{COST_WORD[i.cost]} · {categoryName(i.category)}</span>
                {!ctx.readOnly && <SaveToBoard weddingId={weddingId} compact item={{ kind: "note", title: i.title, categoryKey: i.category }} />}
              </p>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="h-section mb-2">Photos</h2>
        {photos === null ? (
          <p className="card card-pad text-sm text-text-muted">Photo ideas appear here once a free Unsplash key is added to this app. Until then, the ideas above and your own notes work the same way.</p>
        ) : photos.length === 0 ? (
          <p className="text-sm text-text-muted">No photos came back just now. Try another style.</p>
        ) : (
          <ul className="columns-2 gap-3 sm:columns-3">
            {photos.map((ph) => (
              <li key={ph.id} className="relative mb-3 break-inside-avoid overflow-hidden rounded-[var(--radius-md)]">
                {/* eslint-disable-next-line @next/next/no-img-element -- hotlinked per Unsplash guidelines */}
                <img src={ph.thumb} alt={ph.alt} loading="lazy" className="block w-full" />
                <div className="absolute top-2 right-2">{!ctx.readOnly && <SaveToBoard weddingId={weddingId} compact item={{ kind: "photo", title: ph.alt, imageUrl: ph.thumb, credit: ph.credit, sourceUrl: ph.pageUrl }} />}</div>
                <a href={ph.creditUrl} target="_blank" rel="noopener noreferrer" className="absolute right-0 bottom-0 left-0 bg-gradient-to-t from-black/60 px-2 py-1 text-[11px] text-white">{ph.credit}</a>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
