import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import {
  CONTRIBUTED_COOKIE,
  FLOOR_BANDS,
  NOISE_SOURCES,
  NYC_BOUNDS,
  WORST_TIMES,
} from "@/lib/constants";

export const dynamic = "force-dynamic";

const SELECT_COLUMNS =
  "id, created_at, lat, lng, borough, neighborhood, floor_band, street_noise, neighbor_noise, noise_sources, worst_time, is_seed";

/**
 * The map data is "gated": you see it after you've added your own report.
 * The gate is a long-lived cookie set by a successful POST. It's a social
 * contract, not a security boundary — the point is nudging contribution.
 */
export async function GET() {
  const jar = await cookies();
  if (!jar.get(CONTRIBUTED_COOKIE)) {
    return NextResponse.json(
      { gated: true, message: "Add your own report to unlock the map." },
      { status: 403 }
    );
  }

  const { data, error } = await supabase()
    .from("noise_reports")
    .select(SELECT_COLUMNS)
    .order("created_at", { ascending: false })
    .limit(5000);

  if (error) {
    return NextResponse.json({ error: "Could not load reports." }, { status: 500 });
  }

  return NextResponse.json({ reports: data });
}

type ReportBody = {
  lat?: number;
  lng?: number;
  precise?: boolean;
  borough?: string | null;
  neighborhood?: string | null;
  floorBand?: string | null;
  streetNoise?: number;
  neighborNoise?: number;
  noiseSources?: string[];
  worstTime?: string | null;
  clientId?: string | null;
};

const VALID_SOURCES = new Set(NOISE_SOURCES.map((s) => s.slug));
const VALID_TIMES = new Set(WORST_TIMES.map((t) => t.slug));
const VALID_FLOORS = new Set<string>(FLOOR_BANDS);

const isLevel = (n: unknown): n is number =>
  typeof n === "number" && Number.isInteger(n) && n >= 1 && n <= 4;

/** ~150m of random offset so imprecise reports never pin an exact building. */
function fuzz(coord: number) {
  return coord + (Math.random() - 0.5) * 0.003;
}

export async function POST(req: NextRequest) {
  let body: ReportBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const { lat, lng } = body;
  if (
    typeof lat !== "number" ||
    typeof lng !== "number" ||
    lat < NYC_BOUNDS.minLat ||
    lat > NYC_BOUNDS.maxLat ||
    lng < NYC_BOUNDS.minLng ||
    lng > NYC_BOUNDS.maxLng
  ) {
    return NextResponse.json(
      { error: "That spot doesn't look like it's in New York City." },
      { status: 400 }
    );
  }

  if (!isLevel(body.streetNoise) || !isLevel(body.neighborNoise)) {
    return NextResponse.json(
      { error: "Street and neighbor noise ratings are required." },
      { status: 400 }
    );
  }

  const sources = Array.isArray(body.noiseSources)
    ? body.noiseSources.filter((s) => VALID_SOURCES.has(s)).slice(0, 12)
    : [];

  const precise = body.precise === true;

  const row = {
    lat: precise ? lat : fuzz(lat),
    lng: precise ? lng : fuzz(lng),
    location_precise: precise,
    borough:
      typeof body.borough === "string" ? body.borough.slice(0, 40) : null,
    neighborhood:
      typeof body.neighborhood === "string"
        ? body.neighborhood.slice(0, 60)
        : null,
    floor_band:
      typeof body.floorBand === "string" && VALID_FLOORS.has(body.floorBand)
        ? body.floorBand
        : null,
    street_noise: body.streetNoise,
    neighbor_noise: body.neighborNoise,
    noise_sources: sources,
    worst_time:
      typeof body.worstTime === "string" && VALID_TIMES.has(body.worstTime)
        ? body.worstTime
        : null,
    client_id:
      typeof body.clientId === "string" ? body.clientId.slice(0, 64) : null,
  };

  const { data, error } = await supabase()
    .from("noise_reports")
    .insert(row)
    .select("id")
    .single();

  if (error) {
    return NextResponse.json(
      { error: "Could not save your report. Try again in a moment." },
      { status: 500 }
    );
  }

  const res = NextResponse.json({ ok: true, id: data.id }, { status: 201 });
  res.cookies.set(CONTRIBUTED_COOKIE, "1", {
    maxAge: 60 * 60 * 24 * 365,
    path: "/",
    sameSite: "lax",
  });
  return res;
}
