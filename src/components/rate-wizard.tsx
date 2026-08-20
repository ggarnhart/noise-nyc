"use client";

import { useCallback, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { MiniMap } from "@/components/mini-map";
import { cn } from "@/lib/utils";
import {
  FLOOR_BANDS,
  NOISE_LEVELS,
  NOISE_SOURCES,
  WORST_TIMES,
} from "@/lib/constants";

type Coords = { lat: number; lng: number };

const STEPS = ["place", "floor", "street", "neighbors", "sources", "when"] as const;
type Step = (typeof STEPS)[number];

function clientId(): string {
  try {
    const key = "nn-client-id";
    let id = localStorage.getItem(key);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(key, id);
    }
    return id;
  } catch {
    return "unknown";
  }
}

/** Reverse-geocode with NYC Planning Labs GeoSearch (free, no key). */
async function lookupPlace(c: Coords) {
  try {
    const res = await fetch(
      `https://geosearch.planninglabs.nyc/v2/reverse?point.lat=${c.lat}&point.lon=${c.lng}&size=1`
    );
    if (!res.ok) return null;
    const json = await res.json();
    const p = json?.features?.[0]?.properties;
    if (!p) return null;
    return {
      label: [p.name, p.neighbourhood].filter(Boolean).join(" · ") || null,
      neighborhood: p.neighbourhood ?? null,
      borough: p.borough ?? null,
    };
  } catch {
    return null;
  }
}

