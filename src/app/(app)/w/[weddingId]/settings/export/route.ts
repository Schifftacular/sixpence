import { createClient } from "@/lib/supabase/server";

// Everything this person can see in the wedding (RLS decides), as one JSON file.
const TABLES = ["budget_category", "task", "vendor", "quote", "payment", "vendor_contact", "contribution", "household", "guest", "timeline_event", "board_item"] as const;

export async function GET(_req: Request, ctx: RouteContext<"/w/[weddingId]/settings/export">) {
  const { weddingId } = await ctx.params;
  const supabase = await createClient();
  const { data: wedding } = await supabase.from("wedding").select("*").eq("id", weddingId).maybeSingle();
  if (!wedding) return new Response("Not found", { status: 404 });
  const entries = await Promise.all(TABLES.map(async (t) => [t, (await supabase.from(t).select("*").eq("wedding_id", weddingId)).data ?? []] as const));
  const body = JSON.stringify({ exportedAt: new Date().toISOString(), wedding, ...Object.fromEntries(entries) }, null, 2);
  return new Response(body, { headers: { "content-type": "application/json", "content-disposition": 'attachment; filename="wedding-export.json"', "cache-control": "no-store" } });
}
