"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { NoiseMap, type Report } from "@/components/noise-map";
import { NOISE_LEVELS } from "@/lib/constants";
import { cn } from "@/lib/utils";

type Metric = "street_noise" | "neighbor_noise";

export function MapExplorer() {
  const params = useSearchParams();
  const [state, setState] = useState<
    | { kind: "loading" }
    | { kind: "gated" }
    | { kind: "error" }
    | { kind: "ready"; reports: Report[] }
  >({ kind: "loading" });
  const [metric, setMetric] = useState<Metric>("street_noise");
  const [showFirehouses, setShowFirehouses] = useState(true);
  const [showHospitals, setShowHospitals] = useState(true);

  useEffect(() => {
    fetch("/api/reports")
      .then(async (res) => {
        if (res.status === 403) return setState({ kind: "gated" });
        if (!res.ok) return setState({ kind: "error" });
        const json = await res.json();
        setState({ kind: "ready", reports: json.reports ?? [] });
      })
      .catch(() => setState({ kind: "error" }));
  }, []);

  useEffect(() => {
    if (params.get("welcome") && state.kind === "ready") {
      toast.success("Your dot is on the map. Welcome to the club 🎉", {
        duration: 5000,
      });
    }
  }, [params, state.kind]);

  if (state.kind === "gated") {
    return (
      <main className="night-glow flex min-h-dvh items-center justify-center px-6">
        <div className="max-w-md text-center">
          <div className="text-5xl">🤫</div>
          <h1 className="mt-5 font-display text-3xl font-bold">
            The map unlocks after you chip in
          </h1>
          <p className="mt-3 text-muted-foreground">
            That’s the whole deal: everyone who looks at the data adds to it.
            It takes about 30 seconds and there’s no typing.
          </p>
          <div className="mt-8 flex flex-col items-center gap-3">
            <Button size="lg" asChild>
              <Link href="/rate">Rate my apartment →</Link>
            </Button>
            <Button variant="ghost" asChild>
              <Link href="/">Back home</Link>
            </Button>
          </div>
        </div>
      </main>
    );
  }

  if (state.kind === "error") {
    return (
      <main className="flex min-h-dvh items-center justify-center px-6">
        <div className="text-center">
          <div className="text-4xl">😵</div>
          <p className="mt-4 text-muted-foreground">
            Couldn’t load the map data. Try refreshing?
          </p>
        </div>
      </main>
    );
  }

  const reports = state.kind === "ready" ? state.reports : [];

  return (
    <main className="relative h-dvh w-full overflow-hidden">
      <NoiseMap
        reports={reports}
        metric={metric}
        showFirehouses={showFirehouses}
        showHospitals={showHospitals}
      />

      {/* Top bar */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-start justify-between p-4">
        <Link
          href="/"
          className="pointer-events-auto rounded-xl border border-border/60 bg-background/85 px-3.5 py-2 font-display text-sm font-bold backdrop-blur"
        >
          noise<span className="text-primary">.nyc</span>
        </Link>
        <div className="pointer-events-auto flex flex-col items-end gap-2">
          <Button size="sm" asChild>
            <Link href="/rate">+ Add a report</Link>
          </Button>
        </div>
      </div>

      {/* Controls */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 p-4">
        <div className="pointer-events-auto mx-auto flex max-w-xl flex-col gap-3 rounded-2xl border border-border/60 bg-background/85 p-4 backdrop-blur">
          {/* Metric toggle */}
          <div className="flex items-center gap-2">
            <div className="flex flex-1 rounded-xl bg-secondary p-1">
              {(
                [
                  ["street_noise", "🌃 Street"],
                  ["neighbor_noise", "🧑‍🤝‍🧑 Neighbors"],
                ] as [Metric, string][]
              ).map(([m, label]) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMetric(m)}
                  className={cn(
                    "flex-1 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors cursor-pointer",
                    metric === m
                      ? "bg-background text-foreground shadow"
                      : "text-muted-foreground"
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
            <span className="hidden text-xs text-muted-foreground sm:block">
              {reports.length.toLocaleString()} reports
            </span>
          </div>

          {/* Legend + overlays */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              {NOISE_LEVELS.map((l) => (
                <span key={l.value} className="flex items-center gap-1.5 text-xs">
                  <span
                    className="size-2.5 rounded-full"
                    style={{ backgroundColor: l.color }}
                  />
                  <span className="text-muted-foreground">{l.label}</span>
                </span>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <OverlayChip
                active={showFirehouses}
                onClick={() => setShowFirehouses((v) => !v)}
                color="#a78bfa"
              >
                🚒 Firehouses
              </OverlayChip>
              <OverlayChip
                active={showHospitals}
                onClick={() => setShowHospitals((v) => !v)}
                color="#22d3ee"
              >
                🏥 Hospitals
              </OverlayChip>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

function OverlayChip({
  active,
  onClick,
  color,
  children,
}: {
  active: boolean;
  onClick: () => void;
  color: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all cursor-pointer",
        active
          ? "border-transparent text-foreground"
          : "border-border/70 text-muted-foreground opacity-60"
      )}
      style={active ? { backgroundColor: `${color}26`, borderColor: `${color}66` } : undefined}
    >
      {children}
    </button>
  );
}
