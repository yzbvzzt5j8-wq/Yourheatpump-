/**
 * Pipe sizing: velocity, pressure drop (Darcy-Weisbach + Colebrook-White),
 * and developed length. See CIBSE Guide B1 (velocity limits, Table 1.A1.4;
 * pressure drop guidance, section 1.A1.3).
 */
import type { FluidProperties } from './fluids';

export interface PipeSize {
  /** Nominal (outside) diameter, mm */
  nominalMm: number;
  /** Internal diameter per EN 1057, mm */
  idMm: number;
}

/** Copper tube internal diameters, EN 1057. */
export const COPPER_PIPES: PipeSize[] = [
  { nominalMm: 15, idMm: 13.6 },
  { nominalMm: 22, idMm: 20.2 },
  { nominalMm: 28, idMm: 26.2 },
  { nominalMm: 35, idMm: 32.6 },
  { nominalMm: 42, idMm: 39.6 },
  { nominalMm: 54, idMm: 51.6 },
];

/** Absolute roughness for copper tube, metres (1.5 micron). */
export const COPPER_ROUGHNESS_M = 1.5e-6;

/** Practical minimum velocity — CIBSE dropped a formal minimum in 2010. */
export const PRACTICAL_MIN_VELOCITY_MS = 0.4;

/** CIBSE B1 Table 1.A1.4 velocity limit, by nominal size. */
export function velocityLimitMs(nominalMm: number): number {
  return nominalMm <= 50 ? 1.0 : 1.5;
}

export function velocityMs(flowLps: number, idMm: number): number {
  const flowM3s = flowLps / 1000;
  const idM = idMm / 1000;
  const areaM2 = (Math.PI / 4) * idM * idM;
  return flowM3s / areaM2;
}

/**
 * Darcy friction factor via Colebrook-White, solved by fixed-point iteration
 * on the implicit form:
 *   1/sqrt(f) = -2 log10( roughness/(3.7 D) + 2.51 / (Re sqrt(f)) )
 */
export function frictionFactor(reynolds: number, idM: number, roughnessM: number = COPPER_ROUGHNESS_M): number {
  if (reynolds < 2300) {
    // Laminar flow.
    return 64 / Math.max(reynolds, 1e-6);
  }
  let f = 0.02; // initial guess
  for (let i = 0; i < 50; i++) {
    const rhs = -2 * Math.log10(roughnessM / (3.7 * idM) + 2.51 / (reynolds * Math.sqrt(f)));
    const fNext = 1 / (rhs * rhs);
    if (Math.abs(fNext - f) < 1e-8) {
      f = fNext;
      break;
    }
    f = fNext;
  }
  return f;
}

export interface PressureDropResult {
  velocityMs: number;
  reynolds: number;
  frictionFactor: number;
  pressureDropPaPerM: number;
}

export function pressureDrop(flowLps: number, idMm: number, fluid: FluidProperties): PressureDropResult {
  const idM = idMm / 1000;
  const v = velocityMs(flowLps, idMm);
  const reynolds = (fluid.densityKgM3 * v * idM) / fluid.viscosityPaS;
  const f = frictionFactor(reynolds, idM);
  const pressureDropPaPerM = f * (fluid.densityKgM3 * v * v) / (2 * idM);
  return { velocityMs: v, reynolds, frictionFactor: f, pressureDropPaPerM };
}

export type SizingBasis = 'velocity' | 'cibse200' | 'velocityAnd300';

export interface PipeSizingResult {
  size: PipeSize;
  velocityMs: number;
  pressureDropPaPerM: number;
  velocityOk: boolean;
  pressureOk: boolean;
  basis: SizingBasis;
}

/**
 * Selects the smallest pipe that satisfies the chosen sizing basis.
 *
 * Default basis is velocity + 300 Pa/m ceiling: heat pumps move far more
 * water than boilers and rely on a built-in circulator with limited head,
 * so velocity-only sizing can produce circuits the pump cannot serve.
 * 'cibse200' and 'velocity' bases are offered as alternatives.
 */
export function selectPipeSize(
  flowLps: number,
  fluid: FluidProperties,
  basis: SizingBasis = 'velocityAnd300',
  candidates: PipeSize[] = COPPER_PIPES,
): PipeSizingResult {
  const pressureCeiling = basis === 'cibse200' ? 200 : basis === 'velocityAnd300' ? 300 : Infinity;

  for (const size of candidates) {
    const v = velocityMs(flowLps, size.idMm);
    const { pressureDropPaPerM: dp } = pressureDrop(flowLps, size.idMm, fluid);
    const vLimit = velocityLimitMs(size.nominalMm);
    const velocityOk = v <= vLimit && v >= PRACTICAL_MIN_VELOCITY_MS;
    const pressureOk = dp <= pressureCeiling;
    if (velocityOk && pressureOk) {
      return { size, velocityMs: v, pressureDropPaPerM: dp, velocityOk, pressureOk, basis };
    }
  }
  // Nothing satisfied both constraints — return the largest candidate, flagged.
  const largest = candidates[candidates.length - 1];
  const v = velocityMs(flowLps, largest.idMm);
  const { pressureDropPaPerM: dp } = pressureDrop(flowLps, largest.idMm, fluid);
  return {
    size: largest,
    velocityMs: v,
    pressureDropPaPerM: dp,
    velocityOk: v <= velocityLimitMs(largest.nominalMm) && v >= PRACTICAL_MIN_VELOCITY_MS,
    pressureOk: dp <= pressureCeiling,
    basis,
  };
}

/**
 * Developed length: straight run plus vertical rise/drop, doubled for the
 * flow-and-return pair, plus fitting equivalent lengths.
 *
 * NOTE: length changes total pressure drop and pump head — it does NOT
 * change pipe size. Pipe size is driven by flow rate alone. This is
 * counter-intuitive and must be stated in the UI.
 */
export function developedLengthM(horizontalM: number, verticalM: number, fittingEquivalentM: number = 0): number {
  return (horizontalM + verticalM) * 2 + fittingEquivalentM;
}
