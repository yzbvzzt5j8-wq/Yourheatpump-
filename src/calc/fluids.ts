/**
 * Fluid properties for water and propylene-glycol/water mixtures, and the
 * volumetric flow rate calculation used throughout hydraulics.
 *
 * Water property table is linearly interpolated from published values
 * (engineering steam-table data, 0-100 C). Glycol correction factors are
 * calibrated so that a 25% propylene glycol mixture at 42.5 C reproduces
 * the benchmark figures in the build spec: ~15% less heat capacity, 2.6x
 * viscosity. The resulting +14% flow requirement and pressure-drop increase
 * fall out of those two calibrated factors plus the density correction below
 * — they are not independently fitted.
 */

export interface FluidProperties {
  /** Specific heat capacity, kJ/(kg.K) */
  cpKJkgK: number;
  /** Density, kg/m3 */
  densityKgM3: number;
  /** Dynamic viscosity, Pa.s */
  viscosityPaS: number;
}

interface WaterTableRow {
  tempC: number;
  densityKgM3: number;
  cpKJkgK: number;
  viscosityMPaS: number;
}

// Published water property values at 10 C steps.
const WATER_TABLE: WaterTableRow[] = [
  { tempC: 0, densityKgM3: 999.8, cpKJkgK: 4.217, viscosityMPaS: 1.787 },
  { tempC: 10, densityKgM3: 999.7, cpKJkgK: 4.192, viscosityMPaS: 1.307 },
  { tempC: 20, densityKgM3: 998.2, cpKJkgK: 4.182, viscosityMPaS: 1.002 },
  { tempC: 30, densityKgM3: 995.6, cpKJkgK: 4.178, viscosityMPaS: 0.798 },
  { tempC: 40, densityKgM3: 992.2, cpKJkgK: 4.179, viscosityMPaS: 0.653 },
  { tempC: 50, densityKgM3: 988.0, cpKJkgK: 4.181, viscosityMPaS: 0.547 },
  { tempC: 60, densityKgM3: 983.2, cpKJkgK: 4.185, viscosityMPaS: 0.467 },
  { tempC: 70, densityKgM3: 977.7, cpKJkgK: 4.19, viscosityMPaS: 0.404 },
  { tempC: 80, densityKgM3: 971.8, cpKJkgK: 4.196, viscosityMPaS: 0.355 },
  { tempC: 90, densityKgM3: 965.3, cpKJkgK: 4.205, viscosityMPaS: 0.315 },
  { tempC: 100, densityKgM3: 958.3, cpKJkgK: 4.216, viscosityMPaS: 0.282 },
];

function interpolateTable(tempC: number): WaterTableRow {
  const clamped = Math.min(Math.max(tempC, WATER_TABLE[0].tempC), WATER_TABLE[WATER_TABLE.length - 1].tempC);
  for (let i = 0; i < WATER_TABLE.length - 1; i++) {
    const a = WATER_TABLE[i];
    const b = WATER_TABLE[i + 1];
    if (clamped >= a.tempC && clamped <= b.tempC) {
      const f = (clamped - a.tempC) / (b.tempC - a.tempC);
      return {
        tempC: clamped,
        densityKgM3: a.densityKgM3 + f * (b.densityKgM3 - a.densityKgM3),
        cpKJkgK: a.cpKJkgK + f * (b.cpKJkgK - a.cpKJkgK),
        viscosityMPaS: a.viscosityMPaS + f * (b.viscosityMPaS - a.viscosityMPaS),
      };
    }
  }
  const last = WATER_TABLE[WATER_TABLE.length - 1];
  return last;
}

export function waterProperties(tempC: number): FluidProperties {
  const row = interpolateTable(tempC);
  return {
    cpKJkgK: row.cpKJkgK,
    densityKgM3: row.densityKgM3,
    viscosityPaS: row.viscosityMPaS / 1000,
  };
}

/** Empirical calibration constants — see module doc comment. */
const GLYCOL_CP_FACTOR = 0.6; // cp loss per unit glycol fraction
const GLYCOL_DENSITY_FACTOR = 0.13; // density gain per unit glycol fraction
const GLYCOL_VISCOSITY_K = Math.log(2.6) / 0.25; // viscosity ratio = e^(k * fraction)

/**
 * Propylene glycol / water mixture properties.
 * @param glycolFraction volume fraction of glycol, 0-0.6 (e.g. 0.25 for 25%)
 */
export function glycolProperties(glycolFraction: number, tempC: number): FluidProperties {
  if (glycolFraction < 0 || glycolFraction > 0.6) {
    throw new Error(`Glycol fraction ${glycolFraction} outside supported range 0-0.6`);
  }
  if (glycolFraction === 0) return waterProperties(tempC);
  const water = waterProperties(tempC);
  return {
    cpKJkgK: water.cpKJkgK * (1 - GLYCOL_CP_FACTOR * glycolFraction),
    densityKgM3: water.densityKgM3 * (1 + GLYCOL_DENSITY_FACTOR * glycolFraction),
    viscosityPaS: water.viscosityPaS * Math.exp(GLYCOL_VISCOSITY_K * glycolFraction),
  };
}

export function fluidProperties(glycolFraction: number, tempC: number): FluidProperties {
  return glycolFraction > 0 ? glycolProperties(glycolFraction, tempC) : waterProperties(tempC);
}

/**
 * Volumetric flow required for a given duty and temperature difference.
 * L/s = kW / (cp x dT x rho) x 1000
 */
export function volumetricFlowLps(kw: number, deltaTK: number, fluid: FluidProperties): number {
  if (deltaTK <= 0) throw new Error('deltaTK must be > 0');
  return (kw / (fluid.cpKJkgK * deltaTK * fluid.densityKgM3)) * 1000;
}
