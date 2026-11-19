import Link from "next/link";
import { Suspense } from "react";
import { RsvpCard } from "@/components/guests/rsvp-card";
import { Loading } from "@/components/shell/page-bits";
import { createClient } from "@/lib/supabase/server";
import { loadWedding } from "@/lib/wedding";

export default function RsvpPreviewPage({ params }: PageProps<"/w/[weddingId]/guests/rsvp-preview">) {
  return (
    <Suspense fallback={<Loading />}>
      <Preview params={params} />
    </Suspense>
  );
}

async function Preview({ params }: { params: Promise<{ weddingId: string }> }) {
  const { weddingId } = await params;
  const ctx = await loadWedding(weddingId);
  const supabase = await createClient();
  const { data: h } = await supabase.from("household").select("name,guest(id,first_name,is_plus_one,sort)").eq("wedding_id", weddingId).order("name").limit(1).maybeSingle<{ name: string; guest: { id: string; first_name: string; is_plus_one: boolean; sort: number }[] }>();
  const w = ctx.wedding;
  return (
    <>
      <Link href={`/w/${weddingId}/guests`} className="btn btn-quiet -ml-2 mb-2">← Guests</Link>
      <p className="card card-pad mb-6 bg-primary-soft text-sm">This is a preview{h ? ` for ${h.name}` : ""}. RSVP links are off, so no guest can see this page yet and nothing here is sent.</p>
      <RsvpCard preview token="preview" wedding={{ name: w.name, date: w.date, location: w.location_text, deadline: w.rsvp_deadline, meals: w.meal_options ?? [] }}
        household={h?.name ?? "Your guests"}
        guests={(h?.guest ?? [{ id: "00000000-0000-4000-8000-000000000000", first_name: "Guest", is_plus_one: false, sort: 0 }]).sort((a, b) => a.sort - b.sort).map((g) => ({ id: g.id, firstName: g.first_name, isPlusOne: g.is_plus_one, attending: null, meal: null, dietary: null }))} />
    </>
  );
}
