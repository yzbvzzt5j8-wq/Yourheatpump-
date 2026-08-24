import { describe, it, expect } from 'vitest';
import { estimateSoundPressure, MCS020_NEIGHBOUR_LIMIT_DBA } from './sound';

describe('sound pressure from sound power (never the reverse)', () => {
  it('doubling distance reduces sound pressure by ~6 dB (inverse square law)', () => {
    const near = estimateSoundPressure({ soundPowerLwDbA: 60, distanceM: 5, mountingPosition: 'free', lineOfSightBroken: false });
    const far = estimateSoundPressure({ soundPowerLwDbA: 60, distanceM: 10, mountingPosition: 'free', lineOfSightBroken: false });
    expect(near.soundPressureLpDbA - far.soundPressureLpDbA).toBeCloseTo(6.02, 1);
  });

  it('corner mounting (two reflecting walls) is louder at the same distance than free-standing', () => {
    const free = estimateSoundPressure({ soundPowerLwDbA: 60, distanceM: 5, mountingPosition: 'free', lineOfSightBroken: false });
    const corner = estimateSoundPressure({ soundPowerLwDbA: 60, distanceM: 5, mountingPosition: 'corner', lineOfSightBroken: false });
    expect(corner.soundPressureLpDbA).toBeGreaterThan(free.soundPressureLpDbA);
  });

  it('barrier correction only applies when line of sight is genuinely broken', () => {
    const clear = estimateSoundPressure({ soundPowerLwDbA: 60, distanceM: 5, mountingPosition: 'free', lineOfSightBroken: false });
    const blocked = estimateSoundPressure({ soundPowerLwDbA: 60, distanceM: 5, mountingPosition: 'free', lineOfSightBroken: true });
    expect(clear.barrierCorrectionAppliedDb).toBe(0);
    expect(blocked.barrierCorrectionAppliedDb).toBe(5);
    expect(blocked.soundPressureLpDbA).toBeLessThan(clear.soundPressureLpDbA);
  });

  it('exposes the MCS 020 neighbour limit as 42 dB(A)', () => {
    expect(MCS020_NEIGHBOUR_LIMIT_DBA).toBe(42);
  });
});
