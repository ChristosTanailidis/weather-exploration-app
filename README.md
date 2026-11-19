# Weather Explorer

Explore the weather anywhere in the world on an interactive globe.

## Getting started

Requires Node 22.18 or newer.

```bash
npm install
cp .env.example .env   # then add your Mapbox token
npm run dev
```

## Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` | Production build into `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm run lint` / `lint:fix` | ESLint (code style included) |
| `npm run type-check` | Strict TypeScript check with `vue-tsc` |
| `npm run test` | Unit tests with Vitest |
| `npm run build:cities` | Rebuild `public/cities.json` from GeoNames (optional) |

## City dataset

`public/cities.json` holds the 5,000 most populous cities from the GeoNames
`cities15000` dump (city sections and historical places excluded) as compact
rows `[id, name, countryCode, admin1, lat, lon, population]`, with coordinates
rounded to 2 decimals (about 1 km). The map uses it for city markers and to
name clicked points without any reverse-geocoding requests.

The file is committed, so rebuilding it is optional:

```bash
npm run build:cities
```

The script uses Node built-ins only (`fetch`, `zlib`) and downloads
`cities15000.zip` and `admin1CodesASCII.txt` from `download.geonames.org`.
Behind an HTTPS proxy, run it with `NODE_USE_ENV_PROXY=1` (Node 22.21+).

## Attribution

- City data: [GeoNames](https://www.geonames.org/), licensed under
  [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)
