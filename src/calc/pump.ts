/**
 * Pump duty: does the circulator deliver design flow through the index
 * circuit? The relevant metric is head at the INDEX circuit's flow rate,
 * not the raw Pa/m figure of any one pipe.
 */

export interface PumpCurvePoint {
  flowLps: number;
  headPa: number;
}

/** Linear interpolation of a manufacturer pump curve (flow -> available head). */
export function pumpHeadAtFlow(curve: PumpCurvePoint[], flowLps: number): number {
  const sorted = [...curve].sort((a, b) => a.flowLps - b.flowLps);
  if (flowLps <= sorted[0].flowLps) return sorted[0].headPa;
  const last = sorted[sorted.length - 1];
  if (flowLps >= last.flowLps) return last.headPa;
  for (let i = 0; i < sorted.length - 1; i++) {
    const a = sorted[i];
    const b = sorted[i + 1];
    if (flowLps >= a.flowLps && flowLps <= b.flowLps) {
      const f = (flowLps - a.flowLps) / (b.flowLps - a.flowLps);
      return a.headPa + f * (b.headPa - a.headPa);
    }
  }
  return last.headPa;
}

export interface PumpDutyInput {
  /** Cumulative pressure drop along the index circuit's pipe path, Pa. */
  indexPathPressureDropPa: number;
  /** Pressure drop through plant (heat pump HX, buffer, LLH, valves), Pa. */
  plantPressureDropPa: number;
  /** Pressure drop through the index circuit's emitter(s)/TRV, Pa. */
  emitterPressureDropPa: number;
  /** Safety margin applied to the summed required head, e.g. 0.1 for 10%. */
  marginFraction: number;
  designFlowLps: number;
  pumpCurve: PumpCurvePoint[];
}

export interface PumpDutyResult {
  requiredHeadPa: number;
  availableHeadPa: number;
  marginPa: number;
  pass: boolean;
}

export function evaluatePumpDuty(input: PumpDutyInput): PumpDutyResult {
  const { indexPathPressureDropPa, plantPressureDropPa, emitterPressureDropPa, marginFraction, designFlowLps, pumpCurve } = input;
  const subtotal = indexPathPressureDropPa + plantPressureDropPa + emitterPressureDropPa;
  const requiredHeadPa = subtotal * (1 + marginFraction);
  const availableHeadPa = pumpHeadAtFlow(pumpCurve, designFlowLps);
  return {
    requiredHeadPa,
    availableHeadPa,
    marginPa: availableHeadPa - requiredHeadPa,
    pass: availableHeadPa >= requiredHeadPa,
  };
}
