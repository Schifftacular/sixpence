import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { GuestSlider } from "@/components/budget/guest-slider";
import { Loading } from "@/components/shell/page-bits";
import { createClient } from "@/lib/supabase/server";
import { loadWedding } from "@/lib/wedding";

export default function WhatIfPage({ params, searchParams }: PageProps<"/w/[weddingId]/budget/what-if">) {
  return (
    <Suspense fallback={<Loading />}>
      <WhatIf params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function WhatIf({ params, searchParams }: { params: Promise<{ weddingId: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { weddingId } = await params;
  const sp = await searchParams;
  const ctx = await loadWedding(weddingId);
  if (!ctx.money) notFound();
  const supabase = await createClient();
  const [{ data: cats }, { data: quotes }] = await Promise.all([
    supabase.from("budget_category").select("id,key,name,target_amount,per_guest").eq("wedding_id", weddingId).order("sort"),
    supabase.from("quote").select("per_guest_amount,pricing_basis,accepted_at,vendor:vendor_id(category_key,status)")
      .eq("wedding_id", weddingId).eq("pricing_basis", "per_guest").not("accepted_at", "is", null)
      .returns<{ per_guest_amount: number | null; vendor: { category_key: string; status: string } | null }[]>(),
  ]);
  const current = ctx.wedding.guest_estimate ?? 100;
  const start = Number(sp.guests) > 0 ? Math.round(Number(sp.guests)) : current;
  return (
    <>
      <Link href={`/w/${weddingId}/budget`} className="btn btn-quiet -ml-2 mb-2">← Budget</Link>
      <h1 className="h-page mb-1">What if the guest list changed?</h1>
      <p className="text-text-muted mb-6">Slide to see what moves. Nothing changes until you tap Apply.</p>
      <GuestSlider
        weddingId={weddingId}
        readOnly={ctx.readOnly}
        currentGuests={current}
        startGuests={start}
        total={ctx.money.total}
        committed={ctx.money.committed}
        categories={(cats ?? []).map((c) => ({ id: c.id, key: c.key ?? "", name: c.name, planned: Number(c.target_amount), perGuest: !!c.per_guest }))}
        quotes={(quotes ?? []).filter((q) => q.vendor && q.per_guest_amount != null).map((q) => ({ categoryKey: q.vendor!.category_key, perGuestAmount: Number(q.per_guest_amount), booked: q.vendor!.status === "booked" }))}
      />
    </>
  );
}
