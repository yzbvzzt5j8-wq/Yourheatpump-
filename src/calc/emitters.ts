/**
 * Emitter output correction for a mean water temperature that differs from
 * the manufacturer's Delta-50 test condition.
 *
 *   output = rated_D50 x (dT_actual / 50) ^ 1.3
 *   dT_actual = mean water temperature - room temperature
 */
import { assertFinite } from './assert';

export interface EmitterOutputInput {
  ratedOutputAtD50W: number;
  flowTempC: number;
  returnTempC: number;
  roomTempC: number;
}

export interface EmitterOutputResult {
  meanWaterTempC: number;
  deltaTActualK: number;
  correctedOutputW: number;
}

export function correctedEmitterOutput(input: EmitterOutputInput): EmitterOutputResult {
  const { ratedOutputAtD50W, flowTempC, returnTempC, roomTempC } = input;
  assertFinite(ratedOutputAtD50W, 'ratedOutputAtD50W');
  assertFinite(flowTempC, 'flowTempC');
  assertFinite(returnTempC, 'returnTempC');
  assertFinite(roomTempC, 'roomTempC');
  const meanWaterTempC = (flowTempC + returnTempC) / 2;
  const deltaTActualK = meanWaterTempC - roomTempC;
  const correctedOutputW = ratedOutputAtD50W * Math.pow(deltaTActualK / 50, 1.3);
  return { meanWaterTempC, deltaTActualK, correctedOutputW };
}

/**
 * Glycol reduces emitter/coil heat transfer by roughly 25% at typical
 * antifreeze concentrations (reduced cp and higher viscosity impair the
 * water-side film coefficient). Apply after the Delta-T correction above.
 */
export function glycolDeratedOutput(correctedOutputW: number, glycolFraction: number): number {
  const DERATE_AT_FULL_CONCENTRATION = 0.25;
  // Linear scaling with concentration, referenced to a ~25% dose giving ~25% derate.
  const derate = Math.min(DERATE_AT_FULL_CONCENTRATION * (glycolFraction / 0.25), 0.4);
  return correctedOutputW * (1 - derate);
}
