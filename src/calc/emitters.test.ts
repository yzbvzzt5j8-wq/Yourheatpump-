import { describe, it, expect } from 'vitest';
import { correctedEmitterOutput, glycolDeratedOutput } from './emitters';

describe('emitter output correction', () => {
  it('1500 W at 45/40 into 21C -> mean 42.5, dT 21.5 -> ~505 W', () => {
    const result = correctedEmitterOutput({
      ratedOutputAtD50W: 1500,
      flowTempC: 45,
      returnTempC: 40,
      roomTempC: 21,
    });
    expect(result.meanWaterTempC).toBe(42.5);
    expect(result.deltaTActualK).toBe(21.5);
    expect(result.correctedOutputW).toBeCloseTo(505, -1); // within ~5 W of 505
  });

  it('output at exactly D50 test condition returns the rated figure', () => {
    const result = correctedEmitterOutput({
      ratedOutputAtD50W: 1000,
      flowTempC: 75,
      returnTempC: 65,
      roomTempC: 20, // mean 70, dT 50
    });
    expect(result.correctedOutputW).toBeCloseTo(1000, 6);
  });

  it('lower flow temperature reduces output substantially (low-temp emitter sizing)', () => {
    const highTemp = correctedEmitterOutput({ ratedOutputAtD50W: 1000, flowTempC: 70, returnTempC: 60, roomTempC: 20 });
    const lowTemp = correctedEmitterOutput({ ratedOutputAtD50W: 1000, flowTempC: 45, returnTempC: 40, roomTempC: 20 });
    expect(lowTemp.correctedOutputW).toBeLessThan(highTemp.correctedOutputW);
  });
});

describe('NaN/undefined guards', () => {
  it('throws on a NaN input rather than returning NaN correctedOutputW', () => {
    expect(() => correctedEmitterOutput({ ratedOutputAtD50W: NaN, flowTempC: 45, returnTempC: 40, roomTempC: 21 })).toThrow();
  });
});

describe('glycol derate on emitter output', () => {
  it('25% glycol derates emitter output by ~25%', () => {
    const derated = glycolDeratedOutput(1000, 0.25);
    expect(derated).toBeCloseTo(750, 6);
  });

  it('zero glycol applies no derate', () => {
    expect(glycolDeratedOutput(1000, 0)).toBe(1000);
  });
});
