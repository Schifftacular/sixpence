# Free Wedding Planner: Prototype Architecture

*Version 1.9, November 19, 2026. Owner: architecture thread. Built with the engineering:system-design and engineering:architecture frameworks.*
*Inputs: [market study](../market-research/wedding-saas-market-study.md), [feature list](../market-research/feature-list.md). v1.1 folds in [user flows v1](../user-flows/couple-user-flows.md) section 11; v1.2 folds in [free data sources](../data-sources/free-data-sources.md). v1.4 folds in the reworked onboarding (user flows F1: document extraction, sample wedding, resume, notifications) and the [brand guide](../branding/brand-guide.md) (name **Sixpence**, tokens in `branding/tokens.json`).*

---

## 1. Summary

| Decision | Choice | Why |
|---|---|---|
| App type | One responsive **web app, installable as a PWA** | One codebase for phone and desktop; no app store review; offline day-of view via service worker |
| Frontend + server | **Next.js (App Router, TypeScript)** + Tailwind + shadcn/ui | Fastest path to a polished app; server actions double as the API the future agent planner will call |
| Database, auth, files, realtime | **Supabase** (Postgres + Auth + Storage + Realtime) | One free service covers four needs; Postgres Row Level Security enforces the couple / family / vendor roles at the database |
| Hosting | **Vercel** (Hobby, free) for the app; **Supabase** free tier for data | $0 to run the prototype; git-push deploys with preview URLs per branch |
| External data | **Own the data where we can**: bulk open datasets loaded by a batch ETL (GitHub Actions + DuckDB) into Postgres/PostGIS; the few live APIs go through a server-side **adapter layer + cache** | Open data (Overture, Foursquare OS, NOAA, BLS, BEA) is storable and commercial-OK, so most "API" features become local queries with no rate limits |
| Maps | **MapLibre GL + Protomaps PMTiles** on Cloudflare R2 | No key, no quota; OSM attribution only |
| Jobs | **Supabase pg_cron + Edge Functions** for minute-level work (extraction queue, reminder emails); **GitHub Actions** for heavy monthly ETL | Vercel Hobby cron runs only once a day, so it can't drive a queue |
| Email | **Resend** free tier (3,000/month) | RSVP invites and reminders |
| Document extraction | **Pluggable engine** writing to the same staging tables. During development: **Claude Code on Mike's own computer under his Claude subscription** reads his real documents. Later, for other couples: Claude API inside the app, or a local no-AI fallback | Subscription sign-in can't be used inside a deployed app, so the dev engine runs where it's allowed (section 5a) |
| Sign-in | Supabase Auth: **Google only** for now (Mike, Nov 19) | No passwords. Magic link is a config switch later; Apple dropped |
| Agent planner (later, paid) | Not built. Kept unblocked by a typed **action layer** and an **activity log** | The agent will call the same actions the UI calls |

**Running cost of the prototype: $0 for hosting and data.** Document reading during development uses Mike's existing Claude subscription through a local Agent SDK worker on his computer; for other couples later, Claude API usage is roughly $2 to $6 per binder (section 5a). First paid step, if usage grows: Supabase Pro ($25/month) for backups and no auto-pause.

**One thing I need from Mike:** a GitHub repository. See section 10.

---

## 2. Requirements

### Functional (prototype scope)
Taken from Stage 1 of the feature list, reshaped for couple-first and free:
1. Sign up, create a wedding, invite a partner (both are owners).
2. Guided onboarding: date (or season), location, guest count, budget → generates a starter checklist, budget and timeline.
3. Checklist with due dates relative to the wedding date.
4. Budget tracker with categories, estimates vs actuals, payments due.
5. Guest list with households, plus-ones, meal choices, dietary needs.
6. RSVP by **link, no guest account** (one token per household).
7. Vendor tracker: contacts, status, quotes, deposits, due dates.
8. Documents (contracts, inspiration images) attached to vendors and items.
9. Seating chart (tables, drag guests).
10. Day-of run-of-show, readable **offline** on a phone.
11. Role-based sharing: owner (couple), collaborator (parents, planner), viewer (wedding party), vendor (sees only their items).
12. **Data-powered helpers** (the point of the free APIs): local cost benchmarks for the budget, venue/vendor discovery near the location, date helpers (holidays, sunset time, typical weather), travel/lodging hints for guests.

### Non-functional
| Need | Target for the prototype |
|---|---|
| Cost | $0/month on free tiers |
| Scale | Tens of couples, hundreds of guests each. Not a design driver yet |
| Latency | Pages under 1s on broadband; external data served from cache |
| Privacy | Guest data never sold or shared; no third-party ad trackers. Guest PII stays in our database only |
| Offline | Day-of timeline and vendor contacts cached on device |
| Availability | Best effort. Supabase free projects pause after 7 days idle; acceptable for a prototype |

### Constraints
- Solo / AI-assisted build, so favor managed services and one language (TypeScript).
- Free APIs must be server-side, cached and attributed per their licenses.
- Must not block the paid agent planner later.

---

## 3. High-level design

```
            Couple / family / planner (browser or installed PWA)
                       │                      ▲
                       ▼                      │ realtime updates
   ┌──────────────────────────────────────────┴───────────┐
   │ Next.js on Vercel                                    │
   │  • React UI (server + client components)             │
   │  • Server actions  = the ACTION LAYER (typed, zod)   │◄── future agent planner
   │  • Route handlers: /rsvp/[token], /api/cron/*        │    calls the same actions
   │  • Data adapters: /lib/sources/* (server only)       │
   └───────┬───────────────────────┬──────────────────────┘
           │                       │ cache miss
           ▼                       ▼
   ┌───────────────────┐    ┌──────────────────────────┐
   │ Supabase          │    │ Live APIs (cached)       │
   │  Postgres + RLS   │◄───│  Geoapify autocomplete,  │
   │  + PostGIS        │    │  Census Geocoder,        │
   │  Auth (magic link,│    │  Open-Meteo history,     │
   │   Google)         │    │  OpenRouteService,       │
   │  Storage (files)  │    │  Hebcal, Frankfurter     │
   │  Realtime         │    └──────────────────────────┘
   └───────────────────┘
           ▲                          Cloudflare R2: PMTiles basemap ──► MapLibre in browser
           │ monthly bulk load
   GitHub Actions ETL (DuckDB): Overture + Foursquare OS places,
     NOAA normals, BEA RPP, BLS OEWS/CPI, holidays → reference tables
   Supabase pg_cron → Edge Functions: extraction worker (→ Claude API), reminder emails (Resend)

   Guests: RSVP page by tokenized link, no login.
```

