"use server";
import { refresh } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { editor, fail, logActivity, ok, type ActionResult } from "@/lib/actions";

// Boards: saved ideas, places and notes. Photos are linked (with credit), never copied.
const Item = z.object({
  weddingId: z.uuid(),
  kind: z.enum(["photo", "place", "note"]),
  title: z.string().trim().min(1).max(200),
  imageUrl: z.url().max(1000).optional(),
  credit: z.string().max(200).optional(),
  sourceUrl: z.url().max(1000).optional(),
  placeId: z.string().max(200).optional(),
  categoryKey: z.string().max(40).optional(),
  note: z.string().max(2000).optional(),
});

export async function saveToBoard(input: unknown): Promise<ActionResult<{ id: string }>> {
  const p = Item.safeParse(input);
  if (!p.success) return fail("Give it a title.");
  const g = await editor(p.data.weddingId);
  if ("error" in g) return fail(g.error);
  const d = p.data;
  if (d.kind === "place" && d.placeId) {
    const { data: dup } = await g.supabase.from("board_item").select("id").eq("wedding_id", d.weddingId).eq("place_id", d.placeId).maybeSingle();
    if (dup) return ok({ id: dup.id as string });
  }
  if (d.kind === "photo" && d.imageUrl) {
    const { data: dup } = await g.supabase.from("board_item").select("id").eq("wedding_id", d.weddingId).eq("image_url", d.imageUrl).maybeSingle();
    if (dup) return ok({ id: dup.id as string });
  }
  const { data, error } = await g.supabase.from("board_item").insert({
    wedding_id: d.weddingId, kind: d.kind, title: d.title, image_url: d.imageUrl ?? null, credit: d.credit ?? null,
    source_url: d.sourceUrl ?? null, place_id: d.placeId ?? null, category_key: d.categoryKey ?? null, note: d.note ?? null,
  }).select("id").single();
  if (error || !data) return fail("We couldn't save that. Please try again.");
  await logActivity(g.supabase, d.weddingId, "board.saved", "board_item", data.id, { kind: d.kind, title: d.title });
  refresh();
  return ok({ id: data.id as string });
}

export async function removeBoardItem(input: unknown): Promise<ActionResult> {
  const p = z.object({ itemId: z.uuid() }).safeParse(input);
  if (!p.success) return fail("Something went wrong.");
  const supabase = await createClient();
  const { data: item } = await supabase.from("board_item").select("id,wedding_id,title").eq("id", p.data.itemId).maybeSingle();
  if (!item) return fail("That's already gone.");
  const g = await editor(item.wedding_id as string);
  if ("error" in g) return fail(g.error);
  await g.supabase.from("board_item").delete().eq("id", item.id);
  await logActivity(g.supabase, item.wedding_id as string, "board.removed", "board_item", item.id as string, { title: item.title });
  refresh();
  return ok(null);
}