export function RateWizard() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("place");
  const [coords, setCoords] = useState<Coords | null>(null);
  const [locating, setLocating] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [place, setPlace] = useState<{
    label: string | null;
    neighborhood: string | null;
    borough: string | null;
  } | null>(null);
  const [precise, setPrecise] = useState(false);
  const [floorBand, setFloorBand] = useState<string | null>(null);
  const [streetNoise, setStreetNoise] = useState<number | null>(null);
  const [neighborNoise, setNeighborNoise] = useState<number | null>(null);
  const [sources, setSources] = useState<Set<string>>(new Set());
  const [worstTime, setWorstTime] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const lookupSeq = useRef(0);

  const stepIndex = STEPS.indexOf(step);

  const updateCoords = useCallback((c: Coords) => {
    setCoords(c);
    const seq = ++lookupSeq.current;
    lookupPlace(c).then((p) => {
      if (seq === lookupSeq.current) setPlace(p);
    });
  }, []);

  const locate = () => {
    if (!("geolocation" in navigator)) {
      toast("No location access — drop a pin on the map instead.");
      setShowMap(true);
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        setShowMap(true);
        updateCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      },
      () => {
        setLocating(false);
        setShowMap(true);
        toast("Couldn't get your location — tap the map to drop a pin.");
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  const next = () => setStep(STEPS[Math.min(stepIndex + 1, STEPS.length - 1)]);
  const back = () => setStep(STEPS[Math.max(stepIndex - 1, 0)]);

  // Single-choice steps advance automatically — one tap per screen.
  const pick = <T,>(setter: (v: T) => void) => (v: T) => {
    setter(v);
    setTimeout(next, 220);
  };

  const toggleSource = (slug: string) => {
    setSources((prev) => {
      const s = new Set(prev);
      if (s.has(slug)) s.delete(slug);
      else s.add(slug);
      return s;
    });
  };

  const submit = async () => {
    if (!coords || !streetNoise || !neighborNoise) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lat: coords.lat,
          lng: coords.lng,
          precise,
          borough: place?.borough ?? null,
          neighborhood: place?.neighborhood ?? null,
          floorBand,
          streetNoise,
          neighborNoise,
          noiseSources: [...sources],
          worstTime,
          clientId: clientId(),
        }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => null);
        throw new Error(json?.error ?? "Something went wrong.");
      }
      try {
        localStorage.setItem("nn-contributed", "1");
      } catch {}
      router.push("/map?welcome=1");
    } catch (e) {
      setSubmitting(false);
      toast.error(e instanceof Error ? e.message : "Something went wrong.");
    }
  };

  return (
    <main className="night-glow flex min-h-dvh flex-col">
      <div className="mx-auto flex w-full max-w-xl flex-1 flex-col px-5 pb-10 pt-6">
        {/* Top bar */}
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="font-display text-sm font-bold tracking-tight text-muted-foreground hover:text-foreground"
          >
            noise<span className="text-primary">.nyc</span>
          </Link>
          <div className="flex gap-1.5">
            {STEPS.map((s, i) => (
              <span
                key={s}
                className={cn(
                  "h-1.5 rounded-full transition-all",
                  i === stepIndex ? "w-6 bg-primary" : "w-1.5 bg-secondary",
                  i < stepIndex && "bg-primary/50"
                )}
              />
            ))}
          </div>
        </div>

        {/* ------- Step: place ------- */}
        {step === "place" && (
          <section className="flex flex-1 flex-col pt-8">
            <h1 className="font-display text-3xl font-bold leading-tight">
              Where’s your place? 📍
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              We only need the building. By default we blur your pin by about a
              block and a half before saving it.
            </p>

            {!showMap ? (
              <div className="mt-8 flex flex-col gap-3">
                <Button size="lg" onClick={locate} disabled={locating}>
                  {locating ? "Finding you…" : "📡 Use my location"}
                </Button>
                <Button size="lg" variant="outline" onClick={() => setShowMap(true)}>
                  🗺️ Drop a pin instead
                </Button>
              </div>
            ) : (
              <>
                <MiniMap
                  value={coords}
                  onChange={updateCoords}
                  className="mt-5 h-72 w-full overflow-hidden rounded-2xl border border-border/60"
                />
                <div className="mt-3 min-h-5 text-sm text-muted-foreground">
                  {coords
                    ? place?.label ?? "Pin dropped — drag it to fine-tune."
                    : "Tap the map to drop a pin on your building."}
                </div>
                <div className="mt-4 flex items-center justify-between rounded-xl border border-border/60 bg-card/60 px-4 py-3">
                  <div>
                    <div className="text-sm font-medium">
                      Show my exact building
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Off = blurred to the block. Your call.
                    </div>
                  </div>
                  <Switch checked={precise} onCheckedChange={setPrecise} />
                </div>
                <div className="mt-5 flex gap-3">
                  <Button
                    variant="ghost"
                    onClick={locate}
                    disabled={locating}
                    className="shrink-0"
                  >
                    📡 {locating ? "…" : "Locate me"}
                  </Button>
                  <Button size="lg" className="flex-1" disabled={!coords} onClick={next}>
                    That’s my building →
                  </Button>
                </div>
              </>
            )}
          </section>
        )}

        {/* ------- Step: floor ------- */}
        {step === "floor" && (
          <StepShell
            title="What floor do you live on? 🏢"
            subtitle="Street noise fades (a little) as you go up."
            onBack={back}
            onSkip={next}
          >
            <div className="grid grid-cols-2 gap-3">
              {FLOOR_BANDS.map((f) => (
                <ChoiceButton
                  key={f}
                  selected={floorBand === f}
                  onClick={() => pick(setFloorBand)(f)}
                >
                  <span className="text-2xl">
                    {f === "1" ? "🚪" : f === "2-4" ? "🪜" : f === "5-9" ? "🏙️" : "🕊️"}
                  </span>
                  <span className="font-medium">
                    {f === "1" ? "Ground floor" : `Floor ${f}`}
                  </span>
                </ChoiceButton>
              ))}
            </div>
          </StepShell>
        )}

        {/* ------- Step: street noise ------- */}
        {step === "street" && (
          <StepShell
            title="How's the street at night? 🌃"
            subtitle="Windows closed, trying to sleep. Be honest."
            onBack={back}
          >
            <LevelPicker value={streetNoise} onPick={pick(setStreetNoise)} />
          </StepShell>
        )}

        {/* ------- Step: neighbor noise ------- */}
        {step === "neighbors" && (
          <StepShell
            title="And your neighbors? 🧑‍🤝‍🧑"
            subtitle="Through the walls, the ceiling, the courtyard…"
            onBack={back}
          >
            <LevelPicker value={neighborNoise} onPick={pick(setNeighborNoise)} />
          </StepShell>
        )}

        {/* ------- Step: sources ------- */}
        {step === "sources" && (
          <StepShell
            title="What do you actually hear? 👂"
            subtitle="Tap everything that applies."
            onBack={back}
            onSkip={next}
          >
            <div className="flex flex-wrap gap-2.5">
              {NOISE_SOURCES.map((s) => (
                <button
                  key={s.slug}
                  type="button"
                  onClick={() => toggleSource(s.slug)}
                  className={cn(
                    "flex items-center gap-2 rounded-full border px-4 py-2.5 text-sm font-medium transition-all active:scale-95 cursor-pointer",
                    sources.has(s.slug)
                      ? "border-primary bg-primary/15 text-foreground"
                      : "border-border/70 bg-card/60 text-muted-foreground hover:border-border"
                  )}
                >
                  <span>{s.emoji}</span>
                  {s.label}
                </button>
              ))}
            </div>
            <Button size="lg" className="mt-8 w-full" onClick={next}>
              {sources.size > 0
                ? `That's ${sources.size} thing${sources.size > 1 ? "s" : ""} →`
                : "It's a mystery sound →"}
            </Button>
          </StepShell>
        )}

        {/* ------- Step: worst time + submit ------- */}
        {step === "when" && (
          <StepShell
            title="When is it worst? ⏰"
            subtitle="Last one, promise."
            onBack={back}
          >
            <div className="flex flex-col gap-2.5">
              {WORST_TIMES.map((t) => (
                <button
                  key={t.slug}
                  type="button"
                  onClick={() => setWorstTime(worstTime === t.slug ? null : t.slug)}
                  className={cn(
                    "flex items-center justify-between rounded-xl border px-4 py-3.5 text-left transition-all active:scale-[0.98] cursor-pointer",
                    worstTime === t.slug
                      ? "border-primary bg-primary/15"
                      : "border-border/70 bg-card/60 hover:border-border"
                  )}
                >
                  <span className="flex items-center gap-3 text-sm font-medium">
                    <span className="text-xl">{t.emoji}</span>
                    {t.label}
                  </span>
                  <span className="text-xs text-muted-foreground">{t.hint}</span>
                </button>
              ))}
            </div>
            <Button
              size="lg"
              className="mt-8 w-full"
              onClick={submit}
              disabled={submitting}
            >
              {submitting ? "Adding your dot…" : "Add my dot to the map 🎉"}
            </Button>
          </StepShell>
        )}
      </div>
    </main>
  );
}