### Key data flows
1. **Onboarding (before sign-up).** Couple answers questions without an account; a pure function `generatePlan(answers, seedData)` builds the checklist, budget split and timeline in the browser (seed data and benchmarks served from a public cached endpoint). On sign-up, action `createWedding(answers)` re-runs the same function on the server and persists it. Server path: → geocode location (adapter) → load cost benchmarks for the region (cache) → generate checklist, budget lines and timeline from **templates** (plain JSON rules in the repo, not AI) → write rows.
2. **RSVP.** Couple sends invites → each household gets a random token → guest opens `/rsvp/<token>` → server looks up household by token hash → guest submits → row updated → couple sees it live via Realtime.
3. **Discovery.** Couple opens "Find venues" → action `searchPlaces(category, near, radius)` → PostGIS query on our own `place` table (no external call) → results on a MapLibre map → couple saves one → becomes a `vendor` in their wedding linked to the `place`. Couple-entered details (capacity, price, "does weddings") stay on their `vendor` row; with opt-in they can later enrich `place`.
5. **Date helper.** For a candidate date: typical weather from `climate_normal` (nearest NOAA station) or cached Open-Meteo stats for the location's grid cell; sunset and golden hour computed in the browser with SunCalc; holidays and long weekends from `date_annotation`.
6. **Cost range.** `costRange(region, guestCount, style)` in `src/lib/costModel.ts` reads `cost_baseline`, `region_multiplier` and `cpi_index` and returns low / typical / high, always labeled as an estimate with sources.
4. **Day-of offline.** The day-of page is pre-rendered and cached by the service worker; it re-syncs when online. Read-only offline for the prototype.

---

## 4. Data model

Postgres, all tables with `id uuid`, `created_at`, `updated_at`. Everything that belongs to a wedding has `wedding_id` and is protected by RLS.

### Core
| Table | Key columns | Notes |
|---|---|---|
| `profile` | user_id (auth.users), display_name | One per login |
| `wedding` | name, date (nullable), date_flex (season/year), location_text, lat, lng, region_code, guest_estimate, budget_total, currency, style_tags[], date_is_estimate, guest_estimate_is_estimate, budget_is_estimate, rsvp_slug (nullable), rsvp_lookup_enabled | Couples often lack a date at first; estimate flags drive "rough number" UI |
| `wedding_member` | wedding_id, user_id, role (`owner`/`collaborator`/`funder`/`viewer`/`vendor`), vendor_id (nullable), invited_email, status | Drives RLS. Vendor members see only rows linked to their vendor_id |
| `event` | wedding_id, name (ceremony, reception, rehearsal, welcome party, mehndi…), starts_at, venue_place_id | Multi-event weddings are first-class (a market gap) |

### Planning
| Table | Key columns | Notes |
|---|---|---|
| `task` | wedding_id, title, notes, due_date, due_offset_days, category, status (`todo`/`done`/`skipped`), source (`template`/`user`), assignee_member_id, vendor_id, template_key | `due_offset_days` (e.g. −270) recomputes dates when the wedding date changes |
| `timeline_item` | wedding_id, event_id, starts_at, ends_at, title, location, owner_vendor_id, notes, sort | The day-of run-of-show |
| `budget_category` | wedding_id, name, target_amount, benchmark_low, benchmark_high | Benchmarks filled from data sources |
| `budget_item` | wedding_id, category_id, vendor_id, description, estimate | Planned lines not tied to a quote |
| `payment` | wedding_id, budget_item_id, vendor_id, amount, due_date, paid_at, method, kind (`deposit`/`installment`/`final`/`tip`) | "Budget tied to payment due dates" gap; feeds reminders |
| `vendor` | wedding_id, place_id (nullable), category, name, contact_name, email, phone, website, status (`idea`/`contacted`/`quoted`/`booked`/`passed`) | The couple's own record, even if not from discovery |
| `quote` | wedding_id, vendor_id, total, pricing_basis (`flat`/`per_guest`), per_guest_amount, inclusions, expires_on, accepted_at | Many per vendor. Accepting one sets vendor to `booked` |
| `contribution` | wedding_id, from_member_id (nullable = couple), from_label, amount, covers_category_id (nullable) | Parents/funders chipping in |
| `document` | wedding_id, storage_path, filename, mime, linked_type, linked_id | Files in Supabase Storage, private bucket per wedding |
| `comment` | wedding_id, linked_type, linked_id, author_member_id, body | Shared comments per item |

### Guests
| Table | Key columns | Notes |
|---|---|---|
| `household` | wedding_id, name, address fields, email, phone, rsvp_token_hash, invited_event_ids[], side (`partner_a`/`partner_b`/`both`) | One RSVP link per household |
| `guest` | household_id, wedding_id, first_name, last_name, is_plus_one, age_group, dietary, meal_choice | |
| `rsvp` | guest_id, event_id, status (`pending`/`yes`/`no`/`maybe`), responded_at | Per guest per event |
| `seating_table` | wedding_id, event_id, name, capacity, shape, x, y | |
| `seat_assignment` | seating_table_id, guest_id, seat_no | |

