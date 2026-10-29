export const CUISINES = [
  "Asian",
  "Chinese",
  "Japanese",
  "Korean",
  "Thai",
  "Indian",
  "Italian",
  "Mexican",
  "American",
  "Mediterranean",
  "Middle Eastern",
  "French",
  "Desserts",
  "Bakery",
  "Cafe",
] as const;

/**
 * Cuisine options that are venue kinds rather than cuisines. Google files these
 * under their own place types (not "restaurant"), so searches including any of
 * them must not be restricted to restaurants.
 */
export const VENUE_CATEGORIES: readonly string[] = ["Desserts", "Bakery", "Cafe"];

export const DIETS = [
  "Vegan",
  "Vegetarian",
  "Keto",
  "Gluten-free",
  "Halal",
] as const;

export const PRICES = ["low", "medium", "high"] as const;

export type Cuisine = (typeof CUISINES)[number];
export type Diet = (typeof DIETS)[number];
export type Price = (typeof PRICES)[number];

export type PickRequest = {
  location: { lat: number; lng: number } | { address: string };
  cuisines: Cuisine[];
  diets: Diet[];
  price: Price | "any";
  radiusMeters: number;
  openNow: boolean;
  /** 1 = a single random pick, 5 = the five best-ranked matches. */
  count: 1 | 5;
  /** Place ids already shown, so "pick again" never repeats. */
  excludeIds: string[];
};

export type Restaurant = {
  id: string;
  name: string;
  address: string;
  rating: number | null;
  ratingCount: number | null;
  priceLevel: Price | "free" | "very-high" | null;
  type: string | null;
  distanceMeters: number;
  mapsUrl: string;
  websiteUrl: string | null;
  lat: number;
  lng: number;
  /** Google photo resource name; fetch it through /api/photo, never directly. */
  photoName: string | null;
  photoAttribution: string | null;
};

export type PickResponse = { restaurants: Restaurant[]; remaining: number };
