# Validation

**Before anyone designs a real system with this application, run three or
four completed jobs with known-good figures through it and compare the
results line by line** — heat loss per room, emitter output at design
flow temperature, pipe sizes and pressure drops, index circuit, pump duty
pass/fail, system volume and volumiser verdict, and MCS sizing/scope
checks. Do not rely on this tool for a live installation until that
comparison has been done and any discrepancy understood.

## This application is not, and cannot be, "MCS compliant"

MCS certifies installers and installations, and separately approves
calculation software through its own process. An application cannot
itself be "MCS compliant" — that phrase does not describe something a
piece of software can be. Nothing in this app confers MCS certification
on a design, an installer, or an installation. Certified paperwork, the
official MCS 020 sound assessment, and MCS database registration all
happen outside this application, using the official tools for that
purpose. Every screen that shows a pass/fail against an MCS rule
(sizing, scope, emitter band, sound) is a design-stage check to catch
problems early — not a substitute for certification.

## What has and hasn't been checked against a reference

- **The calculation engine** (`src/calc/`) is tested against every worked
  example given in the original build specification, and those tests are
  green. See `src/calc/*.test.ts`.
- **One figure is flagged, not silently matched**: the spec's glycol
  pressure-drop benchmark (+45% at 25% concentration, 42.5°C) does not
  reproduce under correct Darcy-Weisbach/Colebrook-White physics once the
  fluid properties are calibrated to the spec's other three benchmarks
  (-15% heat capacity, +14% flow, 2.6x viscosity) — real physics gives
  roughly +55–65% across realistic velocities. See the doc comment in
  `src/calc/fluids.ts` and the test in `src/calc/fluids.test.ts`. This
  needs a decision from whoever owns the spec before it's treated as
  resolved either way.
- **Heat pump and radiator catalogue data** (`src/data/heatPumps.ts`,
  `src/data/radiators.ts`) is illustrative starter data for development
  and UI testing, not sourced from verified manufacturer datasheets.
  Every output curve, sound power figure, pump curve, and Delta-50 rating
  in those files must be replaced with the actual manufacturer's
  published performance data for the model being installed before any
  real design is produced. The app displays a warning to this effect
  wherever this data is used, but the warning is not a substitute for
  replacing the data.
- **Material prices** (`src/data/materials.ts`) are estimating figures
  with a review date and a staleness warning past 90 days — not live
  supplier quotes. The materials screen carries a banner to this effect;
  a customer quotation must not be issued from these prices without
  checking current supplier quotations first.

## Known simplifications (not bugs, but worth knowing before relying on this)

- The bill-of-materials generator (`src/features/materials/bomGenerator.ts`)
  covers pipework, insulation, glycol, safety/commissioning components,
  main equipment placeholders, and estimating allowances — it does not
  itemise individual fittings (elbows, tees, couplings) by count; sundries
  and fittings are handled as a percentage allowance at the pricing layer,
  not as discrete BOM lines.
- Per-input tooltips linking into Help are not wired up across every
  technical field; Help exists as a standalone searchable screen instead.
- The 8 kits are viewable and manufacturer-supplied lines can be removed
  in the UI, but that removal is not persisted between sessions — the
  kits themselves are a fixed starting reference, not per-job editable
  records.
- Routing is a minimal hash-based router rather than a full routing
  library, kept deliberately dependency-free per the build spec.

## Running the checks yourself

```
npm test        # calc engine and structural tests (vitest)
npm run build   # type-check + production build
npm run test:e2e   # Playwright, once test data/fixtures are set up
```
