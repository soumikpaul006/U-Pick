# U-Pick

Can't decide where to eat? U-Pick picks a random restaurant near you, filtered by cuisine, dietary preference, price and distance.

Built with Next.js (App Router), TypeScript, Tailwind CSS, shadcn/ui and the Google Places API (New).

## Getting started

```bash
npm install
cp .env.example .env.local   # then add your Google API key
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Google API key

Create a key in the [Google Cloud Console](https://console.cloud.google.com) with billing enabled, and enable:

- **Places API (New)**
- **Geocoding API**

Set it in `.env.local`:

```
GOOGLE_PLACES_API_KEY=your-key-here
```

The key is only used server-side (in `/api/pick`). Never prefix it with `NEXT_PUBLIC_`, and restrict it to the two APIs above.

## How it works

1. The browser sends your location (geolocation or a typed address) and filters to `POST /api/pick`.
2. The server searches Google Places, re-filters by real distance, drops places you've already seen, and picks one at random, weighted toward higher ratings.
3. "Pick again" excludes everything already shown.

Dietary matching is keyword-based (Places has no structured diet filter), so check the menu.

## Scripts

- `npm run dev`: start the dev server
- `npm run build`: production build
- `npm run lint`: lint
