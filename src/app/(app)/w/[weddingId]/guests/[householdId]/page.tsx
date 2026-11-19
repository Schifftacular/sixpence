import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { HouseholdEditor } from "@/components/guests/guest-forms";
import { Loading } from "@/components/shell/page-bits";
import { createClient } from "@/lib/supabase/server";
import { loadWedding } from "@/lib/wedding";

export default function HouseholdPage({ params }: PageProps<"/w/[weddingId]/guests/[householdId]">) {
  return (
    <Suspense fallback={<Loading />}>
      <Household params={params} />
    </Suspense>
  );
}

async function Household({ params }: { params: Promise<{ weddingId: string; householdId: string }> }) {
  const { weddingId, householdId } = await params;
  const ctx = await loadWedding(weddingId);
  const supabase = await createClient();
  const { data: h } = await supabase.from("household").select("id,name,side,group_name,email,address,plus_one_allowed,note,responded_at").eq("id", householdId).eq("wedding_id", weddingId).maybeSingle();
  if (!h) notFound();
  const { data: guests } = await supabase.from("guest").select("id,first_name,last_name,is_child,is_plus_one,attending,meal,dietary").eq("household_id", householdId).order("sort");
  return (
    <>
      <Link href={`/w/${weddingId}/guests`} className="btn btn-quiet -ml-2 mb-2">← Guests</Link>
      <h1 className="h-page mb-1">{h.name}</h1>
      <p className="mb-5 text-text-muted">{h.responded_at ? "They've replied. Change anything you heard since." : "No reply yet. If they tell you in person, mark it here."}</p>
      <HouseholdEditor weddingId={weddingId} readOnly={ctx.readOnly} household={h} meals={ctx.wedding.meal_options ?? []}
        guests={(guests ?? []).map((g) => ({ id: g.id, firstName: g.first_name, lastName: g.last_name, isChild: g.is_child, isPlusOne: g.is_plus_one, attending: g.attending, meal: g.meal, dietary: g.dietary }))} />
    </>
  );
}
