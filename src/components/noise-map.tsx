"use client";

import { useEffect, useRef } from "react";
import type { Map as MLMap, MapLayerMouseEvent } from "maplibre-gl";
import { DARK_STYLE } from "@/lib/map-style";
import {
  NOISE_SOURCES,
  NYC_BOUNDS,
  NYC_CENTER,
  WORST_TIMES,
  noiseLabel,
} from "@/lib/constants";

export type Report = {
  id: string;
  created_at: string;
  lat: number;
  lng: number;
  borough: string | null;
  neighborhood: string | null;
  floor_band: string | null;
  street_noise: number;
  neighbor_noise: number;
  noise_sources: string[];
  worst_time: string | null;
  is_seed: boolean;
};

type Props = {
  reports: Report[];
  metric: "street_noise" | "neighbor_noise";
  showFirehouses: boolean;
  showHospitals: boolean;
};

const NOISE_COLOR_EXPR = (metric: string) =>
  [
    "match",
    ["get", metric],
    1,
    "#34d399",
    2,
    "#a3e635",
    3,
    "#fb923c",
    4,
    "#f87171",
    "#9ca3af",
  ] as unknown as string;

const sourceLabel = (slug: string) => {
  const s = NOISE_SOURCES.find((x) => x.slug === slug);
  return s ? `${s.emoji} ${s.label}` : null;
};

