import { ExternalLink, Globe, MapPin, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Restaurant } from "@/lib/types";

const METERS_PER_MILE = 1609.344;

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

export function RestaurantCard({
  restaurant: r,
  rank,
  index,
}: {
  restaurant: Restaurant;
  /** Show a #N badge (Top 5 mode). */
  rank?: number;
  index: number;
}) {
  return (
    <article
      className="group flex animate-in flex-col overflow-hidden rounded-2xl border bg-card shadow-sm ring-1 ring-foreground/5 transition-all duration-300 fade-in slide-in-from-bottom-4 fill-mode-both hover:-translate-y-0.5 hover:shadow-lg sm:flex-row"
      style={{ animationDelay: `${index * 90}ms` }}
    >
      <div className="relative h-52 shrink-0 overflow-hidden bg-muted sm:h-auto sm:w-64">
        {r.photoName ? (
          <>
            {/* Served via /api/photo so the API key stays server-side. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/api/photo?name=${encodeURIComponent(r.photoName)}`}
              alt={r.name}
              loading="lazy"
              className="size-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/50 to-transparent" />
            {r.photoAttribution && (
              <span className="absolute bottom-1 left-2 max-w-[90%] truncate text-[10px] text-white/90">
                Photo: {r.photoAttribution}
              </span>
            )}
          </>
        ) : (
          <div className="flex size-full flex-col items-center justify-center gap-1 bg-gradient-to-br from-accent to-secondary text-muted-foreground">
            <span className="text-4xl">🍽️</span>
            <span className="text-xs">No photo available</span>
          </div>
        )}
        {rank !== undefined && (
          <span className="absolute top-3 left-3 flex size-9 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground shadow-md ring-2 ring-white/80">
            {rank}
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-3 p-5">
        <div>
          <h3 className="text-xl leading-tight font-bold tracking-tight">{r.name}</h3>
          <p className="mt-1 flex items-start gap-1 text-sm text-muted-foreground">
            <MapPin className="mt-0.5 size-3.5 shrink-0" />
            {r.address}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {r.rating ? (
            <Badge className="gap-1 bg-amber-100 text-amber-900 dark:bg-amber-400/20 dark:text-amber-200">
              <Star className="size-3 fill-current" />
              {r.rating.toFixed(1)}
              {r.ratingCount ? (
                <span className="font-normal opacity-80">
                  ({r.ratingCount.toLocaleString()})
                </span>
              ) : null}
            </Badge>
          ) : (
            <Badge variant="outline">No ratings yet</Badge>
          )}
          {r.priceLevel && <Badge variant="secondary">{PRICE_SYMBOL[r.priceLevel]}</Badge>}
          {r.type && <Badge variant="secondary">{r.type}</Badge>}
          <Badge variant="outline">{formatDistance(r.distanceMeters)} away</Badge>
        </div>

        <div className="mt-auto flex flex-wrap gap-2 pt-1">
          {r.mapsUrl && (
            <Button render={<a href={r.mapsUrl} target="_blank" rel="noreferrer" />}>
              <ExternalLink data-icon="inline-start" />
              Open in Google Maps
            </Button>
          )}
          {r.websiteUrl && (
            <Button
              variant="outline"
              render={<a href={r.websiteUrl} target="_blank" rel="noreferrer" />}
            >
              <Globe data-icon="inline-start" />
              Website
            </Button>
          )}
        </div>
      </div>
    </article>
  );
}

export function RestaurantCardSkeleton() {
  return (
    <div className="flex animate-pulse flex-col overflow-hidden rounded-2xl border bg-card sm:flex-row">
      <div className="h-52 bg-muted sm:h-44 sm:w-64" />
      <div className="flex flex-1 flex-col gap-3 p-5">
        <div className="h-6 w-2/3 rounded bg-muted" />
        <div className="h-4 w-full rounded bg-muted" />
        <div className="flex gap-2">
          <div className="h-6 w-16 rounded-full bg-muted" />
          <div className="h-6 w-20 rounded-full bg-muted" />
          <div className="h-6 w-14 rounded-full bg-muted" />
        </div>
      </div>
    </div>
  );
}