function StepShell({
  title,
  subtitle,
  children,
  onBack,
  onSkip,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  onBack: () => void;
  onSkip?: () => void;
}) {
  return (
    <section className="flex flex-1 flex-col pt-8">
      <h1 className="font-display text-3xl font-bold leading-tight">{title}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p>
      <div className="mt-7">{children}</div>
      <div className="mt-auto flex items-center justify-between pt-8">
        <Button variant="ghost" size="sm" onClick={onBack}>
          ← Back
        </Button>
        {onSkip && (
          <Button variant="ghost" size="sm" onClick={onSkip}>
            Skip →
          </Button>
        )}
      </div>
    </section>
  );
}

function ChoiceButton({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex flex-col items-center gap-2 rounded-2xl border px-4 py-5 transition-all active:scale-95 cursor-pointer",
        selected
          ? "border-primary bg-primary/15"
          : "border-border/70 bg-card/60 hover:border-border"
      )}
    >
      {children}
    </button>
  );
}

function LevelPicker({
  value,
  onPick,
}: {
  value: number | null;
  onPick: (v: number) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {NOISE_LEVELS.map((l) => (
        <button
          key={l.value}
          type="button"
          onClick={() => onPick(l.value)}
          className={cn(
            "flex flex-col items-center gap-2 rounded-2xl border px-4 py-6 transition-all active:scale-95 cursor-pointer",
            value === l.value
              ? "border-primary bg-primary/15"
              : "border-border/70 bg-card/60 hover:border-border"
          )}
        >
          <span className="text-4xl">{l.emoji}</span>
          <span
            className="h-1.5 w-10 rounded-full"
            style={{ backgroundColor: l.color }}
          />
          <span className="font-display font-semibold">{l.label}</span>
          <span className="text-xs text-muted-foreground">{l.blurb}</span>
        </button>
      ))}
    </div>
  );
}
