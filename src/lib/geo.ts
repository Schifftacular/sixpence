// City search for a wedding's location. Open-Meteo geocoding: free, no key, GeoNames data (CC BY 4.0).
// Only the typed place name is sent. Nothing about the couple.
export type GeoResult = { label: string; lat: number; lng: number };
type Raw = { results?: { name: string; latitude: number; longitude: number; admin1?: string; country_code?: string; country?: string }[] };

export function toResults(json: Raw): GeoResult[] {
  return (json.results ?? []).map((r) => ({
    label: [r.name, r.country_code === "US" ? usState(r.admin1) : r.admin1, r.country_code === "US" ? null : r.country].filter(Boolean).join(", "),
    lat: Math.round(r.latitude * 1e4) / 1e4,
    lng: Math.round(r.longitude * 1e4) / 1e4,
  }));
}

export async function geocode(q: string): Promise<GeoResult[] | null> {
  const name = q.split(",")[0].trim();
  if (name.length < 2) return [];
  try {
    const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(name)}&count=6&language=en&format=json`, { next: { revalidate: 86400 } });
    if (!res.ok) return null;
    return toResults((await res.json()) as Raw);
  } catch {
    return null;
  }
}

const STATES: Record<string, string> = {
  Alabama: "AL", Alaska: "AK", Arizona: "AZ", Arkansas: "AR", California: "CA", Colorado: "CO", Connecticut: "CT", Delaware: "DE", Florida: "FL", Georgia: "GA",
  Hawaii: "HI", Idaho: "ID", Illinois: "IL", Indiana: "IN", Iowa: "IA", Kansas: "KS", Kentucky: "KY", Louisiana: "LA", Maine: "ME", Maryland: "MD",
  Massachusetts: "MA", Michigan: "MI", Minnesota: "MN", Mississippi: "MS", Missouri: "MO", Montana: "MT", Nebraska: "NE", Nevada: "NV", "New Hampshire": "NH",
  "New Jersey": "NJ", "New Mexico": "NM", "New York": "NY", "North Carolina": "NC", "North Dakota": "ND", Ohio: "OH", Oklahoma: "OK", Oregon: "OR",
  Pennsylvania: "PA", "Rhode Island": "RI", "South Carolina": "SC", "South Dakota": "SD", Tennessee: "TN", Texas: "TX", Utah: "UT", Vermont: "VT",
  Virginia: "VA", Washington: "WA", "West Virginia": "WV", Wisconsin: "WI", Wyoming: "WY", "District of Columbia": "DC",
};
const usState = (s?: string) => (s ? STATES[s] ?? s : null);
