#!/usr/bin/env node
/**
 * Copies MapLibre's web-worker bundle into public/ so it can be served with
 * its original relative file names intact.
 *
 * Why: maplibre-gl v6 spawns a module worker that imports
 * "./maplibre-gl-shared.mjs" relatively. Bundlers (Turbopack included) emit
 * the worker under a hashed asset name, the relative import 404s, and the
 * worker dies silently — GeoJSON layers then never render. The app calls
 * setWorkerUrl("/maplibre/maplibre-gl-worker.mjs") to use these copies
 * instead. Runs automatically via the prebuild/predev npm scripts.
 */
import { copyFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const distDir = join(
  dirname(require.resolve("maplibre-gl/package.json")),
  "dist"
);
const outDir = join(dirname(fileURLToPath(import.meta.url)), "..", "public", "maplibre");

mkdirSync(outDir, { recursive: true });
for (const file of ["maplibre-gl-worker.mjs", "maplibre-gl-shared.mjs"]) {
  copyFileSync(join(distDir, file), join(outDir, file));
}
console.log("Copied MapLibre worker bundle to public/maplibre/");
