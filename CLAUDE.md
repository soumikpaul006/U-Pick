# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm run dev` — dev server on :3000 (use `-- -p <port>` for another port)
- `npm run build` — production build; also type-checks
- `npm run lint` — ESLint (`no-explicit-any` is enforced)
- `npx tsc --noEmit` — type-check only
- No test framework is set up yet.

Setup: `cp .env.example .env.local` and set `GOOGLE_PLACES_API_KEY` (needs **Places API (New)** and **Geocoding API** enabled). Next only reads env files at startup, so restart `npm run dev` after editing. `.env*` is gitignored, including `.env.example`.

## Next.js version warning

This is Next.js 16 / React 19 with breaking changes from older versions. `AGENTS.md` requires reading the relevant guide in `node_modules/next/dist/docs/` before writing Next-specific code (e.g. `01-app/03-api-reference/03-file-conventions/route.md` for route handlers).

## Architecture

upick picks one random restaurant near the user, filtered by cuisine, diet, price and radius. It is stateless: no database, no accounts.

Request flow: `src/components/picker.tsx` (client component holding all filter/result state) → `POST /api/pick` (`src/app/api/pick/route.ts`) → `src/lib/places.ts` → Google.

- **`route.ts`** validates the untyped body against the allow-lists in `src/lib/types.ts` (unknown values are dropped; radius clamped to 200–50000 m; the API is metric, the UI converts from miles), applies a per-IP in-memory rate limit (per instance only; replace with shared storage if deployed to multiple instances), geocodes a typed address if no coordinates were sent, then removes `excludeIds` and picks.
- **`/api/photo`** (`src/app/api/photo/route.ts`) proxies Places photos so the API key stays server-side. It only accepts names matching `places/<id>/photos/<ref>`; never build direct Google photo URLs in the client. Rate limiting lives in `src/lib/rate-limit.ts` (separate limiter per route).
- **`places.ts`** calls Places Text Search (New). Cuisine and diet are folded into the `textQuery` string, because Places has no structured diet filter; diet matching is therefore keyword-based and best-effort. `locationBias` is only a bias, so results are re-filtered by haversine distance against `radiusMeters`. `count: 1` picks randomly, weighted by `rating²`; `count: 5` returns the top five by Bayesian-average rating (so few-review 5.0s don't win). The response is always `{ restaurants[], remaining }`.
- **"Pick again"** is client-driven: the client accumulates shown place ids in `seen` and sends them back as `excludeIds`; the server holds no session state. Each pick is a fresh Places call (up to 20 results), so `remaining` only counts results of that call.
- **`types.ts`** is the shared contract: the `CUISINES`/`DIETS`/`PRICES` constants drive both the UI chips and server-side validation, so add new options there only.
- The API key is read server-side only in `places.ts`; never give it a `NEXT_PUBLIC_` prefix.

## UI conventions

shadcn/ui with the `base-nova` style, built on **Base UI** (`@base-ui/react`), not Radix. Differences that matter: `ToggleGroup` takes `multiple` and a `string[]` `value`; `Select`'s `onValueChange` can receive `null`; polymorphic components use a `render={<a … />}` prop instead of `asChild`. The `cn` helper comes from the `cn` package (re-exported in `src/lib/utils.ts`), not clsx + tailwind-merge. Add components with `npx shadcn@latest add <name>`; Tailwind v4 is configured in `src/app/globals.css` (no `tailwind.config`).
