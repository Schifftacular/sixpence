#!/usr/bin/env python3
"""Load wedding-relevant businesses for one metro from Overture Maps into the `place` table.

Public business listings only (Overture places, CDLA-Permissive-2.0). Not wedding data.
Usage:
  pip install pyarrow
  python scripts/etl/places.py --bbox=-82.75,35.45,-82.35,35.75 --out places.csv
  psql "$DATABASE_URL" -c "\\copy public.place (id,source,kind,category_key,subtype,name,lat,lng,address,locality,region,postcode,website,phone,confidence,license) from 'places.csv' csv header"
Re-running with a newer release replaces rows with the same id (load into a temp table and upsert in CI).
"""
import argparse
import csv
import sys

import pyarrow.compute as pc
import pyarrow.dataset as ds
import pyarrow.fs as fs

DEFAULT_RELEASE = "2026-11-18.0"

# Overture taxonomy.primary -> (kind, budget category key). Places that may host weddings are venues.
VENUES = {
    "event_venue", "wedding_chapel", "winery", "vineyard", "resort", "hotel", "inn", "bed_and_breakfast",
    "golf_club", "country_club", "botanical_garden", "historic_site", "brewery", "distillery",
    "festival_venue", "banquet_hall", "barn", "farm", "ranch", "museum", "art_gallery",
}
VENDORS = {
    "caterer": "catering", "food_truck_stand": "catering",
    "event_photography_service": "photo", "photography_service": "photo", "session_photography_service": "photo",
    "photographer": "photo", "videographer": "video", "video_film_production": "video",
    "florist": "flowers", "flowers_and_gifts_store": "flowers", "wholesale_florist": "flowers",
    "dj_service": "music", "musician": "music", "band_orchestra_symphony": "music",
    "bakery": "cake", "cupcake_shop": "cake", "dessert_shop": "cake", "cake_shop": "cake",
    "bridal_shop": "attire", "formal_wear_store": "attire", "tailor": "attire", "clothing_rental": "attire",
    "makeup_artist": "beauty", "hair_stylist": "beauty", "skin_care_and_makeup": "beauty", "hair_salon": "beauty",
    "party_equipment_rental": "rentals", "photo_booth_rental": "rentals", "event_technology_service": "rentals",
    "party_supply_store": "rentals",
    "wedding_planning": "planner", "party_and_event_planning": "planner", "event_planning": "planner",
    "cards_and_stationery_store": "stationery", "printing_service": "stationery",
    "limo_service": "transport", "jewelry_store": "rings", "officiant": "officiant",
}
# Noisy categories need a website to be shown (most farms and galleries don't host weddings).
NEEDS_WEBSITE = {"farm", "ranch", "museum", "art_gallery", "brewery", "distillery", "historic_site", "hotel"}


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--bbox", required=True, help="minLng,minLat,maxLng,maxLat")
    ap.add_argument("--release", default=DEFAULT_RELEASE)
    ap.add_argument("--min-confidence", type=float, default=0.55)
    ap.add_argument("--out", default="places.csv")
    a = ap.parse_args()
    x0, y0, x1, y1 = (float(v) for v in a.bbox.split(","))

    s3 = fs.S3FileSystem(anonymous=True, region="us-west-2")
    data = ds.dataset(f"overturemaps-us-west-2/release/{a.release}/theme=places/type=place/", filesystem=s3, format="parquet")
    bbox = (pc.field("bbox", "xmin") > x0) & (pc.field("bbox", "xmin") < x1) & (pc.field("bbox", "ymin") > y0) & (pc.field("bbox", "ymin") < y1)
    table = data.to_table(
        columns=["id", "names", "taxonomy", "confidence", "bbox", "websites", "phones", "addresses", "operating_status"],
        filter=bbox,
    )

    kept = 0
    with open(a.out, "w", newline="") as f:
        w = csv.writer(f)
        w.writerow(["id", "source", "kind", "category_key", "subtype", "name", "lat", "lng", "address", "locality",
                    "region", "postcode", "website", "phone", "confidence", "license"])
        for r in table.to_pylist():
            cat = (r.get("taxonomy") or {}).get("primary")
            name = (r.get("names") or {}).get("primary")
            if not cat or not name or (r.get("confidence") or 0) < a.min_confidence:
                continue
            if r.get("operating_status") not in (None, "open"):
                continue
            website = (r.get("websites") or [None])[0]
            if cat in VENUES:
                kind, key = "venue", "venue"
            elif cat in VENDORS:
                kind, key = "vendor", VENDORS[cat]
            else:
                continue
            if cat in NEEDS_WEBSITE and not website:
                continue
            addr = (r.get("addresses") or [{}])[0] or {}
            w.writerow([
                f"overture:{r['id']}", "overture", kind, key, cat, name.strip()[:200],
                round(r["bbox"]["ymin"], 6), round(r["bbox"]["xmin"], 6),
                addr.get("freeform"), addr.get("locality"), addr.get("region"), addr.get("postcode"),
                website, (r.get("phones") or [None])[0], round(r.get("confidence") or 0, 3), "CDLA-Permissive-2.0",
            ])
            kept += 1
    print(f"{kept} places written to {a.out} from {table.num_rows} in the box", file=sys.stderr)
    return 0


if __name__ == "__main__":
    sys.exit(main())
