-- noise.nyc — crowd-sourced apartment noise reports
-- (Already applied to the live Supabase project; kept here as the source of truth.)
create extension if not exists pgcrypto;

create table public.noise_reports (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),

  -- Location. If the reporter did not consent to sharing their exact
  -- building, coordinates are fuzzed (~150m) server-side BEFORE insert.
  lat double precision not null check (lat between 40.4 and 41.0),
  lng double precision not null check (lng between -74.3 and -73.6),
  location_precise boolean not null default false,

  borough text,
  neighborhood text,

  -- Which floor the apartment is on (rough band — affects street noise a lot)
  floor_band text check (floor_band in ('1','2-4','5-9','10+')),

  -- 1 = silent, 2 = fine, 3 = loud, 4 = can't sleep
  street_noise smallint not null check (street_noise between 1 and 4),
  neighbor_noise smallint not null check (neighbor_noise between 1 and 4),

  -- What the reporter hears (traffic, sirens, nightlife, construction, ...)
  noise_sources text[] not null default '{}',

  -- When it's worst
  worst_time text check (worst_time in ('early_morning','daytime','evening','late_night','all_day')),

  -- Anonymous per-device id (random uuid minted client-side) for dedupe
  client_id text,

  -- Demo rows seeded by the project, filterable out of real analysis
  is_seed boolean not null default false
);

create index noise_reports_created_at_idx on public.noise_reports (created_at desc);
create index noise_reports_lat_lng_idx on public.noise_reports (lat, lng);

alter table public.noise_reports enable row level security;

create policy "public read" on public.noise_reports
  for select using (true);

create policy "public insert" on public.noise_reports
  for insert with check (true);
