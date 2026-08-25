import { describe, it, expect } from 'vitest';
import { generateBom } from './bomGenerator';
import { computeHydraulics } from '../hydraulics/hydraulicsCalc';
import { waterProperties } from '../../calc/fluids';
import { computeSystemVolume } from '../../calc/volume';
import { MATERIALS_CATALOGUE } from '../../data/materials';
import type { Circuit, HydraulicArrangement } from '../../types/hydraulics';
import type { Design } from '../../types/design';

function baseDesign(): Design {
  return {
    id: 'design-1', jobId: 'job-1', surveyId: 'survey-1',
    designConditions: { flowTempC: 45, returnTempC: 40 },
    heatPump: { modelId: 'm', publishedConfigurationId: 'c', outputAtDesignConditionsW: 8000, isHybrid: false, unitCount: 1 },
    dhw: { cylinderVolumeL: 210, designTempC: 55, pasteurisationCycleEnabled: true, heatExchangerSpecRef: '', diverterValveType: '3-port' },
    sound: { mountingPosition: 'free', distanceToNeighbourM: 3, lineOfSightBroken: false },
    createdAt: '', updatedAt: '',
  };
}

function baseArrangement(overrides: Partial<HydraulicArrangement> = {}): HydraulicArrangement {
  return {
    id: 'arr-1', jobId: 'job-1', designId: 'design-1', topology: 'direct', valveArrangement: 's-plan',
    antifreeze: { glycolType: 'none', concentrationFraction: 0 },
    volumiser: { fitted: false, sizeL: null },
    createdAt: '', updatedAt: '', ...overrides,
  };
}

describe('generateBom', () => {
  const water = waterProperties(42.5);
  const circuits: Circuit[] = [
    {
      id: 'a', jobId: 'job-1', parentId: null, label: 'GF — Kitchen', level: 'GF', branchPoint: 'HP',
      verticalM: 0, horizontalM: 5, fittingEquivalentM: 1, zone: 'zone-1', controlType: 'zone-1',
      emitterType: 'radiator', roomIds: [], loadW: 1000,
    },
  ];
  const hydraulics = computeHydraulics(circuits, { flowTempC: 45, returnTempC: 40 }, water, 'velocityAnd300');
  const volumeResult = computeSystemVolume({ areas: [], manufacturerMinimumOpenVolumeL: 40 });

  it('generates a pipework line sized from the actual developed length, with a reason', () => {
    const { lines } = generateBom({
      jobId: 'job-1', circuits, hydraulics, arrangement: baseArrangement(), design: baseDesign(),
      volumeResult, catalogue: MATERIALS_CATALOGUE,
    });
    const pipeLine = lines.find((l) => l.reason.includes('developed length'));
    expect(pipeLine).toBeDefined();
    expect(pipeLine!.quantity).toBeGreaterThan(0);
    expect(pipeLine!.engineerConfirmed).toBe(false);
  });

  it('every line requires engineer confirmation before it counts toward the quotation', () => {
    const { lines } = generateBom({
      jobId: 'job-1', circuits, hydraulics, arrangement: baseArrangement(), design: baseDesign(),
      volumeResult, catalogue: MATERIALS_CATALOGUE,
    });
    expect(lines.every((l) => l.engineerConfirmed === false)).toBe(true);
  });

  it('sizes glycol from system volume x concentration, not a flat guess', () => {
    const arrangement = baseArrangement({ antifreeze: { glycolType: 'propylene-glycol', concentrationFraction: 0.25 } });
    const volume = computeSystemVolume({ areas: [{ id: 'x', label: 'x', volumeL: 100, hasIsolatingValve: false }], manufacturerMinimumOpenVolumeL: 40 });
    const { lines } = generateBom({ jobId: 'job-1', circuits, hydraulics, arrangement, design: baseDesign(), volumeResult: volume, catalogue: MATERIALS_CATALOGUE });
    const glycolLine = lines.find((l) => l.reason.includes('concentration'));
    expect(glycolLine).toBeDefined();
    // 100L total volume x 25% = 25L needed -> ceil(25/20) = 2 drums
    expect(glycolLine!.quantity).toBe(2);
  });

  it('never auto-adds a volumiser line unless the arrangement already records one fitted', () => {
    const { lines } = generateBom({
      jobId: 'job-1', circuits, hydraulics, arrangement: baseArrangement({ volumiser: { fitted: false, sizeL: null } }),
      design: baseDesign(), volumeResult, catalogue: MATERIALS_CATALOGUE,
    });
    expect(lines.some((l) => l.reason.toLowerCase().includes('volumiser') || l.materialId.includes('volumiser'))).toBe(false);
  });

  it('main equipment lines never carry a fabricated price — the catalogue entries are quote-required with no supplierPrices', () => {
    const { lines } = generateBom({
      jobId: 'job-1', circuits, hydraulics, arrangement: baseArrangement(), design: baseDesign(),
      volumeResult, catalogue: MATERIALS_CATALOGUE,
    });
    const outdoorUnitLine = lines.find((l) => {
      const m = MATERIALS_CATALOGUE.find((mat) => mat.id === l.materialId);
      return m?.productName === 'Outdoor unit';
    });
    expect(outdoorUnitLine).toBeDefined();
    const material = MATERIALS_CATALOGUE.find((m) => m.id === outdoorUnitLine!.materialId)!;
    expect(material.status).toBe('supplier-quote-required');
    expect(material.supplierPrices.length).toBe(0);
  });

  it('warns rather than silently inventing a line for a size with no catalogue match', () => {
    const oddCircuits: Circuit[] = [{ ...circuits[0], id: 'b', horizontalM: 200, loadW: 40000 }]; // forces a large pipe size
    const oddHydraulics = computeHydraulics(oddCircuits, { flowTempC: 45, returnTempC: 40 }, water, 'velocityAnd300');
    const { warnings } = generateBom({
      jobId: 'job-1', circuits: oddCircuits, hydraulics: oddHydraulics, arrangement: baseArrangement(), design: baseDesign(),
      volumeResult, catalogue: MATERIALS_CATALOGUE,
    });
    expect(warnings.length).toBeGreaterThan(0);
  });
});
