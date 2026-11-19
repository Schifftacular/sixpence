// Explore: public business listings (Overture Maps, CDLA-Permissive-2.0) near the couple.
// Order is distance or name only. There is no paid ranking and no sponsored placement, ever.
export type Place = {
  id: string; kind: "venue" | "vendor"; category_key: string; subtype: string | null; name: string;
  lat: number; lng: number; address: string | null; locality: string | null; website: string | null; phone: string | null;
  site_mentions_weddings: boolean | null; site_capacity: number | null; site_price_from: number | null; distance_km: number;
};

export const VENUE_TYPES: { key: string; label: string; subtypes: string[] }[] = [
  { key: "event", label: "Event spaces", subtypes: ["event_venue", "banquet_hall", "festival_venue", "wedding_chapel"] },
  { key: "farm", label: "Farms and barns", subtypes: ["farm", "barn", "ranch"] },
  { key: "wine", label: "Wineries and breweries", subtypes: ["winery", "vineyard", "brewery", "distillery"] },
  { key: "stay", label: "Hotels and inns", subtypes: ["hotel", "inn", "resort", "bed_and_breakfast"] },
  { key: "garden", label: "Gardens and historic places", subtypes: ["botanical_garden", "historic_site", "museum", "art_gallery"] },
  { key: "club", label: "Golf and country clubs", subtypes: ["golf_club", "country_club"] },
];

export const SUBTYPE_LABEL: Record<string, string> = {
  event_venue: "Event venue", banquet_hall: "Banquet hall", festival_venue: "Outdoor venue", wedding_chapel: "Wedding chapel",
  farm: "Farm", barn: "Barn", ranch: "Ranch", winery: "Winery", vineyard: "Vineyard", brewery: "Brewery", distillery: "Distillery",
  hotel: "Hotel", inn: "Inn", resort: "Resort", bed_and_breakfast: "Bed and breakfast", botanical_garden: "Garden",
  historic_site: "Historic site", museum: "Museum", art_gallery: "Gallery", golf_club: "Golf club", country_club: "Country club",
  caterer: "Caterer", food_truck_stand: "Food truck", photographer: "Photographer", event_photography_service: "Event photographer",
  photography_service: "Photographer", session_photography_service: "Photographer", videographer: "Videographer",
  video_film_production: "Video production", florist: "Florist", flowers_and_gifts_store: "Flower shop", wholesale_florist: "Wholesale florist",
  dj_service: "DJ", musician: "Musician", band_orchestra_symphony: "Band", bakery: "Bakery", cupcake_shop: "Cupcakes",
  dessert_shop: "Desserts", cake_shop: "Cake shop", bridal_shop: "Bridal shop", formal_wear_store: "Formal wear", tailor: "Tailor",
  clothing_rental: "Rental attire", makeup_artist: "Makeup artist", hair_stylist: "Hair stylist", skin_care_and_makeup: "Makeup",
  hair_salon: "Hair salon", party_equipment_rental: "Party rentals", photo_booth_rental: "Photo booth", event_technology_service: "AV and lighting",
  party_supply_store: "Party supplies", wedding_planning: "Wedding planner", party_and_event_planning: "Event planner", event_planning: "Event planner",
  cards_and_stationery_store: "Stationery", printing_service: "Printer", limo_service: "Limo and car service", jewelry_store: "Jeweler", officiant: "Officiant",
};

export const kmToMi = (km: number) => km * 0.621371;
export function distanceText(km: number): string {
  const mi = kmToMi(km);
  return mi < 0.95 ? "under a mile" : `${mi < 10 ? mi.toFixed(1) : Math.round(mi)} mi`;
}

export function venueTypeOf(subtype: string | null): string | null {
  return VENUE_TYPES.find((t) => subtype && t.subtypes.includes(subtype))?.key ?? null;
}

/** Google Maps search link: reviews and photos live there; we don't copy them. */
export function mapsLink(name: string, address?: string | null): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([name, address].filter(Boolean).join(" "))}`;
}

/** Equirectangular projection into a square box, centered on home. Good enough at metro scale. */
export function project(points: { lat: number; lng: number }[], home: { lat: number; lng: number }, size: number, pad = 16) {
  const k = Math.cos((home.lat * Math.PI) / 180);
  const xs = points.map((p) => (p.lng - home.lng) * k);
  const ys = points.map((p) => p.lat - home.lat);
  const r = Math.max(0.01, ...xs.map(Math.abs), ...ys.map(Math.abs));
  const s = (size / 2 - pad) / r;
  return { at: (p: { lat: number; lng: number }) => ({ x: size / 2 + (p.lng - home.lng) * k * s, y: size / 2 - (p.lat - home.lat) * s }), radiusKm: r * 111 };
}
