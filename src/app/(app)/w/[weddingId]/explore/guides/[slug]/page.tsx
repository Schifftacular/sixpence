import { Suspense } from "react";
import { Loading } from "@/components/shell/page-bits";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Back } from "@/components/explore/explore-bits";
import { GUIDES, guideBySlug } from "@/lib/explore/guides";
import { categoryName } from "@/lib/plan/templates";

export default function GuidePage({ params }: PageProps<"/w/[weddingId]/explore/guides/[slug]">) {
  return (
    <Suspense fallback={<Loading />}>
      <Inner params={params} />
    </Suspense>
  );
}

async function Inner({ params }: Pick<PageProps<"/w/[weddingId]/explore/guides/[slug]">, "params">) {
  const { weddingId, slug } = await params;
  const g = guideBySlug(slug);
  if (!g) notFound();
  const base = `/w/${weddingId}`;
  const next = GUIDES[(GUIDES.indexOf(g) + 1) % GUIDES.length];
  return (
    <article className="max-w-prose">
      <Back href={`${base}/explore/guides`} label="Guides" />
      <p className="eyebrow">{g.stage} · {g.minutes} min read</p>
      <h1 className="h-page mb-2">{g.title}</h1>
      <p className="mb-6 text-lg text-text-muted">{g.summary}</p>
      {g.sections.map((s) => (
        <section key={s.heading} className="mb-5">
          <h2 className="h-section mb-1">{s.heading}</h2>
          {s.body && <p>{s.body}</p>}
          {s.list && <ul className="list-disc space-y-1 pl-5">{s.list.map((li) => <li key={li}>{li}</li>)}</ul>}
        </section>
      ))}
      {g.category && (
        <p className="card card-pad mb-6 text-sm">
          Ready to look? <Link className="font-medium text-primary hover:underline" href={g.category === "venue" ? `${base}/explore/venues` : `${base}/explore/vendors?cat=${g.category}`}>Find {categoryName(g.category).toLowerCase()} near you →</Link>
        </p>
      )}
      <p className="text-sm text-text-muted">Next: <Link className="text-primary hover:underline" href={`${base}/explore/guides/${next.slug}`}>{next.title}</Link></p>
    </article>
  );
}