/** Popup HTML is built exclusively from known vocabulary — no raw user text. */
function popupHtml(r: Report) {
  const street = noiseLabel(r.street_noise);
  const neighbor = noiseLabel(r.neighbor_noise);
  const time = WORST_TIMES.find((t) => t.slug === r.worst_time);
  const srcs = (r.noise_sources ?? [])
    .map(sourceLabel)
    .filter(Boolean)
    .join(" · ");
  const where = [r.neighborhood, r.borough]
    .filter((v): v is string => typeof v === "string")
    .map((v) => v.replace(/[<>&"]/g, ""))
    .join(", ");

  return `
    <div style="min-width:190px">
      <div style="font-weight:600;font-size:13px">${where || "Somewhere in NYC"}</div>
      <div style="margin-top:6px;font-size:13px">🌃 Street: ${street?.emoji ?? ""} ${street?.label ?? "?"}</div>
      <div style="font-size:13px">🧑‍🤝‍🧑 Neighbors: ${neighbor?.emoji ?? ""} ${neighbor?.label ?? "?"}</div>
      ${time ? `<div style="font-size:13px">⏰ Worst: ${time.emoji} ${time.label}</div>` : ""}
      ${r.floor_band ? `<div style="font-size:13px">🏢 Floor: ${r.floor_band}</div>` : ""}
      ${srcs ? `<div style="margin-top:6px;font-size:12px;opacity:.75">${srcs}</div>` : ""}
      ${r.is_seed ? `<div style="margin-top:6px;font-size:11px;opacity:.55">demo data point</div>` : ""}
    </div>`;
}

export function NoiseMap({ reports, metric, showFirehouses, showHospitals }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MLMap | null>(null);
  const readyRef = useRef(false);

  // Init once
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const maplibregl = await import("maplibre-gl");
      if (cancelled || !containerRef.current || mapRef.current) return;

      const map = new maplibregl.Map({
        container: containerRef.current,
        style: DARK_STYLE,
        center: NYC_CENTER,
        zoom: 10.7,
        maxBounds: [
          [NYC_BOUNDS.minLng - 0.35, NYC_BOUNDS.minLat - 0.2],
          [NYC_BOUNDS.maxLng + 0.35, NYC_BOUNDS.maxLat + 0.2],
        ],
        attributionControl: { compact: true },
      });
      mapRef.current = map;
      map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");

      map.on("load", async () => {
        // Reports layer
        map.addSource("reports", {
          type: "geojson",
          data: { type: "FeatureCollection", features: [] },
        });
        map.addLayer({
          id: "reports-glow",
          type: "circle",
          source: "reports",
          paint: {
            "circle-radius": ["interpolate", ["linear"], ["zoom"], 9, 6, 14, 16],
            "circle-color": NOISE_COLOR_EXPR(metric),
            "circle-opacity": 0.18,
            "circle-blur": 0.8,
          },
        });
        map.addLayer({
          id: "reports-dots",
          type: "circle",
          source: "reports",
          paint: {
            "circle-radius": ["interpolate", ["linear"], ["zoom"], 9, 3.5, 14, 8],
            "circle-color": NOISE_COLOR_EXPR(metric),
            "circle-opacity": 0.92,
            "circle-stroke-width": 1,
            "circle-stroke-color": "rgba(10,12,22,.9)",
          },
        });

        // OSM-derived overlays: firehouses & hospitals (static file)
        try {
          const res = await fetch("/data/overlays.geojson");
          if (res.ok) {
            const geo = await res.json();
            map.addSource("overlays", { type: "geojson", data: geo });
            map.addLayer({
              id: "firehouses",
              type: "circle",
              source: "overlays",
              filter: ["==", ["get", "kind"], "fire_station"],
              paint: {
                "circle-radius": ["interpolate", ["linear"], ["zoom"], 9, 3, 14, 7],
                "circle-color": "#a78bfa",
                "circle-opacity": 0.9,
                "circle-stroke-width": 1.5,
                "circle-stroke-color": "rgba(10,12,22,.9)",
              },
            });
            map.addLayer({
              id: "hospitals",
              type: "circle",
              source: "overlays",
              filter: ["==", ["get", "kind"], "hospital"],
              paint: {
                "circle-radius": ["interpolate", ["linear"], ["zoom"], 9, 3, 14, 7],
                "circle-color": "#22d3ee",
                "circle-opacity": 0.9,
                "circle-stroke-width": 1.5,
                "circle-stroke-color": "rgba(10,12,22,.9)",
              },
            });

            for (const layer of ["firehouses", "hospitals"]) {
              map.on("click", layer, (e: MapLayerMouseEvent) => {
                const f = e.features?.[0];
                if (!f) return;
                const name = String(f.properties?.name ?? "").replace(/[<>&"]/g, "");
                const kind =
                  f.properties?.kind === "hospital" ? "🏥 Hospital" : "🚒 Firehouse";
                new maplibregl.Popup({ closeButton: false })
                  .setLngLat(e.lngLat)
                  .setHTML(
                    `<div style="font-size:13px"><b>${kind}</b><br/>${name || "(unnamed)"}<br/><span style="opacity:.6;font-size:11px">a reliable source of sirens</span></div>`
                  )
                  .addTo(map);
              });
              map.on("mouseenter", layer, () => (map.getCanvas().style.cursor = "pointer"));
              map.on("mouseleave", layer, () => (map.getCanvas().style.cursor = ""));
            }
          }
        } catch {
          // overlays are decorative — fine to skip if missing
        }

        map.on("click", "reports-dots", (e: MapLayerMouseEvent) => {
          const f = e.features?.[0];
          if (!f) return;
          const props = f.properties as Record<string, unknown>;
          const report = {
            ...props,
            noise_sources:
              typeof props.noise_sources === "string"
                ? JSON.parse(props.noise_sources as string)
                : props.noise_sources ?? [],
            is_seed: props.is_seed === true || props.is_seed === "true",
          } as Report;
          new maplibregl.Popup({ closeButton: false })
            .setLngLat(e.lngLat)
            .setHTML(popupHtml(report))
            .addTo(map);
        });
        map.on("mouseenter", "reports-dots", () => (map.getCanvas().style.cursor = "pointer"));
        map.on("mouseleave", "reports-dots", () => (map.getCanvas().style.cursor = ""));

        readyRef.current = true;
        syncData(map, reports);
        syncVisibility(map, showFirehouses, showHospitals);
      });
    })();

    return () => {
      cancelled = true;
      readyRef.current = false;
      mapRef.current?.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync data
  useEffect(() => {
    const map = mapRef.current;
    if (map && readyRef.current) syncData(map, reports);
  }, [reports]);

  // Sync metric coloring
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !readyRef.current) return;
    map.setPaintProperty("reports-dots", "circle-color", NOISE_COLOR_EXPR(metric));
    map.setPaintProperty("reports-glow", "circle-color", NOISE_COLOR_EXPR(metric));
  }, [metric]);

  // Sync overlay visibility
  useEffect(() => {
    const map = mapRef.current;
    if (map && readyRef.current) syncVisibility(map, showFirehouses, showHospitals);
  }, [showFirehouses, showHospitals]);

  return <div ref={containerRef} className="absolute inset-0" />;
}

function syncData(map: MLMap, reports: Report[]) {
  const src = map.getSource("reports") as import("maplibre-gl").GeoJSONSource | undefined;
  src?.setData({
    type: "FeatureCollection",
    features: reports.map((r) => ({
      type: "Feature" as const,
      geometry: { type: "Point" as const, coordinates: [r.lng, r.lat] },
      properties: { ...r },
    })),
  });
}

function syncVisibility(map: MLMap, fire: boolean, hosp: boolean) {
  if (map.getLayer("firehouses"))
    map.setLayoutProperty("firehouses", "visibility", fire ? "visible" : "none");
  if (map.getLayer("hospitals"))
    map.setLayoutProperty("hospitals", "visibility", hosp ? "visible" : "none");
}
