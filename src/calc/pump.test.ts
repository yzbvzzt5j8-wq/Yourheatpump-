import { describe, it, expect } from 'vitest';
import { evaluatePumpDuty, pumpHeadAtFlow } from './pump';

const curve = [
  { flowLps: 0, headPa: 60000 },
  { flowLps: 0.2, headPa: 50000 },
  { flowLps: 0.4, headPa: 35000 },
  { flowLps: 0.6, headPa: 15000 },
];

describe('pump curve interpolation', () => {
  it('interpolates linearly between points', () => {
    expect(pumpHeadAtFlow(curve, 0.3)).toBeCloseTo(42500, 6);
  });
  it('clamps below the lowest flow point', () => {
    expect(pumpHeadAtFlow(curve, -1)).toBe(60000);
  });
  it('clamps above the highest flow point', () => {
    expect(pumpHeadAtFlow(curve, 5)).toBe(15000);
  });
});

describe('NaN/undefined guards', () => {
  it('throws on a NaN pressure drop input rather than propagating NaN into the pass/fail result', () => {
    expect(() =>
      evaluatePumpDuty({
        indexPathPressureDropPa: NaN, plantPressureDropPa: 5000, emitterPressureDropPa: 3000,
        marginFraction: 0.1, designFlowLps: 0.2, pumpCurve: curve,
      }),
    ).toThrow();
  });
});

describe('pump duty pass/fail', () => {
  it('passes when available head at design flow exceeds required head + margin', () => {
    const result = evaluatePumpDuty({
      indexPathPressureDropPa: 10000,
      plantPressureDropPa: 5000,
      emitterPressureDropPa: 3000,
      marginFraction: 0.1,
      designFlowLps: 0.2,
      pumpCurve: curve,
    });
    // required = 18000 * 1.1 = 19800; available at 0.2 L/s = 50000
    expect(result.requiredHeadPa).toBeCloseTo(19800, 6);
    expect(result.availableHeadPa).toBe(50000);
    expect(result.pass).toBe(true);
  });

  it('fails when the index circuit needs more head than the pump curve gives at that flow', () => {
    const result = evaluatePumpDuty({
      indexPathPressureDropPa: 30000,
      plantPressureDropPa: 8000,
      emitterPressureDropPa: 5000,
      marginFraction: 0.1,
      designFlowLps: 0.6,
      pumpCurve: curve,
    });
    // required = 43000 * 1.1 = 47300; available at 0.6 L/s = 15000
    expect(result.pass).toBe(false);
    expect(result.marginPa).toBeLessThan(0);
  });
});
