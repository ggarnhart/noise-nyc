"use client";

import { useEffect, useRef } from "react";
import type { Map as MLMap, Marker } from "maplibre-gl";
import { configureMapLibreWorker, DARK_STYLE } from "@/lib/map-style";
import { NYC_BOUNDS, NYC_CENTER } from "@/lib/constants";

type Props = {
  value: { lat: number; lng: number } | null;
  onChange: (coords: { lat: number; lng: number }) => void;
  className?: string;
};

/**
 * Small tap-to-place map used in the survey. Tap anywhere to drop the pin,
 * drag the pin to fine-tune. No typing involved.
 */
export function MiniMap({ value, onChange, className }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MLMap | null>(null);
  const markerRef = useRef<Marker | null>(null);
  const onChangeRef = useRef(onChange);
  const valueRef = useRef(value);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const maplibregl = await import("maplibre-gl");
      if (cancelled || !containerRef.current || mapRef.current) return;
      configureMapLibreWorker(maplibregl.setWorkerUrl);

      const initial = valueRef.current;
      const map = new maplibregl.Map({
        container: containerRef.current,
        style: DARK_STYLE,
        center: initial ? [initial.lng, initial.lat] : NYC_CENTER,
        zoom: initial ? 15 : 10.5,
        maxBounds: [
          [NYC_BOUNDS.minLng - 0.2, NYC_BOUNDS.minLat - 0.2],
          [NYC_BOUNDS.maxLng + 0.2, NYC_BOUNDS.maxLat + 0.2],
        ],
        attributionControl: { compact: true },
      });
      mapRef.current = map;

      const placeMarker = (lng: number, lat: number) => {
        const existing = markerRef.current;
        if (existing) {
          existing.setLngLat([lng, lat]);
          return;
        }
        const marker = new maplibregl.Marker({
          color: "#fbbf24",
          draggable: true,
        })
          .setLngLat([lng, lat])
          .addTo(map);
        marker.on("dragend", () => {
          const pos = marker.getLngLat();
          onChangeRef.current({ lat: pos.lat, lng: pos.lng });
        });
        markerRef.current = marker;
      };

      if (initial) placeMarker(initial.lng, initial.lat);

      map.on("click", (e) => {
        placeMarker(e.lngLat.lng, e.lngLat.lat);
        onChangeRef.current({ lat: e.lngLat.lat, lng: e.lngLat.lng });
      });

      // Expose for the value-sync effect below
      placeMarkerRef.current = placeMarker;
    })();

    return () => {
      cancelled = true;
      placeMarkerRef.current = null;
      markerRef.current = null;
      mapRef.current?.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const placeMarkerRef = useRef<((lng: number, lat: number) => void) | null>(
    null
  );

  // Keep marker + camera in sync when coords change externally (geolocation)
  useEffect(() => {
    valueRef.current = value;
    const map = mapRef.current;
    if (!map || !value) return;
    placeMarkerRef.current?.(value.lng, value.lat);
    map.easeTo({
      center: [value.lng, value.lat],
      zoom: Math.max(map.getZoom(), 15),
    });
  }, [value]);

  return <div ref={containerRef} className={className} />;
}
