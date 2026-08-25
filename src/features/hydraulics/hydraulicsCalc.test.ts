import { describe, it, expect } from 'vitest';
import { computeHydraulics } from './hydraulicsCalc';
import { waterProperties } from '../../calc/fluids';
import type { Circuit } from '../../types/hydraulics';
import type { Survey } from '../../types/survey';

function circuit(overrides: Partial<Circuit> & Pick<Circuit, 'id' | 'parentId'>): Circuit {
  return {
    jobId: 'job-1', label: overrides.id, level: 'GF', branchPoint: 'HP', verticalM: 0, horizontalM: 5,
    fittingEquivalentM: 1, zone: 'zone-1', controlType: 'zone-1', emitterType: 'radiator', roomIds: [],
    loadW: 1000, ...overrides,
  };
}

describe('computeHydraulics', () => {
  const water = waterProperties(45);
  const conditions = { flowTempC: 45, returnTempC: 40 };

  it('rolls up parent load from children and sizes each segment from its own flow', () => {
    const circuits: Circuit[] = [
      circuit({ id: 'trunk', parentId: null, loadW: undefined }),
      circuit({ id: 'a', parentId: 'trunk', loadW: 2000 }),
      circuit({ id: 'b', parentId: 'trunk', loadW: 3000 }),
    ];
    const result = computeHydraulics(circuits, conditions, water, 'velocityAnd300');
    const trunkNode = result.flat.find((n) => n.id === 'trunk')!;
    expect(trunkNode.totalLoadW).toBe(5000);
    // Trunk carries more flow than either leaf, so its auto size should be >= each leaf's.
    const trunkHydraulics = result.byId.get('trunk')!;
    const aHydraulics = result.byId.get('a')!;
    expect(trunkHydraulics.flowLps).toBeGreaterThan(aHydraulics.flowLps);
  });

  it('an engineer pipe-size override changes the effective size and pressure drop, not the auto-suggestion', () => {
    const circuits: Circuit[] = [
      circuit({ id: 'a', parentId: null, loadW: 1000, pipeSizeOverride: { sizeMm: 28, reason: 'Future-proofing for an extension' } }),
    ];
    const result = computeHydraulics(circuits, conditions, water, 'velocityAnd300');
    const h = result.byId.get('a')!;
    expect(h.effectiveSizeMm).toBe(28);
    expect(h.autoSize.size.nominalMm).not.toBe(28); // the auto engine still suggests its own answer underneath
  });

  it('finds the index circuit by cumulative resistance, not load', () => {
    const circuits: Circuit[] = [
      circuit({ id: 'big', parentId: null, loadW: 8000, horizontalM: 2 }),
      circuit({ id: 'small-far', parentId: null, loadW: 300, horizontalM: 70, verticalM: 10 }),
    ];
    const result = computeHydraulics(circuits, conditions, water, 'velocityAnd300');
    expect(result.indexCircuit?.id).toBe('small-far');
  });

  it('returns an empty result for no circuits without throwing', () => {
    const result = computeHydraulics([], conditions, water, 'velocityAnd300');
    expect(result.indexCircuit).toBeNull();
  });

  it('a leaf with an empty roomIds array (no rooms picked yet) does not throw', () => {
    const circuits: Circuit[] = [circuit({ id: 'a', parentId: null, loadW: 0, roomIds: [] })];
    expect(() => computeHydraulics(circuits, conditions, water, 'velocityAnd300')).not.toThrow();
  });

  it('derives load LIVE from the survey, ignoring a stale circuit.loadW cache', () => {
    const survey: Survey = {
      id: 'survey-1', jobId: 'job-1', externalDesignTempC: -3, bridgingFraction: 0.15,
      dataSources: { externalTempSource: 'CIBSE-design-data', uValueSource: 'age-assumption-table', achSource: 'CIBSE-table' },
      rooms: [{
        id: 'room-1', name: 'Kitchen', roomType: 'Kitchen', floor: 'Ground floor', designTempC: 18,
        lengthM: 4, widthM: 3, heightM: 2.4, airChangesPerHour: 1,
        fabric: [{ id: 'f1', label: 'Wall', type: 'wall', areaM2: 10, uValue: 1, bFactor: 'outsideAir' }],
        partitions: [],
      }],
      createdAt: '', updatedAt: '',
    };
    // circuit.loadW is deliberately stale (way off from what the survey room actually produces).
    const circuits: Circuit[] = [circuit({ id: 'a', parentId: null, loadW: 999999, roomIds: ['room-1'] })];
    const result = computeHydraulics(circuits, conditions, water, 'velocityAnd300', survey);
    const node = result.flat.find((n) => n.id === 'a')!;
    // 10m2 * U1 * dT(18 - -3 = 21) = 210W fabric, x1.15 bridging = 241.5W (no ventilation term in this room's volume-based calc omitted here for the test)
    expect(node.totalLoadW).toBeLessThan(1000); // nowhere near the stale 999999 cache
    expect(node.totalLoadW).toBeGreaterThan(0);
  });
});
