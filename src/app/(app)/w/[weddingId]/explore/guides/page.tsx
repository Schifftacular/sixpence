import { Suspense } from "react";
import { Loading } from "@/components/shell/page-bits";
import Link from "next/link";
import { Back } from "@/components/explore/explore-bits";
import { GUIDES } from "@/lib/explore/guides";

export default function GuidesPage({ params }: PageProps<"/w/[weddingId]/explore/guides">) {
  return (
    <Suspense fallback={<Loading />}>
      <Inner params={params} />
    </Suspense>
  );
}

async function Inner({ params }: Pick<PageProps<"/w/[weddingId]/explore/guides">, "params">) {
  const { weddingId } = await params;
  const base = `/w/${weddingId}`;
  return (
    <>
      <Back href={`${base}/explore`} />
      <h1 className="h-page mb-1">Guides</h1>
      <p className="mb-4 text-text-muted">Short how-tos for each stage. A few minutes each.</p>
      <ul className="grid gap-3 sm:grid-cols-2">
        {GUIDES.map((g) => (
          <li key={g.slug}>
            <Link href={`${base}/explore/guides/${g.slug}`} className="card card-pad card-link flex h-full flex-col gap-1">
              <span className="eyebrow">{g.stage} · {g.minutes} min</span>
              <span className="font-medium">{g.title}</span>
              <span className="text-sm text-text-muted">{g.summary}</span>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
