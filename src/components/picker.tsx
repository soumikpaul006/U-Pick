"use client";

import { useRef, useState } from "react";
import {
  Dices,
  LoaderCircle,
  LocateFixed,
  MapPin,
  Trophy,
  type LucideIcon,
} from "lucide-react";
import {
  RestaurantCard,
  RestaurantCardSkeleton,
} from "@/components/restaurant-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";
import {
  CUISINES,
  DIETS,
  type Cuisine,
  type Diet,
  type PickResponse,
  type Price,
  type Restaurant,
} from "@/lib/types";

const METERS_PER_MILE = 1609.344;

const RADII = [
  { value: "1", label: "1 mile" },
  { value: "2", label: "2 miles" },
  { value: "5", label: "5 miles" },
  { value: "10", label: "10 miles" },
  { value: "20", label: "20 miles" },
];

const RADIUS_ITEMS = RADII.map((o) => ({ value: o.value, label: `Within ${o.label}` }));

const PRICE_OPTIONS: { value: Price | "any"; label: string }[] = [
  { value: "any", label: "Any" },
  { value: "low", label: "$" },
  { value: "medium", label: "$$" },
  { value: "high", label: "$$$" },
];

const CUISINE_EMOJI: Record<Cuisine, string> = {
  Asian: "🥢",
  Chinese: "🥡",
  Japanese: "🍣",
  Korean: "🍲",
  Thai: "🍜",
  Indian: "🍛",
  Italian: "🍝",
  Mexican: "🌮",
  American: "🍔",
  Mediterranean: "🥙",
  "Middle Eastern": "🧆",
  French: "🥐",
};

const DIET_EMOJI: Record<Diet, string> = {
  Vegan: "🌱",
  Vegetarian: "🥗",
  Keto: "🥑",
  "Gluten-free": "🌾",
  Halal: "🍖",
};

type Mode = "one" | "top5";
type Coords = { lat: number; lng: number };

/** Selected chips need to be unmistakable; the stock toggle only tints them. */
const chip =
  "rounded-full! px-3.5 aria-pressed:border-primary aria-pressed:bg-primary aria-pressed:text-primary-foreground aria-pressed:shadow-sm data-pressed:border-primary data-pressed:bg-primary data-pressed:text-primary-foreground";

function Section({
  step,
  title,
  hint,
  children,
}: {
  step: number;
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-baseline gap-2.5">
        <span className="flex size-6 shrink-0 items-center justify-center self-center rounded-full bg-primary/10 text-xs font-bold text-primary">
          {step}
        </span>
        <h2 className="text-base font-semibold">{title}</h2>
        {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
      </div>
      {children}
    </section>
  );
}

function ModeCard({
  active,
  onClick,
  icon: Icon,
  title,
  subtitle,
}: {
  active: boolean;
  onClick: () => void;
  icon: LucideIcon;
  title: string;
  subtitle: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 rounded-xl border p-3.5 text-left transition-all outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
        active
          ? "border-primary bg-primary/10 shadow-sm ring-1 ring-primary"
          : "bg-card hover:border-primary/40 hover:bg-muted/60",
      )}
    >
      <span
        className={cn(
          "flex size-10 shrink-0 items-center justify-center rounded-lg",
          active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
        )}
      >
        <Icon className="size-5" />
      </span>
      <span className="flex flex-col">
        <span className="font-semibold">{title}</span>
        <span className="text-xs text-muted-foreground">{subtitle}</span>
      </span>
    </button>
  );
}

