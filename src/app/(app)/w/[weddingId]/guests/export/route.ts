import { guestsCsv } from "@/lib/guests/parse";
import { createClient } from "@/lib/supabase/server";

// CSV of the guest list for the couple (RLS: planners only). Never cached.
export async function GET(_req: Request, ctx: RouteContext<"/w/[weddingId]/guests/export">) {
  const { weddingId } = await ctx.params;
  const supabase = await createClient();
  const { data, error } = await supabase.from("household")
    .select("name,side,group_name,email,address,guests:guest(first_name,last_name,is_child,attending,meal,dietary,sort)")
    .eq("wedding_id", weddingId).order("name");
  if (error) return new Response("Not available", { status: 403 });
  const rows = (data ?? []).map((h) => ({ ...h, guests: [...(h.guests ?? [])].sort((a, b) => a.sort - b.sort) }));
  return new Response(guestsCsv(rows), {
    headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": 'attachment; filename="guest-list.csv"', "cache-control": "no-store" },
  });
}
