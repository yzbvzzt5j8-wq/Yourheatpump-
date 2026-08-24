/**
 * MCS compliance checks (Part 2 of the build spec). This module checks a
 * design against MCS sizing and scope rules and reports pass/fail with the
 * actual figures — it does not, and must never claim to, constitute MCS
 * certification. Certified documentation and MCS database registration
 * happen outside this application.
 */

export interface SizingComplianceInput {
  isHybrid: boolean;
  designHeatLossW: number;
  /** Heat pump's own output at design conditions, EXCLUDING supplementary/backup heat. */
  heatPumpOutputAtDesignConditionsW: number;
  /**
   * Hybrids only (MIS 3005-D, 2025 revision): heat pump output at 55C flow.
   * The 100% rule does not apply to hybrids — instead >=55% of load must be
   * met by the heat pump at 55C flow.
   */
  hybridOutputAt55FlowW?: number;
}

export interface SizingComplianceResult {
  rule: '100%-of-load' | 'hybrid-55%-at-55C';
  requiredW: number;
  actualW: number;
  percentageOfLoadMet: number;
  pass: boolean;
}

export function checkSizingCompliance(input: SizingComplianceInput): SizingComplianceResult {
  const { isHybrid, designHeatLossW } = input;
  if (isHybrid) {
    const requiredW = designHeatLossW * 0.55;
    const actualW = input.hybridOutputAt55FlowW ?? 0;
    return {
      rule: 'hybrid-55%-at-55C',
      requiredW,
      actualW,
      percentageOfLoadMet: actualW / designHeatLossW,
      pass: actualW >= requiredW,
    };
  }
  const requiredW = designHeatLossW;
  const actualW = input.heatPumpOutputAtDesignConditionsW;
  return {
    rule: '100%-of-load',
    requiredW,
    actualW,
    percentageOfLoadMet: actualW / designHeatLossW,
    pass: actualW >= requiredW,
  };
}

export const MCS_SCOPE_TOTAL_LIMIT_KW = 70;
export const MCS_SCOPE_PER_UNIT_LIMIT_KW = 45;

export interface ScopeCheckInput {
  /** Output of each unit in a multi-unit installation, kW. */
  unitOutputsKw: number[];
}

export interface ScopeCheckResult {
  totalOutputKw: number;
  totalOk: boolean;
  perUnitOk: boolean;
  /** Indices of units (into unitOutputsKw) exceeding the per-unit limit. */
  failingUnitIndices: number[];
  pass: boolean;
}

export function checkMcsScope(input: ScopeCheckInput): ScopeCheckResult {
  const totalOutputKw = input.unitOutputsKw.reduce((sum, kw) => sum + kw, 0);
  const totalOk = totalOutputKw <= MCS_SCOPE_TOTAL_LIMIT_KW;
  const failingUnitIndices = input.unitOutputsKw
    .map((kw, i) => (kw > MCS_SCOPE_PER_UNIT_LIMIT_KW ? i : -1))
    .filter((i) => i >= 0);
  const perUnitOk = failingUnitIndices.length === 0;
  return { totalOutputKw, totalOk, perUnitOk, failingUnitIndices, pass: totalOk && perUnitOk };
}

/**
 * MCS 021 emitter band (A-F) from design flow temperature. Thresholds
 * below follow the commonly published MCS 021 banding; VERIFY against the
 * current live MCS 021 document before relying on this for a customer-facing
 * report — the standard is periodically revised.
 */
export type EmitterBand = 'A' | 'B' | 'C' | 'D' | 'E' | 'F';

const EMITTER_BAND_THRESHOLDS: { maxFlowTempC: number; band: EmitterBand }[] = [
  { maxFlowTempC: 35, band: 'A' },
  { maxFlowTempC: 40, band: 'B' },
  { maxFlowTempC: 45, band: 'C' },
  { maxFlowTempC: 50, band: 'D' },
  { maxFlowTempC: 55, band: 'E' },
  { maxFlowTempC: Infinity, band: 'F' },
];

export function emitterBandFromFlowTemp(designFlowTempC: number): EmitterBand {
  const match = EMITTER_BAND_THRESHOLDS.find((t) => designFlowTempC <= t.maxFlowTempC);
  return (match ?? EMITTER_BAND_THRESHOLDS[EMITTER_BAND_THRESHOLDS.length - 1]).band;
}
