/** Shared vocabulary for the survey and the map. Slugs match DB check constraints. */

export type NoiseLevel = 1 | 2 | 3 | 4;

export const NOISE_LEVELS: {
  value: NoiseLevel;
  label: string;
  emoji: string;
  blurb: string;
  color: string;
}[] = [
  { value: 1, label: "Silent", emoji: "😴", blurb: "blissfully quiet", color: "#34d399" },
  { value: 2, label: "Fine", emoji: "🙂", blurb: "some noise, sleepable", color: "#a3e635" },
  { value: 3, label: "Loud", emoji: "😑", blurb: "regularly annoying", color: "#fb923c" },
  { value: 4, label: "Can't sleep", emoji: "🤯", blurb: "genuinely disruptive", color: "#f87171" },
];

export const NOISE_SOURCES: { slug: string; label: string; emoji: string }[] = [
  { slug: "traffic", label: "Traffic", emoji: "🚗" },
  { slug: "honking", label: "Honking", emoji: "📣" },
  { slug: "sirens", label: "Sirens", emoji: "🚨" },
  { slug: "nightlife", label: "Bars & nightlife", emoji: "🍻" },
  { slug: "people_outside", label: "People outside", emoji: "🗣️" },
  { slug: "construction", label: "Construction", emoji: "🚧" },
  { slug: "garbage_trucks", label: "Garbage trucks", emoji: "🗑️" },
  { slug: "neighbors_music", label: "Neighbors' music / TV", emoji: "🔊" },
  { slug: "footsteps", label: "Footsteps upstairs", emoji: "🐘" },
  { slug: "dogs", label: "Dogs", emoji: "🐕" },
  { slug: "trains", label: "Subway / trains", emoji: "🚇" },
  { slug: "airplanes", label: "Airplanes", emoji: "✈️" },
];

export const WORST_TIMES: {
  slug: string;
  label: string;
  emoji: string;
  hint: string;
}[] = [
  { slug: "early_morning", label: "Early morning", emoji: "🌅", hint: "5–9am" },
  { slug: "daytime", label: "Daytime", emoji: "☀️", hint: "9am–5pm" },
  { slug: "evening", label: "Evening", emoji: "🌆", hint: "5–10pm" },
  { slug: "late_night", label: "Late night", emoji: "🌙", hint: "10pm–5am" },
  { slug: "all_day", label: "All day", emoji: "🔁", hint: "no breaks" },
];

export const FLOOR_BANDS = ["1", "2-4", "5-9", "10+"] as const;

/** NYC bounding box used for validation and the map's max bounds. */
export const NYC_BOUNDS = {
  minLat: 40.4,
  maxLat: 41.0,
  minLng: -74.3,
  maxLng: -73.6,
};

export const NYC_CENTER: [number, number] = [-73.955, 40.72];

export const CONTRIBUTED_COOKIE = "nn-contributed";

export const noiseColor = (level: number) =>
  NOISE_LEVELS.find((l) => l.value === level)?.color ?? "#9ca3af";

export const noiseLabel = (level: number) =>
  NOISE_LEVELS.find((l) => l.value === level);