### Reference data (shared, not per wedding; read-only to users)
| Table | Key columns | Notes |
|---|---|---|
| `place` | geom geography(Point), name, category (our wedding taxonomy), address, website, phone, is_open, overture_id, fsq_id, release, license | Venues/vendors merged from **Overture + Foursquare OS** (both permissive), deduped by name + distance. GiST index on geom |
| `place_osm` | osm_type, osm_id, geom, tags jsonb | **Separate table** for OpenStreetMap rows (ODbL share-alike must not touch `place`). P2 |
| `cost_baseline` | category, guest_band, amount, per_guest_part, fixed_part, source, year, url | The Knot 2026 figures entered by hand, one cited fact per row |
| `region_multiplier` | region_code (state / CBSA), kind (`rpp`/`oews_ratio`/`state_calibration`), category, value, source, as_of | BEA RPP, BLS OEWS wage ratios |
| `cpi_index` | series_id, month, value, interpolated | BLS CPI lines for catering, flowers, photography, hotels (Oct 2025 gap interpolated) |
| `climate_normal` | station_id, geom, day_of_year, tmax, tmin, precip_prob | NOAA 1991–2020 daily normals, bulk loaded once |
| `climate_cell_stat` | cell_key (0.25° grid), week_of_year, rain_days_pct, heat_risk, source | Derived from Open-Meteo ERA5 history, computed once per cell and kept (data is CC BY 4.0) |
| `date_annotation` | date, region_code, kind (`holiday`/`long_weekend`/`observance`/`local_event`), label, source | Built yearly from a bundled holiday library + Hebcal |
| `source_cache` | source, key_hash, payload jsonb, fetched_at, expires_at | Generic HTTP response cache for live adapters |
| `data_source` | name, license, attribution_text, url, commercial_ok, last_loaded | Drives the attribution page and the commercial-risk check |
| `checklist_template` | key, title, offset_days, category, conditions jsonb | Can live in the repo as JSON instead; table later if edited by non-devs |

### Onboarding and document extraction (v1.4)
| Table | Key columns | Notes |
|---|---|---|
| `document` (extended) | + source (`camera`/`upload`/`paste`/`email`), mime, page_count, sha256, doc_type (`contract`/`quote`/`invoice`/`guest_list`/`budget_sheet`/`brochure`/`handwritten`/`business_card`/`invitation_proof`/`inspiration`/`unsorted`), doc_type_confidence, label_by_user | The original file stays in the private Storage bucket; sha256 catches re-uploads of the same file |
| `extraction_job` | wedding_id, document_id, status (`queued`/`converting`/`classifying`/`extracting`/`ready`/`failed`/`cancelled`), pages_total, pages_done, attempts, locked_until, error, model, input_tokens, output_tokens, created_by | Server-side state, so closing the app never loses progress. Realtime pushes progress to the "Reading 12 pages… 4 done" UI |
| `extracted_item` | job_id, wedding_id, target_entity (`vendor`/`quote`/`payment`/`household`/`guest`/`budget_item`/`timeline_item`/`task`), proposed jsonb, field_meta jsonb (per field: confidence `high`/`check`/`low`, page, quote, bbox), status (`pending`/`saved`/`edited`/`discarded`), match_entity_id, match_kind (`new`/`duplicate`/`conflict`), saved_entity_id, reviewed_by, reviewed_at | **Staging only.** Nothing reaches wedding tables until a person presses Save; Save runs the normal typed action, so permissions and `activity` apply |
| `inbound_address` | wedding_id, local_part (random, e.g. `w7k2q9`), active | P1 forward-to-email; mail with attachments becomes `document` rows with source `email` |
| `onboarding_state` | wedding_id, current_step, answers jsonb, checklist jsonb (7 setup steps with done/skipped), dismissed_at | "Resume anywhere" and the setup checklist. Pre-sign-up answers live in localStorage and are written here on sign-up |
| `notification_pref` | member_id, kind (`payment_reminder`/`weekly_checkin`/`partner_digest`/`rsvp_updates`/`nudges`), channel (`email`/`push`), enabled, day_of_week | Read by the reminder job; nudges stop when the step is done |
| `product_event` | name, wedding_hash, props jsonb (no PII, no free text), occurred_at | First-party, privacy-friendly funnel events (step viewed/completed/skipped, docs uploaded, time to aha). Extraction accuracy is computed from `extracted_item` (`saved` without edits ÷ all saved), not logged separately |

**Sample wedding.** A fictional couple (not the synthetic twin, which mirrors Mike's real wedding's shape) seeded as a normal wedding with `wedding.is_sample = true`. An RLS policy lets anyone, signed in or not, read rows of sample weddings; no one can write them. The UI shows the "This is a sample wedding. Start yours." banner when `is_sample`.

