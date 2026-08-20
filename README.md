# noise.nyc 🎧🌃

A crowd-sourced map of apartment noise in New York City. Rate your place in
~30 seconds — no typing, just tapping — and unlock a map of how every block
sounds at night: street noise, neighbor noise, what people hear, and when
it's worst. Plus the firehouses and hospitals that explain the 3am sirens.

## How it works

1. **Landing page** (`/`) explains the deal: everyone who views the data adds
   to it first.
2. **Survey** (`/rate`) is a tap-only, phone-first wizard:
   - drop a pin (geolocation or tap the map — no address typing)
   - optional privacy toggle: exact building vs. blurred ~150m (default: blurred)
   - floor band, street noise (1–4), neighbor noise (1–4), noise sources,
     worst time of day
3. **Map** (`/map`) unlocks after a successful submission (a long-lived
   cookie). Dots are colored green → red by noise level, toggleable between
   street and neighbor noise, with firehouse/hospital overlays from
   OpenStreetMap.

The gate is a nudge, not a security boundary — the point is reciprocity.

## Stack

- **Next.js 16** (App Router) + **Tailwind 4** + shadcn-style components
  (vendored in `src/components/ui` — the shadcn registry wasn't reachable
  from the build sandbox, so the standard components are committed directly;
  `components.json` is set up so `npx shadcn add <component>` works normally)
- **MapLibre GL** with CARTO dark basemap tiles (free tier, attribution included)
- **Supabase (Postgres)** for storage, with RLS
- Reverse geocoding via [NYC Planning Labs GeoSearch](https://geosearch.planninglabs.nyc)
  (free, no key, NYC-specific) — client-side only

## Database

The app is wired to a live Supabase project (`noise-nyc` in the GSweet org,
project ref `hdcdxblkpxbhtozodcul`) and works with zero configuration. The
URL and key baked into `src/lib/supabase.ts` are the *publishable* pair —
they ship in every Supabase app's client bundle; access control lives in
Postgres RLS.

- Canonical schema: [`supabase/migrations/20260820000000_init_noise_reports.sql`](supabase/migrations/20260820000000_init_noise_reports.sql)
  (already applied to the live project)
- MySQL 8 port, if you ever switch: [`db/schema.mysql.sql`](db/schema.mysql.sql)
- ~15 seed rows are marked `is_seed = true` so the map isn't empty on day
  one; filter them out of any real analysis (they show as "demo data point"
  in map popups).

To point at your own instance, set `SUPABASE_URL` and
`SUPABASE_PUBLISHABLE_KEY` (see `.env.example`) and apply the migration.

## Development

```bash
npm install
npm run dev
```

Note: the survey posts through `/api/reports`, which validates input
server-side, fuzzes non-consented coordinates before insert, and sets the
map-unlock cookie on success.

## Deployment (Railway)

Railway detects Next.js and deploys on push — no GitHub Action needed
(`railway.json` pins the build/start commands; `.github/workflows/ci.yml`
runs lint + build checks on every push as a safety net).

1. [railway.app](https://railway.app) → New Project → Deploy from GitHub repo → pick this repo
2. That's it. Optionally set `SUPABASE_URL` / `SUPABASE_PUBLISHABLE_KEY` to
   override the defaults.

The app is a standard Node Next.js server, so Vercel, Fly, or Cloudflare
Workers (via `@opennextjs/cloudflare`) all work too.

## OSM overlays

`public/data/overlays.geojson` holds firehouse + hospital points shown on
the map. The committed file is a hand-curated starter subset (~54 landmarks,
block-level accuracy) because the Overpass API wasn't reachable from the
build environment. To replace it with the complete, precise OSM dataset:

```bash
npm run fetch:overlays
```

Map data © OpenStreetMap contributors (ODbL), basemap © CARTO.

## Privacy

- No accounts, no names, no emails.
- Exact coordinates are stored only when the reporter flips the
  "show my exact building" switch; otherwise the pin is randomized ~150m
  **before** it reaches the database.
- A random client-side UUID (no fingerprinting) tags submissions for
  future dedupe/rate-limiting.
