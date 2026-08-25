import { describe, it, expect } from 'vitest';
import { calculateRoomHeatLoss, B_FACTORS } from './heatloss';

describe('heat loss b-factors', () => {
  it('15 m2 floor over garage, U 0.5, 21C in / -3C out -> 90 W (not 180 W)', () => {
    const result = calculateRoomHeatLoss({
      roomTempC: 21,
      externalTempC: -3,
      fabric: [{ label: 'Floor over garage', areaM2: 15, uValue: 0.5, bFactor: 'unheatedSpace' }],
      volumeM3: 0,
      airChangesPerHour: 0,
      bridgingFraction: 0,
    });
    expect(result.fabricW).toBeCloseTo(90, 6);
    expect(result.totalW).toBeCloseTo(90, 6);
  });

  it('party wall to a heated neighbour contributes zero, not full external dT', () => {
    const result = calculateRoomHeatLoss({
      roomTempC: 21,
      externalTempC: -3,
      fabric: [{ label: 'Party wall', areaM2: 10, uValue: 1.0, bFactor: 'partyWallHeated' }],
      volumeM3: 0,
      airChangesPerHour: 0,
      bridgingFraction: 0,
    });
    expect(result.fabricW).toBe(0);
  });

  it('exposes all b-factors from the spec table', () => {
    expect(B_FACTORS.outsideAir).toBe(1.0);
    expect(B_FACTORS.groundFloor).toBe(0.7);
    expect(B_FACTORS.unheatedSpace).toBe(0.5);
    expect(B_FACTORS.ventilatedLoft).toBe(0.9);
    expect(B_FACTORS.warmRoof).toBe(1.0);
    expect(B_FACTORS.partyWallHeated).toBe(0.0);
    expect(B_FACTORS.partyWallUnknown).toBe(0.3);
    expect(B_FACTORS.belowGround).toBe(0.6);
  });
});

describe('partitions', () => {
  it('8 m2 partition, U 2.0, 22C to 18C -> 64 W', () => {
    const result = calculateRoomHeatLoss({
      roomTempC: 22,
      externalTempC: 22, // no fabric loss in this case, isolate partition
      fabric: [],
      partitions: [{ label: 'Wall to landing', areaM2: 8, uValue: 2.0, adjacentRoomTempC: 18 }],
      volumeM3: 0,
      airChangesPerHour: 0,
      bridgingFraction: 0,
    });
    expect(result.partitionsW).toBeCloseTo(64, 6);
  });

  it('a partition to a WARMER adjacent room contributes zero, never negative', () => {
    const result = calculateRoomHeatLoss({
      roomTempC: 18,
      externalTempC: 18,
      fabric: [],
      partitions: [{ label: 'Wall from bathroom', areaM2: 8, uValue: 2.0, adjacentRoomTempC: 22 }],
      volumeM3: 0,
      airChangesPerHour: 0,
      bridgingFraction: 0,
    });
    expect(result.partitionsW).toBe(0);
  });
});

describe('NaN/undefined guards', () => {
  it('throws rather than silently propagating NaN from an empty form field', () => {
    expect(() =>
      calculateRoomHeatLoss({
        roomTempC: NaN, externalTempC: -3, fabric: [], volumeM3: 10, airChangesPerHour: 1, bridgingFraction: 0.15,
      }),
    ).toThrow();
  });

  it('throws on a NaN fabric element area instead of silently zeroing it out', () => {
    expect(() =>
      calculateRoomHeatLoss({
        roomTempC: 21, externalTempC: -3,
        fabric: [{ label: 'Wall', areaM2: NaN, uValue: 1, bFactor: 'outsideAir' }],
        volumeM3: 10, airChangesPerHour: 1, bridgingFraction: 0.15,
      }),
    ).toThrow();
  });

  it('throws on a NaN partition temperature instead of the `dT > 0` guard silently treating it as zero loss', () => {
    expect(() =>
      calculateRoomHeatLoss({
        roomTempC: 21, externalTempC: -3, fabric: [],
        partitions: [{ label: 'Wall', areaM2: 5, uValue: 1, adjacentRoomTempC: NaN }],
        volumeM3: 10, airChangesPerHour: 1, bridgingFraction: 0.15,
      }),
    ).toThrow();
  });
});

describe('ventilation and totals', () => {
  it('ventilation = 0.33 x ACH x volume x dT', () => {
    const result = calculateRoomHeatLoss({
      roomTempC: 21,
      externalTempC: 1,
      fabric: [],
      volumeM3: 50,
      airChangesPerHour: 1.5,
      bridgingFraction: 0,
    });
    // 0.33 * 1.5 * 50 * 20 = 495
    expect(result.ventilationW).toBeCloseTo(495, 6);
  });

  it('bridging % applies to fabric + partitions but not ventilation', () => {
    const result = calculateRoomHeatLoss({
      roomTempC: 21,
      externalTempC: 1,
      fabric: [{ label: 'Wall', areaM2: 10, uValue: 1, bFactor: 'outsideAir' }],
      volumeM3: 10,
      airChangesPerHour: 1,
      bridgingFraction: 0.15,
    });
    const fabricW = 10 * 1 * 20 * 1; // 200
    const ventW = 0.33 * 1 * 10 * 20; // 66
    expect(result.totalW).toBeCloseTo(fabricW * 1.15 + ventW, 6);
  });
});
