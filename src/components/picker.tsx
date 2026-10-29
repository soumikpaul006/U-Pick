"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
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

type Mode = "one" | "top5";

const PRICE_OPTIONS = [
  { value: "any", label: "Any price" },
  { value: "low", label: "$ Low" },
  { value: "medium", label: "$$ Medium" },
  { value: "high", label: "$$$ High" },
];

const PRICE_SYMBOL: Record<string, string> = {
  free: "Free",
  low: "$",
  medium: "$$",
  high: "$$$",
  "very-high": "$$$$",
};

function formatDistance(m: number) {
  const miles = m / METERS_PER_MILE;
  return miles < 0.1 ? "<0.1 mi" : `${miles.toFixed(1)} mi`;
}

type Coords = { lat: number; lng: number };

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
  const [empty, setEmpty] = useState(false);
  const [seen, setSeen] = useState<string[]>([]);

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
        setResults([]);
        setEmpty(true);
        return;
      }
      setResults(data.restaurants);
      setSeen([...exclude, ...data.restaurants.map((r) => r.id)]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-10">
      <header className="text-center">
        <h1 className="text-4xl font-bold tracking-tight">upick</h1>
        <p className="mt-2 text-muted-foreground">
          Can&apos;t decide where to eat? Let us pick for you.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>What are you in the mood for?</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <Label htmlFor="address">Location</Label>
            <div className="flex gap-2">
              <Input
                id="address"
                placeholder={coords ? "Using your current location" : "Address or zip code"}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />
              <Button variant="outline" onClick={useMyLocation} disabled={locating}>
                {locating ? "Locating…" : coords ? "Located ✓" : "Use my location"}
              </Button>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label>Cuisine (leave empty for anything)</Label>
            <ToggleGroup
              multiple
              variant="outline"
              className="flex-wrap"
              value={cuisines}
              onValueChange={(v) => setCuisines(v as Cuisine[])}
            >
              {CUISINES.map((c) => (
                <ToggleGroupItem key={c} value={c}>
                  {c}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </div>

          <div className="flex flex-col gap-2">
            <Label>Dietary preference</Label>
            <ToggleGroup
              multiple
              variant="outline"
              className="flex-wrap"
              value={diets}
              onValueChange={(v) => setDiets(v as Diet[])}
            >
              {DIETS.map((d) => (
                <ToggleGroupItem key={d} value={d}>
                  {d}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
            <p className="text-xs text-muted-foreground">
              Dietary matching is keyword-based, so double-check the menu.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label>Price</Label>
              <Select value={price} onValueChange={(v) => setPrice(v as Price | "any")}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRICE_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label>Distance</Label>
              <Select value={radius} onValueChange={(v) => v && setRadius(v)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RADII.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={openNow}
              onChange={(e) => setOpenNow(e.target.checked)}
            />
            Open now
          </label>

          <div className="flex flex-col gap-2">
            <Label>How many?</Label>
            <ToggleGroup
              variant="outline"
              value={[mode]}
              onValueChange={(v) => v[0] && setMode(v[0] as Mode)}
            >
              <ToggleGroupItem value="one">Surprise me (1)</ToggleGroupItem>
              <ToggleGroupItem value="top5">Top 5</ToggleGroupItem>
            </ToggleGroup>
          </div>

          <Button size="lg" onClick={() => pick([])} disabled={loading}>
            {loading && !results.length
              ? mode === "top5"
                ? "Finding…"
                : "Picking…"
              : mode === "top5"
                ? "Find top 5"
                : "Pick a restaurant"}
          </Button>

          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
        </CardContent>
      </Card>

      {empty && (
        <p className="text-center text-muted-foreground">
          {seen.length
            ? "That's every match. Start over or loosen your filters."
            : "No restaurants matched. Try widening the distance or removing a filter."}
        </p>
      )}

      {results.map((r, i) => (
        <Card key={r.id} className="overflow-hidden pt-0">
          {r.photoName ? (
            <figure className="relative">
              {/* Served via /api/photo so the API key stays server-side. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/api/photo?name=${encodeURIComponent(r.photoName)}`}
                alt={r.name}
                loading="lazy"
                className="h-56 w-full object-cover"
              />
              {r.photoAttribution && (
                <figcaption className="absolute right-0 bottom-0 rounded-tl bg-black/60 px-2 py-0.5 text-[10px] text-white">
                  Photo: {r.photoAttribution}
                </figcaption>
              )}
            </figure>
          ) : (
            <div className="flex h-24 items-center justify-center bg-muted text-sm text-muted-foreground">
              No photo available
            </div>
          )}
          <CardHeader>
            <CardTitle className="text-2xl">
              {mode === "top5" && results.length > 1 ? `${i + 1}. ` : ""}
              {r.name}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-2">
              {r.rating ? (
                <Badge>
                  ★ {r.rating.toFixed(1)}
                  {r.ratingCount ? ` (${r.ratingCount.toLocaleString()} reviews)` : ""}
                </Badge>
              ) : (
                <Badge variant="outline">No ratings yet</Badge>
              )}
              {r.type && <Badge variant="secondary">{r.type}</Badge>}
              {r.priceLevel && (
                <Badge variant="secondary">{PRICE_SYMBOL[r.priceLevel]}</Badge>
              )}
              <Badge variant="outline">{formatDistance(r.distanceMeters)} away</Badge>
            </div>
            <p className="text-sm text-muted-foreground">{r.address}</p>
            <div className="flex flex-wrap gap-2">
              {r.mapsUrl && (
                <Button render={<a href={r.mapsUrl} target="_blank" rel="noreferrer" />}>
                  Open in Google Maps
                </Button>
              )}
              {r.websiteUrl && (
                <Button
                  variant="outline"
                  render={<a href={r.websiteUrl} target="_blank" rel="noreferrer" />}
                >
                  Website
                </Button>
              )}
              {mode === "one" && results.length === 1 && (
                <Button variant="outline" onClick={() => pick(seen)} disabled={loading}>
                  {loading ? "Picking…" : "Pick again"}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
