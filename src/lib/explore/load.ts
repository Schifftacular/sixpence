import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Place } from "./places";

export async function placesNear(opts: { lat: number; lng: number; category?: string | null; kind?: "venue" | "vendor" | null; radiusKm?: number; limit?: number }): Promise<Place[]> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("places_near", {
    p_lat: opts.lat, p_lng: opts.lng, p_category: opts.category ?? null, p_kind: opts.kind ?? null,
    p_radius_km: opts.radiusKm ?? 40, p_limit: opts.limit ?? 60,
  });
  return (data ?? []) as Place[];
}

/** place_id -> vendor id, for places this wedding already saved. */
export async function savedPlaces(weddingId: string): Promise<Map<string, string>> {
  const supabase = await createClient();
  const { data } = await supabase.from("vendor").select("id,place_id").eq("wedding_id", weddingId).not("place_id", "is", null);
  return new Map((data ?? []).map((v) => [v.place_id as string, v.id as string]));
}
