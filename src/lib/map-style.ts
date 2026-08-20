import type { StyleSpecification } from "maplibre-gl";

/**
 * Point MapLibre at the worker files copied into public/maplibre/ by
 * scripts/copy-maplibre-worker.mjs. The bundler-emitted worker asset breaks
 * its relative import of maplibre-gl-shared.mjs (hashed file names), which
 * kills the worker and silently blanks every GeoJSON layer. Call before the
 * first Map is constructed.
 */
let workerConfigured = false;
export function configureMapLibreWorker(
  setWorkerUrl: (url: string) => void
): void {
  if (workerConfigured) return;
  workerConfigured = true;
  setWorkerUrl("/maplibre/maplibre-gl-worker.mjs");
}

/**
 * Dark raster basemap from CARTO (free tier, attribution required).
 * Big roads, parks and water read clearly at night — exactly the context
 * you want when judging why a block is loud.
 */
export const DARK_STYLE: StyleSpecification = {
  version: 8,
  sources: {
    carto: {
      type: "raster",
      tiles: [
        "https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png",
        "https://b.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png",
        "https://c.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png",
        "https://d.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png",
      ],
      tileSize: 256,
      attribution:
        '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors © <a href="https://carto.com/attributions">CARTO</a>',
    },
  },
  layers: [{ id: "carto", type: "raster", source: "carto" }],
};
