import type { PickRequest, Restaurant } from "./types";

const PLACES_URL = "https://places.googleapis.com/v1/places:searchText";
const GEOCODE_URL = "https://maps.googleapis.com/maps/api/geocode/json";

const FIELD_MASK = [
  "places.id",
  "places.displayName",
  "places.formattedAddress",
  "places.location",
  "places.rating",
  "places.userRatingCount",
  "places.priceLevel",
  "places.primaryTypeDisplayName",
  "places.googleMapsUri",
  "places.websiteUri",
].join(",");

const PRICE_LEVELS = {
  low: ["PRICE_LEVEL_INEXPENSIVE"],
  medium: ["PRICE_LEVEL_MODERATE"],
  high: ["PRICE_LEVEL_EXPENSIVE", "PRICE_LEVEL_VERY_EXPENSIVE"],
} as const;

const PRICE_FROM_API: Record<string, Restaurant["priceLevel"]> = {
  PRICE_LEVEL_FREE: "free",
  PRICE_LEVEL_INEXPENSIVE: "low",
  PRICE_LEVEL_MODERATE: "medium",
  PRICE_LEVEL_EXPENSIVE: "high",
  PRICE_LEVEL_VERY_EXPENSIVE: "very-high",
};

type GooglePlace = {
  id?: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  location?: { latitude: number; longitude: number };
  rating?: number;
  userRatingCount?: number;
  priceLevel?: string;
  primaryTypeDisplayName?: { text?: string };
  googleMapsUri?: string;
  websiteUri?: string;
};

export class PlacesError extends Error {
  constructor(
    message: string,
    readonly status = 502,
  ) {
    super(message);
  }
}

function apiKey() {
  const key = process.env.GOOGLE_PLACES_API_KEY;
  if (!key) throw new PlacesError("GOOGLE_PLACES_API_KEY is not configured", 500);
  return key;
}

export async function geocode(address: string) {
  const url = `${GEOCODE_URL}?address=${encodeURIComponent(address)}&key=${apiKey()}`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new PlacesError(`Geocoding failed (${res.status})`);
  const data = await res.json();
  const loc = data.results?.[0]?.geometry?.location;
  if (!loc) throw new PlacesError("Could not find that address", 404);
  return { lat: loc.lat as number, lng: loc.lng as number };
}

export function distanceMeters(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
) {
  const R = 6371000;
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/**
 * Searches Google Places (New) Text Search for restaurants near `origin`.
 * Cuisine and diet are folded into the text query because Places has no
 * structured dietary filter. Results are re-filtered by true distance since
 * `locationBias` is only a bias, not a restriction.
 */
export async function searchRestaurants(
  req: Pick<PickRequest, "cuisines" | "diets" | "price" | "radiusMeters" | "openNow">,
  origin: { lat: number; lng: number },
): Promise<Restaurant[]> {
  const terms = [...req.diets, ...req.cuisines];
  const textQuery = `${terms.join(" ")} restaurant`.trim();

  const body: Record<string, unknown> = {
    textQuery,
    includedType: "restaurant",
    strictTypeFiltering: true,
    pageSize: 20,
    openNow: req.openNow || undefined,
    locationBias: {
      circle: {
        center: { latitude: origin.lat, longitude: origin.lng },
        radius: Math.min(req.radiusMeters, 50000),
      },
    },
  };
  if (req.price !== "any") body.priceLevels = PRICE_LEVELS[req.price];

  const res = await fetch(PLACES_URL, {
    method: "POST",
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey(),
      "X-Goog-FieldMask": FIELD_MASK,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    console.error("Places API error", res.status, detail);
    throw new PlacesError(`Places API request failed (${res.status})`);
  }

  const data = await res.json();
  const places: GooglePlace[] = data.places ?? [];

  return places
    .flatMap((p) => (p.id && p.location ? [{ ...p, id: p.id, location: p.location }] : []))
    .map((p): Restaurant => {
      const loc = { lat: p.location.latitude, lng: p.location.longitude };
      return {
        id: p.id,
        name: p.displayName?.text ?? "Unnamed restaurant",
        address: p.formattedAddress ?? "",
        rating: p.rating ?? null,
        ratingCount: p.userRatingCount ?? null,
        priceLevel: PRICE_FROM_API[p.priceLevel ?? ""] ?? null,
        type: p.primaryTypeDisplayName?.text ?? null,
        distanceMeters: Math.round(distanceMeters(origin, loc)),
        mapsUrl: p.googleMapsUri ?? "",
        websiteUrl: p.websiteUri ?? null,
        ...loc,
      };
    })
    .filter((r) => r.distanceMeters <= req.radiusMeters);
}

/** Random pick weighted toward higher-rated places (weight = rating²). */
export function weightedRandom(items: Restaurant[]): Restaurant {
  const weights = items.map((r) => (r.rating ?? 3.5) ** 2);
  let roll = Math.random() * weights.reduce((a, b) => a + b, 0);
  for (let i = 0; i < items.length; i++) {
    roll -= weights[i];
    if (roll <= 0) return items[i];
  }
  return items[items.length - 1];
}
