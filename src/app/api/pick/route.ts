import type { NextRequest } from "next/server";
import {
  PlacesError,
  geocode,
  searchRestaurants,
  topRated,
  weightedRandom,
} from "@/lib/places";
import { clientIp, createRateLimiter } from "@/lib/rate-limit";
import {
  CUISINES,
  DIETS,
  PRICES,
  type PickRequest,
  type PickResponse,
} from "@/lib/types";

const isLimited = createRateLimiter(20);

const isNum = (v: unknown): v is number =>
  typeof v === "number" && Number.isFinite(v);

type RawBody = {
  location?: { lat?: unknown; lng?: unknown; address?: unknown };
  cuisines?: unknown;
  diets?: unknown;
  price?: unknown;
  radiusMeters?: unknown;
  openNow?: unknown;
  count?: unknown;
  excludeIds?: unknown;
};

function parse(raw: unknown): PickRequest | string {
  if (!raw || typeof raw !== "object") return "Invalid body";
  const body = raw as RawBody;

  const loc = body.location;
  const coords =
    isNum(loc?.lat) &&
    isNum(loc?.lng) &&
    Math.abs(loc.lat) <= 90 &&
    Math.abs(loc.lng) <= 180
      ? { lat: loc.lat, lng: loc.lng }
      : null;
  const address =
    typeof loc?.address === "string" &&
    loc.address.trim().length > 0 &&
    loc.address.length <= 200
      ? loc.address.trim()
      : null;
  if (!coords && !address) return "A location is required";

  const list = <T extends string>(v: unknown, allowed: readonly T[]) =>
    Array.isArray(v) ? allowed.filter((a) => v.includes(a)) : [];

  const price = body.price ?? "any";
  if (price !== "any" && !PRICES.some((p) => p === price)) return "Invalid price";

  const radius = isNum(body.radiusMeters) ? body.radiusMeters : 3000;
  const excludeIds = Array.isArray(body.excludeIds)
    ? body.excludeIds.filter((x: unknown) => typeof x === "string").slice(0, 200)
    : [];

  return {
    location: coords ?? { address: address! },
    cuisines: list(body.cuisines, CUISINES),
    diets: list(body.diets, DIETS),
    price: price as PickRequest["price"],
    radiusMeters: Math.min(Math.max(radius, 200), 50000),
    openNow: body.openNow === true,
    count: body.count === 5 ? 5 : 1,
    excludeIds,
  };
}

export async function POST(request: NextRequest) {
  if (isLimited(clientIp(request))) {
    return Response.json({ error: "Too many requests, slow down." }, { status: 429 });
  }

  const parsed = parse(await request.json().catch(() => null));
  if (typeof parsed === "string") {
    return Response.json({ error: parsed }, { status: 400 });
  }

  try {
    const origin =
      "address" in parsed.location
        ? await geocode(parsed.location.address)
        : parsed.location;

    const results = await searchRestaurants(parsed, origin);
    const exclude = new Set(parsed.excludeIds);
    const candidates = results.filter((r) => !exclude.has(r.id));

    const picked =
      parsed.count === 5
        ? topRated(candidates, 5)
        : candidates.length
          ? [weightedRandom(candidates)]
          : [];

    const payload: PickResponse = {
      restaurants: picked,
      remaining: candidates.length - picked.length,
    };
    return Response.json(payload);
  } catch (err) {
    if (err instanceof PlacesError) {
      return Response.json({ error: err.message }, { status: err.status });
    }
    console.error(err);
    return Response.json({ error: "Something went wrong" }, { status: 500 });
  }
}
