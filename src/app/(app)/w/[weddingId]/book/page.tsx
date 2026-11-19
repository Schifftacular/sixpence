import { Suspense } from "react";
import { ComingSoon, Loading } from "@/components/shell/page-bits";

export default function Page({ params }: PageProps<"/w/[weddingId]/book">) {
  return (
    <Suspense fallback={<Loading />}>
      <Book params={params} />
    </Suspense>
  );
}

async function Book({ params }: { params: Promise<{ weddingId: string }> }) {
  const { weddingId } = await params;
  return (
    <ComingSoon
      title="Wedding book"
      what="Every contract and receipt in one place, read for you and filed once you confirm what we found. Uploads need file storage, which turns on when the app is connected to its hosted database."
      milestone="the next milestone"
      back={`/w/${weddingId}`}
    />
  );
}
