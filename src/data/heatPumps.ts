import type { PumpCurvePoint } from '../calc/pump';

/**
 * Heat pump technical catalogue — output curves, sound power, pump curves,
 * minimum open volume, and glycol limits used by the design and hydraulics
 * calculations. This is SEPARATE from pricing (main equipment is always
 * supplier-quote-required — see data/materials.ts).
 *
 * IMPORTANT: the entries below are ILLUSTRATIVE STARTER DATA for
 * development and UI testing only. They are not sourced from verified
 * manufacturer datasheets. Before this application is used to design a
 * real system, every figure here must be replaced with the actual
 * manufacturer's published performance data for the model being installed.
 * Do not design from these figures.
 */

export interface OutputCurvePoint {
  externalTempC: number;
  outputW: number;
}

export interface HeatPumpPublishedConfiguration {
  id: string;
  label: string;
  /** Output at a reference 45C flow temperature, across external temperatures. */
  outputCurveW: OutputCurvePoint[];
  soundPowerLwDbA: number;
  pumpCurve: PumpCurvePoint[];
  minOpenVolumeL: number;
  maxGlycolConcentrationFraction: number;
}

export interface HeatPumpModel {
  id: string;
  manufacturer: string;
  modelName: string;
  ratedOutputKw: number;
  hybridCapable: boolean;
  configurations: HeatPumpPublishedConfiguration[];
}

export function interpolateOutputCurve(curve: OutputCurvePoint[], externalTempC: number): number {
  const sorted = [...curve].sort((a, b) => a.externalTempC - b.externalTempC);
  if (externalTempC <= sorted[0].externalTempC) return sorted[0].outputW;
  const last = sorted[sorted.length - 1];
  if (externalTempC >= last.externalTempC) return last.outputW;
  for (let i = 0; i < sorted.length - 1; i++) {
    const a = sorted[i];
    const b = sorted[i + 1];
    if (externalTempC >= a.externalTempC && externalTempC <= b.externalTempC) {
      const f = (externalTempC - a.externalTempC) / (b.externalTempC - a.externalTempC);
      return a.outputW + f * (b.outputW - a.outputW);
    }
  }
  return last.outputW;
}

export const HEAT_PUMP_CATALOGUE: HeatPumpModel[] = [
  {
    id: 'hp-illustrative-8kw-monobloc',
    manufacturer: 'Illustrative example — replace before real use',
    modelName: '8kW Monobloc ASHP (example)',
    ratedOutputKw: 8,
    hybridCapable: false,
    configurations: [
      {
        id: 'standard',
        label: 'Standard',
        outputCurveW: [
          { externalTempC: -10, outputW: 6200 },
          { externalTempC: -3, outputW: 7100 },
          { externalTempC: 2, outputW: 8000 },
          { externalTempC: 7, outputW: 8600 },
        ],
        soundPowerLwDbA: 58,
        pumpCurve: [
          { flowLps: 0, headPa: 45000 },
          { flowLps: 0.15, headPa: 42000 },
          { flowLps: 0.3, headPa: 32000 },
          { flowLps: 0.45, headPa: 15000 },
        ],
        minOpenVolumeL: 40,
        maxGlycolConcentrationFraction: 0.3,
      },
      {
        id: 'quiet-mode',
        label: 'Quiet mode',
        outputCurveW: [
          { externalTempC: -10, outputW: 5400 },
          { externalTempC: -3, outputW: 6200 },
          { externalTempC: 2, outputW: 7000 },
          { externalTempC: 7, outputW: 7500 },
        ],
        soundPowerLwDbA: 52,
        pumpCurve: [
          { flowLps: 0, headPa: 40000 },
          { flowLps: 0.15, headPa: 37000 },
          { flowLps: 0.3, headPa: 27000 },
          { flowLps: 0.45, headPa: 11000 },
        ],
        minOpenVolumeL: 40,
        maxGlycolConcentrationFraction: 0.3,
      },
    ],
  },
  {
    id: 'hp-illustrative-12kw-monobloc',
    manufacturer: 'Illustrative example — replace before real use',
    modelName: '12kW Monobloc ASHP (example)',
    ratedOutputKw: 12,
    hybridCapable: true,
    configurations: [
      {
        id: 'standard',
        label: 'Standard',
        outputCurveW: [
          { externalTempC: -10, outputW: 9200 },
          { externalTempC: -3, outputW: 10600 },
          { externalTempC: 2, outputW: 11900 },
          { externalTempC: 7, outputW: 12800 },
        ],
        soundPowerLwDbA: 61,
        pumpCurve: [
          { flowLps: 0, headPa: 50000 },
          { flowLps: 0.2, headPa: 46000 },
          { flowLps: 0.4, headPa: 34000 },
          { flowLps: 0.6, headPa: 14000 },
        ],
        minOpenVolumeL: 50,
        maxGlycolConcentrationFraction: 0.3,
      },
    ],
  },
];
