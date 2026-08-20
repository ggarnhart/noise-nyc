#!/usr/bin/env node
/**
 * Regenerates public/data/overlays.geojson from OpenStreetMap via Overpass.
 * Pulls every fire station and hospital in the five boroughs.
 *
 *   npm run fetch:overlays
 *
 * The checked-in file is a hand-curated starter subset; run this locally to
 * replace it with complete, precise OSM data (Overpass isn't reachable from
 * every CI/sandbox environment, which is why the output is committed).
 */
import { writeFileSync } from "node:fs";

const BBOX = "40.4,-74.3,41.0,-73.6"; // south,west,north,east — NYC

const query = `
[out:json][timeout:90];
(
  node["amenity"="fire_station"](${BBOX});
  way["amenity"="fire_station"](${BBOX});
  node["amenity"="hospital"](${BBOX});
  way["amenity"="hospital"](${BBOX});
);
out center tags;
`;

const res = await fetch("https://overpass-api.de/api/interpreter", {
  method: "POST",
  headers: { "Content-Type": "application/x-www-form-urlencoded" },
  body: `data=${encodeURIComponent(query)}`,
});

if (!res.ok) {
  console.error(`Overpass request failed: ${res.status} ${res.statusText}`);
  process.exit(1);
}

const json = await res.json();

const features = json.elements
  .map((el) => {
    const lat = el.lat ?? el.center?.lat;
    const lon = el.lon ?? el.center?.lon;
    if (lat == null || lon == null) return null;
    return {
      type: "Feature",
      geometry: { type: "Point", coordinates: [lon, lat] },
      properties: {
        kind: el.tags?.amenity ?? "unknown",
        name: el.tags?.name ?? null,
      },
    };
  })
  .filter(Boolean);

const fc = {
  type: "FeatureCollection",
  note: `Full OSM extract, fetched ${new Date().toISOString().slice(0, 10)}. Data © OpenStreetMap contributors (ODbL).`,
  features,
};

writeFileSync("public/data/overlays.geojson", JSON.stringify(fc));
console.log(`Wrote ${features.length} features to public/data/overlays.geojson`);