export function Picker() {
  const [cuisines, setCuisines] = useState<Cuisine[]>([]);
  const [diets, setDiets] = useState<Diet[]>([]);
  const [price, setPrice] = useState<Price | "any">("any");
  const [radius, setRadius] = useState("2");
  const [mode, setMode] = useState<Mode>("one");
  const [openNow, setOpenNow] = useState(true);
  const [address, setAddress] = useState("");
  const [coords, setCoords] = useState<Coords | null>(null);
  const [locating, setLocating] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<Restaurant[]>([]);
  const [resultsMode, setResultsMode] = useState<Mode>("one");
  const [empty, setEmpty] = useState(false);
  const [seen, setSeen] = useState<string[]>([]);
  const resultsRef = useRef<HTMLDivElement>(null);

  function useMyLocation() {
    if (!navigator.geolocation) {
      setError("Geolocation isn't supported. Type an address instead.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setAddress("");
        setError(null);
        setLocating(false);
      },
      () => {
        setError("Couldn't get your location. Type an address instead.");
        setLocating(false);
      },
      { timeout: 10000 },
    );
  }

  async function pick(exclude: string[]) {
    const trimmed = address.trim();
    if (!coords && !trimmed) {
      setError("Share your location or type an address first.");
      return;
    }
    setLoading(true);
    setError(null);
    setEmpty(false);
    setResults([]);
    requestAnimationFrame(() =>
      resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }),
    );
    try {
      const res = await fetch("/api/pick", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          location: trimmed ? { address: trimmed } : coords,
          cuisines,
          diets,
          price,
          radiusMeters: Math.round(Number(radius) * METERS_PER_MILE),
          openNow,
          count: mode === "top5" ? 5 : 1,
          excludeIds: exclude,
        }),
      });
      const data: PickResponse & { error?: string } = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Request failed");
      if (!data.restaurants.length) {
        setEmpty(true);
        return;
      }
      setResults(data.restaurants);
      setResultsMode(mode);
      setSeen([...exclude, ...data.restaurants.map((r) => r.id)]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  const ctaLabel = mode === "top5" ? "Find my top 5" : "Pick a restaurant for me";

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 pt-12 pb-16">
      <header className="flex flex-col items-center gap-3 text-center">
        <span
          role="img"
          aria-label="upick logo"
          className="flex size-20 items-center justify-center rounded-3xl bg-gradient-to-br from-primary to-rose-500 text-5xl shadow-lg shadow-primary/30"
        >
          🫵
        </span>
        <h1 className="bg-gradient-to-r from-primary to-rose-500 bg-clip-text text-5xl font-extrabold tracking-tight text-transparent">
          upick
        </h1>
        <p className="max-w-md text-lg text-muted-foreground">
          Can&apos;t decide where to eat? Tell us your mood and we&apos;ll choose for you.
        </p>
      </header>

      <div className="flex flex-col gap-7 rounded-3xl border bg-card/90 p-6 shadow-xl shadow-primary/5 ring-1 ring-foreground/5 backdrop-blur sm:p-8">
        <Section step={1} title="Where are you?">
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative flex-1">
              <MapPin className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="address"
                aria-label="Address or zip code"
                className="h-10 pl-9"
                placeholder={coords ? "Using your current location" : "Address or zip code"}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />
            </div>
            <Button
              variant={coords && !address ? "secondary" : "outline"}
              size="lg"
              onClick={useMyLocation}
              disabled={locating}
            >
              {locating ? (
                <LoaderCircle className="animate-spin" data-icon="inline-start" />
              ) : (
                <LocateFixed data-icon="inline-start" />
              )}
              {locating ? "Locating…" : coords && !address ? "Located ✓" : "Use my location"}
            </Button>
          </div>
        </Section>

        <Section step={2} title="Craving" hint="optional · pick any">
          <ToggleGroup
            multiple
            variant="outline"
            className="flex-wrap"
            value={cuisines}
            onValueChange={(v) => setCuisines(v as Cuisine[])}
          >
            {CUISINES.map((c) => (
              <ToggleGroupItem key={c} value={c} className={chip}>
                <span aria-hidden>{CUISINE_EMOJI[c]}</span>
                {c}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </Section>

        <Section step={3} title="Dietary needs" hint="keyword-based, so double-check the menu">
          <ToggleGroup
            multiple
            variant="outline"
            className="flex-wrap"
            value={diets}
            onValueChange={(v) => setDiets(v as Diet[])}
          >
            {DIETS.map((d) => (
              <ToggleGroupItem key={d} value={d} className={chip}>
                <span aria-hidden>{DIET_EMOJI[d]}</span>
                {d}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </Section>

        <div className="grid gap-7 sm:grid-cols-2">
          <Section step={4} title="Budget">
            <ToggleGroup
              variant="outline"
              className="flex-wrap"
              value={[price]}
              onValueChange={(v) => v[0] && setPrice(v[0] as Price | "any")}
            >
              {PRICE_OPTIONS.map((o) => (
                <ToggleGroupItem key={o.value} value={o.value} className={chip}>
                  {o.label}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </Section>

          <Section step={5} title="How far?">
            <Select
              items={RADIUS_ITEMS}
              value={radius}
              onValueChange={(v) => v && setRadius(v)}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {RADIUS_ITEMS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Section>
        </div>

        <label className="flex cursor-pointer items-center gap-2.5 text-sm font-medium select-none">
          <input
            type="checkbox"
            className="size-4 accent-primary"
            checked={openNow}
            onChange={(e) => setOpenNow(e.target.checked)}
          />
          Only show places that are open now
        </label>

        <Section step={6} title="How many options?">
          <div className="grid gap-3 sm:grid-cols-2">
            <ModeCard
              active={mode === "one"}
              onClick={() => setMode("one")}
              icon={Dices}
              title="Surprise me"
              subtitle="One random pick"
            />
            <ModeCard
              active={mode === "top5"}
              onClick={() => setMode("top5")}
              icon={Trophy}
              title="Top 5"
              subtitle="The best-rated matches"
            />
          </div>
        </Section>

        <div className="flex flex-col gap-3">
          <Button
            size="lg"
            className="h-12 w-full bg-gradient-to-r from-primary to-rose-500 text-base font-semibold text-white shadow-lg shadow-primary/30 transition-all hover:brightness-110 active:scale-[0.99]"
            onClick={() => pick([])}
            disabled={loading}
          >
            {loading ? (
              <LoaderCircle className="animate-spin" data-icon="inline-start" />
            ) : mode === "top5" ? (
              <Trophy data-icon="inline-start" />
            ) : (
              <Dices data-icon="inline-start" />
            )}
            {loading ? "Finding your table…" : ctaLabel}
          </Button>

          {error && (
            <p
              role="alert"
              className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
            >
              {error}
            </p>
          )}
        </div>
      </div>

      <div ref={resultsRef} className="flex scroll-mt-6 flex-col gap-4">
        {loading && (
          <>
            <RestaurantCardSkeleton />
            {mode === "top5" && (
              <>
                <RestaurantCardSkeleton />
                <RestaurantCardSkeleton />
              </>
            )}
          </>
        )}

        {empty && !loading && (
          <div className="rounded-2xl border border-dashed bg-card/70 p-8 text-center">
            <p className="text-3xl">🤷</p>
            <p className="mt-2 font-medium">
              {seen.length ? "That's every match." : "No restaurants matched."}
            </p>
            <p className="text-sm text-muted-foreground">
              {seen.length
                ? "Start over or loosen your filters."
                : "Try a wider distance, or remove a filter."}
            </p>
          </div>
        )}

        {!loading && results.length > 0 && (
          <>
            <h2 className="text-lg font-semibold">
              {resultsMode === "top5" ? "Your top picks" : "Tonight, you're eating at…"}
            </h2>
            {results.map((r, i) => (
              <RestaurantCard
                key={r.id}
                restaurant={r}
                index={i}
                rank={resultsMode === "top5" ? i + 1 : undefined}
              />
            ))}
            {resultsMode === "one" && results.length === 1 && (
              <Button
                variant="outline"
                size="lg"
                className="self-center"
                onClick={() => pick(seen)}
                disabled={loading}
              >
                <Dices data-icon="inline-start" />
                Not feeling it? Pick again
              </Button>
            )}
          </>
        )}
      </div>

      <footer className="text-center text-xs text-muted-foreground">
        Restaurant data &amp; photos from Google
      </footer>
    </div>
  );
}
