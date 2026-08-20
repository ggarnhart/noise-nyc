import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/lib/supabase";
import { NOISE_LEVELS } from "@/lib/constants";

export const revalidate = 120;

async function getStats() {
  try {
    const { count } = await supabase()
      .from("noise_reports")
      .select("id", { count: "exact", head: true });
    return { count: count ?? 0 };
  } catch {
    return { count: 0 };
  }
}

const steps = [
  {
    emoji: "📍",
    title: "Drop your pin",
    body: "Tap “use my location” or drop a pin on your building. Blur it to the block if you'd rather not say exactly where.",
  },
  {
    emoji: "👆",
    title: "Tap, don't type",
    body: "Rate your street and your neighbors, tap what you hear and when it's worst. About 30 seconds, zero typing.",
  },
  {
    emoji: "🗺️",
    title: "Unlock the map",
    body: "See every block's noise reports, plus the firehouses, hospitals and big roads that explain the 3am sirens.",
  },
];

export default async function Home() {
  const { count } = await getStats();

  return (
    <main className="night-glow flex-1">
      <div className="mx-auto flex min-h-dvh max-w-3xl flex-col px-6 pb-16 pt-10">
        {/* Header */}
        <header className="flex items-center justify-between">
          <span className="font-display text-lg font-bold tracking-tight">
            noise<span className="text-primary">.nyc</span>
          </span>
          <Badge variant="secondary" className="text-xs">
            {count > 0 ? `${count.toLocaleString()} reports and counting` : "brand new"}
          </Badge>
        </header>

        {/* Hero */}
        <section className="flex flex-1 flex-col items-start justify-center py-16">
          <p className="mb-3 text-sm font-medium uppercase tracking-widest text-primary">
            a map of how the city sounds
          </p>
          <h1 className="font-display text-5xl font-bold leading-[1.05] tracking-tight sm:text-6xl">
            How loud is
            <br />
            your block
            <span className="text-primary"> at night?</span>
          </h1>
          <p className="mt-6 max-w-lg text-lg text-muted-foreground">
            Every listing says “quiet, tree-lined street.” Nobody mentions the
            bar downstairs, the M14 bus, or your upstairs neighbor’s 2am
            treadmill habit. So we’re mapping it — one apartment at a time.
          </p>

          <div className="mt-10 flex flex-wrap items-center gap-4">
            <Button size="lg" asChild>
              <Link href="/rate">Rate my apartment · 30 sec</Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/map">Peek at the map</Link>
            </Button>
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            The full map unlocks after you add your own report — that’s the
            deal. 🤝
          </p>

          {/* Noise scale preview */}
          <div className="mt-12 flex w-full max-w-md items-stretch gap-2">
            {NOISE_LEVELS.map((l) => (
              <div
                key={l.value}
                className="flex flex-1 flex-col items-center gap-1.5 rounded-xl border border-border/60 bg-card/60 px-2 py-3 text-center"
              >
                <span className="text-2xl">{l.emoji}</span>
                <span
                  className="h-1.5 w-8 rounded-full"
                  style={{ backgroundColor: l.color }}
                />
                <span className="text-xs font-medium">{l.label}</span>
              </div>
            ))}
          </div>
        </section>

        {/* How it works */}
        <section className="grid gap-4 sm:grid-cols-3">
          {steps.map((s) => (
            <Card key={s.title} className="bg-card/70 py-5">
              <CardContent className="px-5">
                <div className="text-3xl">{s.emoji}</div>
                <h2 className="mt-3 font-display text-base font-semibold">
                  {s.title}
                </h2>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                  {s.body}
                </p>
              </CardContent>
            </Card>
          ))}
        </section>

        {/* Privacy note */}
        <section className="mt-10 rounded-2xl border border-border/60 bg-card/50 p-6">
          <h2 className="font-display text-base font-semibold">
            🕵️ No accounts. No names. No creepiness.
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            We never ask who you are. Unless you opt in to showing your exact
            building, your pin is blurred by about a block and a half before it
            ever touches the database. Reports are anonymous and the data is
            open for anyone who contributes.
          </p>
        </section>

        <footer className="mt-12 flex items-center justify-between text-xs text-muted-foreground">
          <span>Made with 🎧 in the city that never sleeps (audibly).</span>
          <span>
            Map data ©{" "}
            <a
              href="https://www.openstreetmap.org/copyright"
              className="underline hover:text-foreground"
            >
              OpenStreetMap
            </a>
          </span>
        </footer>
      </div>
    </main>
  );
}
