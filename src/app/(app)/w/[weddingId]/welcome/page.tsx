import { Suspense } from "react";
import { Loading, PageTitle } from "@/components/shell/page-bits";
import { WelcomeForm } from "@/components/settings/welcome-form";
import { loadWedding } from "@/lib/wedding";

export default function WelcomePage({ params }: PageProps<"/w/[weddingId]/welcome">) {
  return (
    <Suspense fallback={<Loading />}>
      <Welcome params={params} />
    </Suspense>
  );
}

async function Welcome({ params }: { params: Promise<{ weddingId: string }> }) {
  const { weddingId } = await params;
  const ctx = await loadWedding(weddingId);
  const w = ctx.wedding;
  return (
    <>
      <PageTitle sub="Four quick questions so Explore and your plan fit you. All optional.">Your plan is saved</PageTitle>
      <WelcomeForm weddingId={weddingId} name={w.name} location={{ text: w.location_text, lat: w.lat, lng: w.lng }} />
    </>
  );
}
