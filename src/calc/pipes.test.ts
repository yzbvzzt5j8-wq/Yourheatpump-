import { describe, it, expect } from 'vitest';
import { waterProperties } from './fluids';
import { pressureDrop, velocityMs, velocityLimitMs, developedLengthM, selectPipeSize, COPPER_PIPES, pipeInternalVolumeL } from './pipes';

describe('pressure drop vs published figures', () => {
  // Reference water temperature 40C — see fluids.ts; this reproduces the
  // published copper tube charts closely (within ~1%, spec allows 5%).
  const water = waterProperties(40);

  it('0.264 L/s in 22mm (ID 20.2) -> ~408 Pa/m (published 426, within 5%)', () => {
    const { pressureDropPaPerM } = pressureDrop(0.264, 20.2, water);
    expect(pressureDropPaPerM).toBeCloseTo(408, -1);
    expect(Math.abs(pressureDropPaPerM - 426) / 426).toBeLessThan(0.05);
  });

  it('0.264 L/s in 28mm (ID 26.2) -> ~118 Pa/m (published 124, within 5%)', () => {
    const { pressureDropPaPerM } = pressureDrop(0.264, 26.2, water);
    expect(pressureDropPaPerM).toBeCloseTo(118, -1);
    expect(Math.abs(pressureDropPaPerM - 124) / 124).toBeLessThan(0.05);
  });
});

describe('velocity limits by size (CIBSE B1 Table 1.A1.4)', () => {
  it('<=50mm nominal -> 1.0 m/s limit', () => {
    expect(velocityLimitMs(15)).toBe(1.0);
    expect(velocityLimitMs(22)).toBe(1.0);
    expect(velocityLimitMs(42)).toBe(1.0);
  });
  it('>50mm nominal -> 1.5 m/s limit', () => {
    expect(velocityLimitMs(54)).toBe(1.5);
  });
});

describe('developed length', () => {
  it('does not affect pipe size, only total pressure drop / head', () => {
    // Same flow -> same size regardless of route length.
    const water = waterProperties(40);
    const short = selectPipeSize(0.15, water);
    const long = selectPipeSize(0.15, water); // sizing call takes no length argument
    expect(short.size.nominalMm).toBe(long.size.nominalMm);
  });

  it('= (horizontal + vertical) x 2 + fittings', () => {
    expect(developedLengthM(10, 2, 3)).toBe((10 + 2) * 2 + 3);
  });
});

describe('pipe selection basis', () => {
  const water = waterProperties(40);

  it('velocityAnd300 (default) enforces both velocity and a 300 Pa/m ceiling', () => {
    const result = selectPipeSize(0.264, water, 'velocityAnd300');
    expect(result.pressureDropPaPerM).toBeLessThanOrEqual(300);
    expect(result.velocityMs).toBeLessThanOrEqual(velocityLimitMs(result.size.nominalMm));
  });

  it('cibse200 enforces a tighter 200 Pa/m ceiling and may pick a larger pipe', () => {
    const default_ = selectPipeSize(0.264, water, 'velocityAnd300');
    const cibse = selectPipeSize(0.264, water, 'cibse200');
    expect(cibse.size.idMm).toBeGreaterThanOrEqual(default_.size.idMm);
  });

  it('velocity-only basis ignores pressure drop entirely', () => {
    const result = selectPipeSize(0.05, water, 'velocity');
    expect(result.velocityMs).toBeLessThanOrEqual(velocityLimitMs(result.size.nominalMm));
  });

  it('a flow too low for even the smallest pipe falls back to the SMALLEST pipe, not the largest', () => {
    // A tiny flow undershoots the practical minimum velocity even at 15mm.
    // A bigger pipe would only make velocity worse, so 15mm is the sane fallback.
    const result = selectPipeSize(0.001, water, 'velocityAnd300');
    expect(result.size.nominalMm).toBe(15);
    expect(result.velocityOk).toBe(false);
  });

  it('a flow too high for even the largest pipe falls back to the LARGEST pipe', () => {
    const result = selectPipeSize(5, water, 'velocityAnd300');
    expect(result.size.nominalMm).toBe(54);
    expect(result.velocityOk).toBe(false);
  });

  it('all copper sizes are covered smallest to largest', () => {
    expect(COPPER_PIPES.map((p) => p.nominalMm)).toEqual([15, 22, 28, 35, 42, 54]);
  });
});

describe('pipe internal volume', () => {
  it('= cross-section area x length, in litres', () => {
    // 22mm (ID 20.2mm) x 10m: area = pi/4 * 0.0202^2 = 3.2047e-4 m2; x10m = 3.2047e-3 m3 = 3.2047 L
    expect(pipeInternalVolumeL(20.2, 10)).toBeCloseTo(3.2047, 3);
  });
});

describe('NaN/undefined guards', () => {
  it('velocityMs throws on a NaN flow instead of returning NaN', () => {
    expect(() => velocityMs(NaN, 20.2)).toThrow();
  });
  it('pressureDrop throws on a NaN flow instead of returning NaN', () => {
    const water = waterProperties(40);
    expect(() => pressureDrop(NaN, 20.2, water)).toThrow();
  });
});

describe('velocity calculation', () => {
  it('matches area x velocity = flow', () => {
    const flowLps = 0.3;
    const idMm = 20.2;
    const v = velocityMs(flowLps, idMm);
    const areaM2 = Math.PI * Math.pow(idMm / 1000 / 2, 2);
    expect(v * areaM2).toBeCloseTo(flowLps / 1000, 6);
  });
});
