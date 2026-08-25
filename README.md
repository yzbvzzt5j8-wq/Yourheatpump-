# YourHeatPump

A heat pump design application for MCS-certified heating engineers,
carrying a job from first survey through to handover and servicing.

**This is a design aid, not MCS-certified documentation.** MCS certifies
installers and installations, and separately approves calculation
software. See [VALIDATION.md](./VALIDATION.md) before relying on this for
a real design.

## Stack

Vite · React 19 · TypeScript · Tailwind CSS 4 · Dexie (IndexedDB) ·
vite-plugin-pwa · Vitest · Playwright. Offline-first, no backend — data
lives in IndexedDB with JSON export/import for backup.

```
src/
  calc/        pure calculation functions, fully tested — heat loss,
               emitters, fluids, pipes, circuit tree, pump duty, system
               volume, sound, MCS compliance, pricing
  data/        catalogues — materials, heat pumps, radiators, arrangements
  db/          Dexie schema, settings, backup/restore, job repository
  export/      report templates and the resilient export chain
  features/    survey · design · hydraulics · materials · commissioning ·
               reports · settings · help
  components/  shared UI
  types/       domain model
```

## Scripts

```
npm run dev        # start the dev server
npm run build      # type-check + production build
npm test           # run the calc engine and structural test suite
npm run test:watch # vitest in watch mode
npm run test:e2e   # Playwright end-to-end tests
npm run lint       # oxlint
```

## Before you rely on this for a real job

Read [VALIDATION.md](./VALIDATION.md). In short: run three or four
completed jobs with known-good figures through the app and compare the
results before designing a live installation with it, and replace the
illustrative heat pump/radiator catalogue data with real manufacturer
datasheet figures first.
