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
