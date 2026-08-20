import type { Metadata } from "next";
import { Suspense } from "react";
import { MapExplorer } from "@/components/map-explorer";

export const metadata: Metadata = {
  title: "The map",
};

export default function MapPage() {
  return (
    <Suspense>
      <MapExplorer />
    </Suspense>
  );
}