### Money numbers (one shared function)
The Budget pillar's four numbers are computed in one pure function, `src/lib/money.ts`, used by UI, emails and later the agent, never re-derived ad hoc:
- **Planned** = sum of `budget_category.target_amount`
- **Committed** = sum of accepted `quote` totals (per-guest quotes × current guest count) + `budget_item.estimate` lines with no vendor
- **Paid** = sum of `payment.amount` where `paid_at` is set
- **Funded** = sum of `contribution.amount` (plus the couple's own `budget_total` share)

### Platform (keeps the agent planner unblocked)
| Table | Key columns | Notes |
|---|---|---|
| `activity` | wedding_id, actor_type (`user`/`guest`/`system`/`agent`), actor_id, action, entity_type, entity_id, diff jsonb | Audit trail and the "what happened" feed; the agent will read and write here |
| `entitlement` | wedding_id, feature, granted_at, expires_at | Empty in the prototype. Gates the paid agent later without schema changes |
| `notification` | user_id, wedding_id, kind, payload, read_at, emailed_at | In-app plus email reminders |

### Access rules (RLS sketch)
- A user can read a wedding's rows if they have a `wedding_member` row for it.
- `owner` and `collaborator` can write; `viewer` is read-only.
- `vendor` reads only `timeline_item`, `task`, `payment`, `document`, `comment` where `vendor_id` = their vendor_id.
- Guests never authenticate; the RSVP route uses a server-side service key scoped by token hash, and returns only that household.
- Reference tables are readable by everyone (including signed-out onboarding) and writable only by the ETL service role.
- `funder` reads and writes only budget tables, `contribution`, `payment` and `vendor` names; **no access to `household`/`guest`** (guest PII).
- Public RSVP by slug: a server route searches guests by full first + last name (case and accent insensitive, minimum lengths), rate-limited per IP and per wedding, returns only that household's first names, never the guest list. The couple can switch it off (`rsvp_lookup_enabled`); per-household tokens keep working.
- Budget visibility per member (e.g. hide budget from the wedding party) via a `can_see_budget` flag on `wedding_member`.

---

## 5. External data sources: how they plug in

Sources and tiers come from the [data sources report](../data-sources/free-data-sources.md). The principle that report points to: **load storable open data into our own database, and call live APIs only where we must.** That removes most rate-limit and outage risk and keeps per-user cost at zero.

### Adapter contract
Each source is one module under `src/lib/sources/<name>.ts`:

```ts
export interface SourceAdapter<Q, R> {
  name: string;                 // "openmeteo"
  license: string;              // shown in the attribution footer
  ttlSeconds: number;           // how long a cached answer stays fresh
  rateLimit: { perMinute: number };
  fetch(query: Q): Promise<R>;  // calls the API, normalizes the result
}
```

A shared `cached(adapter, query)` helper:
1. hashes the query, looks in `source_cache`;
2. on a fresh hit, returns it;
3. on a miss, takes a token from a simple per-source limiter (Postgres row or in-memory per instance), calls `fetch`, stores the result, returns it;
4. on API failure, returns the stale cache if any, else a typed "unavailable" result so the UI degrades gracefully.

### Three ways data arrives
| Pattern | Use for | Prototype sources (P1 unless noted) |
|---|---|---|
| **Bulk ETL into Postgres** (GitHub Actions, monthly or yearly) | Large, slow-changing, storable datasets | Overture Maps places + Foursquare OS Places → `place`; NOAA daily normals → `climate_normal`; BEA RPP, BLS OEWS, BLS CPI → multipliers and index; holidays → `date_annotation`; Census CBP vendor density (P2); OSM extract → `place_osm` (P2) |
| **Live adapter + cache** | Per-user lookups we can't precompute | Geoapify city/address autocomplete (Photon self-hosted fallback); US Census Geocoder for batch guest addresses; Open-Meteo ERA5 history (once per grid cell, kept); OpenRouteService drive times (P2); api.weather.gov 7-day forecast (P2); Hebcal; Frankfurter currency (daily) |
| **Computed in the browser** | Pure math, no data licensing | SunCalc sunset and golden hour; `.ics` calendar files; `sms:` deep links (US SMS is never free) |
| **Hand-curated in the repo** | No open dataset exists | The Knot cost figures (cited per value), checklist/timeline templates, budget splits, marriage-license rules by state (with last-verified date and official link) |

### Rules for every source
- **Do not build on:** Google Places (only `place_id` storable, no directory use, no non-Google maps), public Nominatim (1 req/s, no autocomplete), Stadia or MapTiler free tiers (non-commercial), Yelp (paid), Amadeus Self-Service (shut down July 2026).
- **Open-Meteo from one place:** its free tier is rate-limited per IP and serverless IPs are shared, so calls go through the cache and, for the launch region, are precomputed by the ETL rather than hit per request.
- Called only from the server; keys in Vercel env vars.
- Respect usage policies (e.g. Nominatim: 1 request/second, a real User-Agent, no bulk geocoding).
- Store the license and show attribution (OpenStreetMap requires it).
- Never send guest PII to an external API, with one deliberate exception: guest **street addresses (no names)** go to the US Census Geocoder (a government service with public-domain output) when the couple imports addresses. Everything else that leaves our server is the wedding's location, date or a category.
- Every source has a `data_source` row; an `/about/data` page lists licenses and required notices (OSM attribution, Census API notice, Unsplash/Pexels credits).

### Free-tier risks to clear before the paid agent planner
These are fine for a free prototype but are **non-commercial or uncertain** once any part of the product earns money: Open-Meteo free API (move to self-hosted or paid), Vercel Hobby (move to Pro or Cloudflare), Geoapify and ORS storage terms (unconfirmed), Ticketmaster caching terms (unread). The `data_source.commercial_ok` column makes this a query, not a memory exercise.

---

## 5a. Document extraction pipeline

Couples pour in their wedding binder (camera scans, PDFs, photos, Word and Excel files, pasted text, later forwarded email) and the app proposes vendors, quotes, payments, guests and budget lines for them to confirm.

```
 Browser                         Supabase                              Claude API
 ───────                         ────────                              ──────────
 camera scan (pages → 1 PDF)  ┐
 upload PDF/JPG/PNG/HEIC/     ├─► Storage (private, per wedding)
   DOCX/XLSX/CSV, paste text  ┘   + document row + extraction_job (queued)
                                        │  (DB trigger / pg_cron every minute)
                                        ▼
                                 Edge Function worker
                                  1. convert   HEIC→JPEG, DOCX→text, XLSX/CSV→rows (no AI)
                                  2. classify  ─────────────────────────────────► one call: doc_type + confidence
                                  3. extract   per-type JSON schema ────────────► structured output, per-field
                                                                                  confidence + page + quote
                                  4. match     against existing vendors/guests/payments → new / duplicate / conflict
                                  5. write     extracted_item rows (staging), job → ready
                                        │ Realtime
                                        ▼
 Review queue: one card per document, source page with the field highlighted,
 Save / Edit / Not wedding-related, "Save all 'Looks right'" → typed actions → wedding tables
```

**Design rules**
- **Deterministic first.** Spreadsheets and CSVs are parsed in code (SheetJS / Papa Parse). The model only suggests the column mapping, which the couple confirms; re-import upserts on `household.import_key`. DOCX goes through text extraction (mammoth). Only images, scans, PDFs and messy text need the model.
- **One job, many small steps.** The worker takes one job at a time with a row lock (`locked_until`), does one step (one page batch, one call), saves progress and releases. A crash or timeout just means the next tick picks it up; `attempts` caps retries at 3, then `failed` with a readable reason and the file kept as Unsorted. Closing the app changes nothing, because all state is on the server.
- **Structured outputs, one schema per document type.** `output_config.format` with a JSON schema per type (contract, invoice, guest list, …) so every response parses. Each field returns `value`, `confidence`, `page` and the exact `quote` it came from.
- **Where it came from.** The review card highlights the field by finding the `quote` on that page: in the PDF text layer when there is one, otherwise by showing the page with the quote listed beside the field. Precise boxes on photos are a later improvement.
- **Duplicates and conflicts.** Matching uses normalized names, emails, phones and amounts: same vendor already exists → attach the quote/payment to it; same payment already recorded → mark duplicate; different value for a confirmed fact (e.g. deposit $2,000 vs $2,500) → conflict card showing both, never overwrite.
- **Prompt-injection hygiene.** Document text is data: the system prompt says so, the model has no tools, and output is only ever a proposal a person confirms.
- **Dev and preview** may only process files in the synthetic twin's sample-document set: the worker refuses any file whose sha256 isn't in `etl/seed/sample-docs.json` unless `APP_ENV=production`.

**Extraction engines (v1.5).** Everything above the "write extracted_item rows" step is behind one interface (`src/lib/extract/engine.ts`), and the review queue doesn't care which engine produced the rows:

| Engine | Where it runs | Used for | Cost |
|---|---|---|---|
| **A. Local Agent SDK worker** (development, now) | Mike's own computer: `npm run worker:local`, using the Claude Agent SDK signed in with his own Claude subscription | Reading Mike's real binder during development | Included in his subscription |
| B. Claude API worker | Supabase Edge Function (as drawn above) | Other couples, once the app opens up | ~$2–$6 per binder |
| C. Local no-AI fallback | Edge Function or browser | Typed PDFs and spreadsheets when no AI is available or wanted: PDF text layer + Tesseract OCR + rules for amounts, dates, emails, phones | $0, lower accuracy, no handwriting |

**How engine A works (v1.6).** Anthropic's terms say Pro and Max limits "assume ordinary, individual usage of Claude Code and the Agent SDK", while developers building products "should use API key authentication", third parties may not "route requests through Free, Pro, or Max plan credentials on behalf of their users", and developers may not "collect, store, or intermediate Claude.ai credentials or session tokens" ([Claude Code legal and compliance](https://code.claude.com/docs/en/legal-and-compliance)). A single-person development setup on Mike's own machine, reading only his own documents, fits the first; a deployed server holding his token does not. So:

1. Mike uploads documents **in the app** like any couple (camera, upload, paste). They land in Storage with an `extraction_job` (queued), exactly as drawn above.
2. On his computer he runs `npm run worker:local`. It uses the **Claude Agent SDK**, authenticated by his own Claude Code sign-in on that machine (the SDK picks it up; our code never reads, copies or stores the token, and it never touches Vercel, Supabase or the repo).
3. The worker signs in to Sixpence as Mike (Google), takes queued jobs **for his wedding only**, downloads each file, has Claude classify and extract it with the per-type schemas, and writes `extracted_item` rows. Progress shows in the app through Realtime, the same as the cloud worker would.
4. Mike and his partner review and confirm in the app. Accuracy is measured the same way.

Trade-off: jobs only run while his computer is on and the worker is running; queued jobs wait otherwise (the app shows "Waiting to be read"). The cloud worker (engine B, API key) replaces it when other couples arrive, with no change to the app or the review flow.

**Privacy for engine A.** Mike's documents are covered by his consumer Claude account terms. He should turn off model training in claude.ai → Settings → Privacy ("Help improve Claude") before running it; with that off, Anthropic keeps the data for a limited period (30 days under current consumer terms) and doesn't train on it. If that's not acceptable for a given document, engine C reads it with nothing leaving his machine or our servers.

**Privacy and the AI provider for engine B (ADR-005).** Claude API (Anthropic, commercial terms): API inputs and outputs are not used for model training by default. Files are sent inline per request (not stored with the Files API). **Retention is the open point**: standard API terms keep data for a limited period for trust and safety; true zero retention needs a Zero Data Retention arrangement with Anthropic. This must be confirmed before Mike's real documents go through it (open item 8).

**Cost.** Using `claude-opus-5-5` ($4 / $20 per million input / output tokens): a typical 6-page contract is ~10–15k input tokens and ~1–2k output tokens, so roughly **$0.06–$0.10 per document**. A full binder of 30–60 documents is about **$2–$6 per couple**, one time. Ways to lower it if needed, each Mike's call: Message Batches (50% off, results within hours instead of minutes) for non-urgent re-processing; a cheaper model (Claude Haiku 5.5 is ~40x cheaper) for classification only, after measuring accuracy on the synthetic twin's documents. `extraction_job` records tokens per job so real cost is a query.

**Quality bar.** Target from the flows: 80%+ of extracted fields saved without edits on typed documents. The synthetic twin's sample documents, with expected fields, double as the extraction eval: run it before changing prompts, schemas or models.

**Forward-to-email (P1).** Cloudflare Email Routing (free) on an inbound subdomain → an Email Worker that checks the `inbound_address`, drops mail without attachments or from blocked senders, and posts attachments to an authenticated app endpoint that creates `document` + `extraction_job`. Needs the Sixpence domain on Cloudflare.

## 6. Hosting, environments and ops

| Concern | Prototype choice |
|---|---|
| Environments | `main` → production on Vercel; every branch gets a preview URL. One Supabase project for prod, local Supabase (Docker CLI) for dev |
| Schema changes | SQL migrations in `supabase/migrations`, applied by the Supabase CLI |
| Secrets | Vercel env vars; Supabase service key server-only |
| Errors | Vercel runtime logs to start; add Sentry free tier when real couples use it |
| Analytics | Vercel Web Analytics (privacy-friendly) or none. No ad trackers, in keeping with the privacy promise |
| Backups | Free tier has none; nightly `pg_dump` via a GitHub Action to a private artifact once there is real data |

**Data size vs the free database.** Overture and Foursquare filtered to wedding categories are on the order of a million-plus US rows, which won't fit comfortably in Supabase's 500 MB free database alongside everything else. The prototype therefore loads **launch metros only** (a few hundred MB at most, slim columns, no raw JSON). Going nationwide is the first real cost: Supabase Pro at $25/month (8 GB). **Map tiles** live on Cloudflare R2 (10 GB free, no egress fees): a launch-region PMTiles extract, or a US extract capped at zoom 14.

**Free-tier limits to watch:** Supabase free: 500 MB database, 1 GB storage, 50k monthly active users, pauses after 7 idle days. Vercel Hobby: non-commercial use only; fine for a free prototype, but move to Pro ($20/month) or Cloudflare before charging for the agent planner. Resend free: 3,000 emails/month, 100/day (Mailjet and Brevo as backups; SendGrid's free plan is gone). Geoapify: 3,000 credits/day. BLS API: 500 queries/day.

---

## 6a. Building with Mike's real wedding (dogfooding)

Mike's own wedding is the prototype's first and main dataset: user research and every development cycle run on it. That makes the "prototype" hold **real personal data from day one**, so these rules apply from Milestone 0:

| Concern | Rule |
|---|---|
| Where real data lives | Only in the **production** Supabase project. Never in the repo, seed files, fixtures, screenshots in PRs, test snapshots, or prompts to third-party AI tools, with one deliberate exception: Mike's own documents read by the local Agent SDK worker under his subscription (section 5a, engine A) |
| Development data | A **synthetic twin** wedding (fake names, generated guests) in `supabase/seed.sql`, shaped like Mike's (similar guest count, vendors, budget) so bugs reproduce without real PII |
| Repository | **Private** GitHub repo. `.gitignore` covers `*.csv`, `*.xlsx`, `/imports/` so a guest export can't be committed by accident |
| Getting data in | **Import comes early**: CSV/spreadsheet import for guests and households, vendors, budget lines and payments moves into Milestones 2–4, since Mike's existing data (spreadsheets, notes, contracts) is the starting point. Imports run in the app against production, not via scripts that write files to disk. This is user flow **F0** (P0): basics form, guest CSV with column mapping, quick vendor rows that create quotes and payments. **Re-import updates instead of duplicating**: `household.import_key` (normalized household name + email, or a mapped ID column) is unique per wedding and imports upsert on it; an `import_run` row (file name, mapping, counts, created/updated/skipped) logs each import |
| Backups | Free Supabase has no backups, and this data can't be lost. Nightly encrypted `pg_dump` via GitHub Actions to a private Cloudflare R2 bucket from Milestone 0. Revisit Supabase Pro ($25/month, daily backups) once guest data is in |
| Outbound email and RSVP | Real guests are real people. A `wedding.outbound_enabled` flag (default **off**) gates guest email and public RSVP links, and an env-level `EMAIL_MODE` (`off` in dev and preview, `allowlist` in production until Mike says go) means a test can never reach a guest |
| Export and delete | Couple can **export everything** (ZIP of CSVs + documents) and **delete everything** (wedding row cascades; Storage bucket emptied; `activity` keeps no PII after deletion) |
| Schema changes | Migrations are tested against a copy of production restored into local Supabase (kept on the dev machine, never committed) before they run on production |
| Auto-pause | Supabase free pauses after 7 idle days; daily use avoids it, and the backup job also keeps it warm |
| Research | User research is observed on Mike's real use: the `activity` log doubles as the research record (what was done, when, by whom). No third-party session-recording tools on real guest data |
| Launch metro | Mike's wedding metro is the first metro the ETL loads (venues, climate, costs, map tiles) |

## 7. Architecture decision records

### ADR-001: Next.js + Supabase over the alternatives
**Status:** Proposed · **Date:** 2026-11-17 · **Deciders:** Mike

**Context.** Free to run, fastest to a working prototype, needs auth, relational data with roles, file storage and live updates.

| Option | Complexity | Cost | Fit | Notes |
|---|---|---|---|---|
| **A. Next.js + Supabase on Vercel** | Low | $0 | High | Postgres fits the relational model (guests ↔ households ↔ events ↔ tables); RLS gives roles for free; huge example base for AI-assisted coding |
| B. Next.js + Cloudflare (Workers, D1, R2) | Medium | $0, generous limits | Medium | Cheapest at scale and commercial-OK free tier, but auth, RLS-style access and realtime must be built by hand |
| C. Firebase | Low | $0 | Medium | Fast start, but document store makes budgets, seating and reports awkward; vendor lock-in |
| D. Native mobile (Expo) + backend | High | $0 + store fees | Medium | Better phone feel, but two surfaces to build before anything works |

**Decision.** Option A. **Consequences:** fastest build, built-in security model. Harder later: Vercel Hobby isn't for commercial use, so the paid agent planner launch means Vercel Pro or a move to Cloudflare (Next.js runs there via OpenNext). Revisit native apps only if the PWA's offline or notification limits bite.

### ADR-002: PWA instead of native apps
**Decision.** Ship a PWA. Install to home screen, offline day-of view, web push (supported on iOS 16.4+ for installed PWAs). **Revisit** if guests or couples need features only native gives (contacts import, robust background sync).

### ADR-003: Rules-based "smart" features first, AI later
**Context.** The AI features are where the paid agent planner lives, and LLM calls cost money.
**Decision.** The free app's smart features (starter checklist, budget split, timeline) come from **templates plus free data**, not an LLM. *Amended in v1.4:* document extraction during onboarding (ADR-005) is the one LLM use in the free app, because reading a binder is the core onboarding promise and can't be done with templates. The agent planner later adds AI on top through the same action layer. **Consequence:** no ongoing AI cost for free users beyond one-time extraction; the free app still feels personalized because inputs (location, date, guest count, culture tags) drive the templates.

### ADR-004: Typed action layer as the single write path
**Decision.** Every mutation goes through a server action in `src/actions/*` with a zod schema, a permission check and an `activity` row. The UI calls them now; the agent planner (and any future public API or MCP server) calls the same functions. **Consequence:** small upfront discipline, no rewrite when the agent arrives.

---

### ADR-005: Claude API for document extraction
**Status:** Proposed · **Date:** 2026-11-19 · **Deciders:** Mike

**Context.** Onboarding reads contracts, receipts, handwritten notes and photos. Needs strong vision and document understanding, reliable JSON, and a provider that won't train on or retain couples' files.

| Option | Quality on messy docs | Cost per binder | Privacy | Effort |
|---|---|---|---|---|
| **A. Claude API (`claude-opus-5-5`, structured outputs)** | High: reads PDFs and images natively, handwriting included | ~$2–$6 | No training on API data by default; zero retention needs a ZDR arrangement | Low |
| B. Open-source OCR (Tesseract) + rules | Poor on photos, handwriting and varied contract layouts | $0 | Best: nothing leaves our servers | High, and accuracy target unlikely |
| C. Cloud OCR/forms services | Good OCR, weak at "what is the deposit and when is it due" | Similar or more | Varies | Medium, plus a second step to interpret |

**Decision.** Option A, with deterministic parsing for spreadsheets and Word files so the model only sees what needs it. *Amended v1.5:* during development the model runs as **Claude Code under Mike's subscription on his own computer** (engine A in section 5a), because subscription credentials can't be used inside the app; the in-app Claude API worker (engine B) is built later, when other couples need it, and Option B (local OCR + rules) becomes engine C, the no-AI fallback. **Consequences:** the free app gets a small per-couple cost and a dependency on one provider, isolated behind `src/lib/extract/` so it can be swapped. **Revisit** the model choice after measuring accuracy and cost on the synthetic twin's documents.

## 7a. Navigation and routes (v1.9)

> **Revised Nov 19 for discovery** ([discovery-proposal.md](../user-flows/discovery-proposal.md), approved by Mike): six pillars with **Explore** second; Vendors renamed **Your vendors**; **Boards** added below the divider. Venues live inside Explore. Discovery rules: no paid ranking, no sponsored results, no lead forms; saving never contacts anyone; every vendor shows budget fit once a price is known.

From the approved navigation ([couple-user-flows.md](../user-flows/couple-user-flows.md) section 5, [navigation-council.md](../user-flows/navigation-council.md)): no bottom tab bar; a menu button opens six pillars (five before the discovery revision) with live status lines; a left rail on desktop.

| Menu item | Route | Status line comes from | Funder sees it? |
|---|---|---|---|
| This week (home) | `/w/[id]` | tasks due, payments due, new RSVPs (next 7 days) | Yes, money items only |
| Explore | `/w/[id]/explore` (Venues, Vendors near you, What things cost, Ideas, Guides) | places index (section 5), local cost ranges | No |
| Budget | `/w/[id]/budget` | `money.ts` → "Still flexible $X" | Yes |
| Guests | `/w/[id]/guests` | RSVP counts | **No** (no guest data, enforced by RLS too) |
| Your vendors | `/w/[id]/vendors` | considering / booked; empty categories link to Explore | No (sees vendor names and payments inside Budget) |
| Plan (incl. The Day) | `/w/[id]/plan`, `/w/[id]/plan/day` | next tasks; The Day becomes its own menu item in the last 3 months | No |
| — divider — | | | |
| Boards | `/w/[id]/boards` | saved ideas and vendors | No |
| Wedding book | `/w/[id]/book` | documents, items waiting for review | No |
| Together | `/w/[id]/together` | partner, funders, roles, activity | Shown as **My contribution** (own entry only) |
| Settings | `/w/[id]/settings` | notifications, export and delete | Yes (own notifications) |
| Help & sample wedding | `/help`, `/sample` | | Yes |

**Shared shell** (`src/app/(app)/w/[weddingId]/layout.tsx`): header with menu button, section name and the **"Still flexible $X"** line (links to Budget; never shows "due"); a **"+" add** button on every screen that opens one add sheet (vendor, quote, payment, guest, task, document); menu items built by one function `menuFor(role, weddingDate)` so funders get the short menu and The Day appears in the final 3 months.

**Partner-activity dot.** `wedding_member.last_seen_activity_at` (timestamp). The dot shows when an `activity` row exists for this wedding with `actor_id` ≠ me, `actor_type = 'user'`, and `created_at > last_seen_activity_at`. Opening Together (or the activity list) updates it. Until Together exists (Milestone 2), Home shows "Since you last looked" and updates it. No counts, never for anything due.

**Home** shows a strip of rows linking to Budget, Guests, Vendors and Plan, each with its status line, above the "This week" feed.

## 8. Repository layout

```
wedding-app/
├─ src/
│  ├─ app/                    # Next.js routes
│  │  ├─ (marketing)/         # landing page (branding thread)
│  │  ├─ (app)/w/[weddingId]/ # shell + this week, budget, guests, vendors, plan (+ day), book, together, settings
│  │  ├─ rsvp/[token]/        # public guest RSVP
│  │  └─ api/cron/            # nightly jobs
│  ├─ actions/                # typed server actions (the action layer)
│  ├─ lib/extract/            # classify + per-type schemas + matcher (provider isolated here)
│  ├─ lib/
│  │  ├─ sources/             # one adapter per live API
│  │  ├─ costModel.ts         # cost range model (shared by onboarding, budget, agent)
│  │  ├─ money.ts             # Planned / Committed / Paid / Funded
│  │  ├─ templates/           # checklist, budget, timeline rules (JSON + TS)
│  │  ├─ db/                  # Supabase clients, generated types
│  │  └─ auth/                # role helpers
│  └─ components/             # shadcn/ui + app components
├─ supabase/migrations/       # SQL schema + RLS policies (PostGIS enabled)
├─ supabase/functions/        # Edge Functions: extraction worker, reminder sender
├─ workers/inbound-email/     # Cloudflare Email Worker (P1)
├─ etl/                       # DuckDB/SQL + scripts, run by .github/workflows/etl.yml
│  ├─ places.sql              # Overture + Foursquare → place
│  ├─ climate.ts, costs.ts, holidays.ts
│  └─ seed/                   # hand-curated CSVs (Knot figures, license rules), sample wedding, synthetic twin's sample documents + expected fields
├─ public/manifest.json, sw   # PWA
└─ docs/architecture.md       # this document
```

---

## 9. Prototype build plan

Each milestone ends with something Mike can click on a live URL.

| # | Milestone | Delivers | Feature-list steps |
|---|---|---|---|
| 0 | **Skeleton** | Repo, Next.js + Tailwind + shadcn, Supabase project (PostGIS on), deployed to Vercel, Sixpence tokens from `branding/tokens.json` mapped to Tailwind + logo/manifest from `branding/logo/web/`, synthetic twin + sample wedding seeds, product_event logging. Seed a small static cost table so onboarding works before the ETL exists | 1 |
| 1 | **Onboarding + plan (F1, part 1)** | Landing + read-only sample wedding, 3-question start with no account, `generatePlan`, sign-in (Google only), `onboarding_state` resume, setup checklist, notification preferences | 3, 4, 5 |
| 1b | **Bring in your wedding book (F1, part 2)** | Uploads, camera scan, paste; spreadsheet import with column mapping; per-type schemas; local Agent SDK worker `worker:local` (engine A); matcher; review queue with confidence and source; "Here's where you stand" summary; extraction eval on synthetic twin docs. In-app Claude API worker (engine B) deferred | 9, 10, 26 |
| E | **Explore, part 1 (discovery P0)** | Places ETL for the launch metro pulled forward from Milestone 7 (Overture + Foursquare OS, wedding-category filter); Explore with Venues, Vendors near you (list + map) and What things cost; budget fit; save to Your vendors (creates a `vendor` row with status `idea`, contacts nobody); routes `/explore/{venues,vendors,cost,ideas,guides}` and `/boards` (user flows F14); budget fit = vendor price (own website or couple's quote) vs the category plan; discovery links in Budget, Plan and empty categories; onboarding style pick. Part 2 (P1): Ideas and Boards (Unsplash/Pexels), Guides, similar vendors. Vendor-claimed profiles are P2 | discovery proposal |
| 2 | **Sharing (F9)** | Invite partner, funder, helper; roles and RLS policies | 1, 2 |
| 3 | **Budget pillar (F3)** | Budget categories with cost ranges, `money.ts` four numbers, contributions | 11 |
| 4 | **Vendors, quotes, payments (F5, F6)** | Vendor tracker with statuses, several quotes per vendor, accept → booked, payment schedule and due dates, document upload | 9, 10, 27 |
| 5 | **Home "This week" (F2)** | Prioritised feed from tasks, payments due and RSVPs; reminder emails, welcome email and nudges (pg_cron + Resend), forward-to-email inbox (P1) | 6 |
| 6 | **Guests + RSVP (F8, F4)** | Households, CSV import with Census batch geocode, per-household tokens and wedding RSVP link with name lookup, per-event RSVPs, guest-count vs budget trade-off | 7, 8 |
| 7 | **Data helpers** | ETL pipeline (places, NOAA, BEA/BLS, holidays) for launch metros; MapLibre discovery map; date helper (weather, sunset, holidays); Geoapify autocomplete; attribution page | 39, 45 (open-data version) |
| 8 | **Checklist polish + P1 flows** | Skipped tasks, comments, activity feed, day-of offline view, seating chart | 13, 14, 30 |

Order follows the user flows thread's section 12 (money first, because it is the product's promise). The real cost-range data (milestone 7) can move earlier if the seeded table feels too thin in testing.

---

## 10. Open items

1. **Repository (blocking for build).** `Schifftacular/Sixpence`, private. Mike is creating it; it then gets added to the project and Milestone 0 starts.
2. **Accounts.** Milestone 0 needs a Vercel account (already connected to this project) and a free Supabase account. Supabase keys go into Vercel env vars, never into chat.
3. **Launch metro.** Settled: Mike's wedding metro first (section 6a). Waiting on the location and date.
4. **User flows.** Done in v1.2: milestones now follow the flows' build order.
5. **Branding.** Done in v1.4: Sixpence tokens and logo files feed Milestone 0.
6. **Region scope.** US-first is now baked in by the data (NOAA, BLS, BEA, Census, The Knot). International needs different cost and climate sources.
7. **Accounts for data.** Free keys needed later: Geoapify, BLS, BEA, Foursquare OS (token), Census (optional). Cloudflare R2 for tiles. An Anthropic API key (server-only secret) only when engine B (in-app Claude API worker) is built; Milestone 1b uses engine A with no key.
8. **AI privacy.** Development: Mike turns off "Help improve Claude" in claude.ai privacy settings before running `worker:local` on real documents. Before engine B serves other couples: confirm Claude API retention terms and whether to request Zero Data Retention.
9. **Sign-in.** Settled: Google only for now; no Apple.
10. **Domain.** Forward-to-email and branded email sending need the Sixpence domain (on Cloudflare for Email Routing).

## Changelog
- 2026-11-19: v1.9, discovery (Mike approved): six pillars with Explore, Your vendors, Boards; new milestone E (Explore P0) right after 1b, pulling the places ETL forward from Milestone 7.
- 2026-11-19: v1.8, Milestone 1 build notes: funder menu is This week, Budget, My contribution, Settings, Help (no Vendors); sign-in Google only in the build plan; API key only for engine B; `log_activity` RPC (activity rows from server actions, editors only); 7a marked under revision for discovery.
- 2026-11-19: v1.7, approved navigation: section 7a route map, funder menu, shared shell with Still flexible line and + button, partner-activity dot via wedding_member.last_seen_activity_at; Money renamed Budget.
- 2026-11-19: v1.6, engine A reworked per Mike: local Agent SDK worker on his computer, signed in with his subscription, pulling his wedding's queued jobs from the app (no interactive skill, no manual upload).
- 2026-11-19: v1.5, Mike's answers: extraction cost approved; dev extraction runs in Claude Code under Mike's subscription on his computer (engine A) because subscription sign-in can't be used inside the app; engines B (Claude API) and C (local OCR) behind one interface; Google-only sign-in; repo Schifftacular/Sixpence.
- 2026-11-19: v1.4, reworked onboarding: document extraction pipeline (section 5a, ADR-005), staging tables, job queue on Supabase pg_cron + Edge Functions (Vercel Hobby cron is daily only), sample wedding, onboarding state, notification prefs, first-party product events, Google/Apple/magic-link sign-in, forward-to-email (P1); Sixpence branding folded in; milestone 1 split into 1 and 1b.
- 2026-11-17: v1.3.1, aligned with user flows section 0: synthetic twin, outbound flag off by default, F0 import with upsert re-import, export and delete.
- 2026-11-17: v1.3, section 6a: build and research on Mike's real wedding; private-data rules, synthetic dev fixture, early import, backups, email allowlist; launch metro = wedding metro.
- 2026-11-17: v1.2, build plan reordered to user flows section 12; data sources folded in: own PostGIS places index from Overture + Foursquare OS (OSM separate), MapLibre + PMTiles on R2, GitHub Actions ETL, cost model tables, NOAA/Open-Meteo climate tables, live adapter list, avoid list, commercial-risk register, launch-metro sizing.
- 2026-11-17: v1.1, user flows additions: `quote` and `contribution` tables, `funder` role, `quoted`/`passed` vendor statuses, `skipped` tasks, estimate flags, plan-before-sign-up, wedding RSVP slug with name lookup, shared money function.
- 2026-11-17: v1, written before sibling thread outputs existed.
