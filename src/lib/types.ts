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
] as const;

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
};

export type PickResponse =
  | { restaurant: Restaurant; remaining: number }
  | { restaurant: null; remaining: 0 };
