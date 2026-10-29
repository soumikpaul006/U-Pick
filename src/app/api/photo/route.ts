import type { NextRequest } from "next/server";
import { PlacesError, fetchPhoto } from "@/lib/places";
import { clientIp, createRateLimiter } from "@/lib/rate-limit";

const isLimited = createRateLimiter(60);

// Only well-formed Places photo resource names; this stops the route being
// used as an open proxy for arbitrary Google API paths.
const PHOTO_NAME = /^places\/[\w-]+\/photos\/[\w-]+$/;

export async function GET(request: NextRequest) {
  if (isLimited(clientIp(request))) {
    return new Response("Too many requests", { status: 429 });
  }

  const name = request.nextUrl.searchParams.get("name") ?? "";
  if (!PHOTO_NAME.test(name)) {
    return new Response("Invalid photo name", { status: 400 });
  }

  try {
    const upstream = await fetchPhoto(name, 640);
    const type = upstream.headers.get("content-type") ?? "";
    if (!upstream.ok || !type.startsWith("image/")) {
      return new Response("Photo unavailable", { status: 404 });
    }
    return new Response(upstream.body, {
      headers: {
        "Content-Type": type,
        "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
      },
    });
  } catch (err) {
    if (err instanceof PlacesError) {
      return new Response(err.message, { status: err.status });
    }
    return new Response("Photo unavailable", { status: 502 });
  }
}
