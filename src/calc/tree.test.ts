import { describe, it, expect } from 'vitest';
import { buildCircuitTree, findIndexCircuit, flattenTree, type CircuitInput } from './tree';

describe('load roll-up', () => {
  it("a parent's load is the sum of its children; only leaves carry entered loads", () => {
    const circuits: CircuitInput[] = [
      { id: 'hp', parentId: null, label: 'Heat pump', level: 'Plant', branchPoint: 'HP', verticalM: 0, zone: 'always-open', segmentPressureDropPa: 0 },
      { id: 'gf', parentId: 'hp', label: 'Ground floor', level: 'GF', branchPoint: 'HP', verticalM: 0, zone: 'zone-1', segmentPressureDropPa: 500 },
      { id: 'kitchen', parentId: 'gf', label: 'GF — Kitchen', level: 'GF', branchPoint: 'GF manifold', verticalM: 0, zone: 'zone-1', loadW: 800, segmentPressureDropPa: 300 },
      { id: 'lounge', parentId: 'gf', label: 'GF — Lounge', level: 'GF', branchPoint: 'GF manifold', verticalM: 0, zone: 'zone-1', loadW: 1200, segmentPressureDropPa: 200 },
    ];
    const roots = buildCircuitTree(circuits);
    const flat = flattenTree(roots);
    const gf = flat.find((n) => n.id === 'gf')!;
    const hp = flat.find((n) => n.id === 'hp')!;
    expect(gf.totalLoadW).toBe(2000);
    expect(hp.totalLoadW).toBe(2000);
  });

  it('throws if a leaf has no entered load', () => {
    const circuits: CircuitInput[] = [
      { id: 'hp', parentId: null, label: 'Heat pump', level: 'Plant', branchPoint: 'HP', verticalM: 0, zone: 'always-open', segmentPressureDropPa: 0 },
    ];
    expect(() => buildCircuitTree(circuits)).toThrow();
  });
});

describe('index circuit detection', () => {
  it('the smallest radiator at the end of the longest route must be the index — not the biggest load, not the longest pipe', () => {
    const circuits: CircuitInput[] = [
      { id: 'hp', parentId: null, label: 'Heat pump', level: 'Plant', branchPoint: 'HP', verticalM: 0, zone: 'always-open', segmentPressureDropPa: 0 },
      // Branch A: short run, big load, low resistance (large pipe).
      { id: 'a', parentId: 'hp', label: 'Branch A', level: 'GF', branchPoint: 'HP', verticalM: 0, zone: 'zone-1', loadW: 8000, segmentPressureDropPa: 50 },
      // Branch B: long run to a small radiator, but through narrow pipe -> high resistance.
      { id: 'b', parentId: 'hp', label: 'Branch B', level: 'FF', branchPoint: 'HP', verticalM: 3, zone: 'zone-2', segmentPressureDropPa: 400 },
      { id: 'b-rad', parentId: 'b', label: 'FF — small bedroom rad', level: 'FF', branchPoint: 'FF riser', verticalM: 0, zone: 'zone-2', loadW: 400, segmentPressureDropPa: 900 },
    ];
    const roots = buildCircuitTree(circuits);
    const index = findIndexCircuit(roots);
    expect(index.id).toBe('b-rad');
    expect(index.totalLoadW).toBe(400); // smallest load, but highest resistance path
  });

  it('unknown parent id throws rather than silently dropping the circuit', () => {
    const circuits: CircuitInput[] = [
      { id: 'orphan', parentId: 'missing', label: 'Orphan', level: 'GF', branchPoint: 'x', verticalM: 0, zone: 'z', loadW: 100, segmentPressureDropPa: 10 },
    ];
    expect(() => buildCircuitTree(circuits)).toThrow();
  });
});
