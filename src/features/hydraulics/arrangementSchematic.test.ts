import { describe, it, expect } from 'vitest';
import { buildArrangementSchematic, checkContinuous } from './arrangementSchematic';
import type { HydraulicTopology } from '../../types/hydraulics';

const ALL_TOPOLOGIES: HydraulicTopology[] = [
  'direct', 'volumiser', '2-pipe-buffer', '4-pipe-buffer', 'low-loss-header',
  'plate-hx', 'mixed-rads-ufh', 'bivalent-direct', 'bivalent-separated',
];

describe('every arrangement traces continuously from heat pump outlet to the heating circuits and back', () => {
  it.each(ALL_TOPOLOGIES)('%s', (topology) => {
    const bivalent = topology.startsWith('bivalent')
      ? { boilerType: 'system' as const, boilerMaxFlowTempC: 50, boilerServesDhw: false, switchoverTempC: 0 }
      : undefined;
    const schematic = buildArrangementSchematic(topology, 's-plan', bivalent);
    const result = checkContinuous(schematic);
    expect(result.continuous).toBe(true);
    expect(result.unreachable).toEqual([]);
  });
});

describe('DHW take-off position', () => {
  it('is upstream of any separation device, not downstream', () => {
    const schematic = buildArrangementSchematic('4-pipe-buffer', 's-plan');
    const dhwEdge = schematic.edges.find((e) => e.to === 'dhw' || e.from === 'dhw');
    const separationNode = schematic.nodes.find((n) => n.id === 'separation');
    expect(dhwEdge).toBeDefined();
    expect(separationNode).toBeDefined();
    // dhw must appear before separation in the node order (built upstream).
    const dhwIndex = schematic.nodes.findIndex((n) => n.id === 'dhw');
    const separationIndex = schematic.nodes.findIndex((n) => n.id === 'separation');
    expect(dhwIndex).toBeLessThan(separationIndex);
  });
});

describe('the continuity check is not vacuous', () => {
  it('detects a genuinely dangling node with no edge at all', () => {
    const schematic = buildArrangementSchematic('direct', 's-plan');
    schematic.nodes.push({ id: 'orphan', label: 'Orphan node' }); // no edge added
    const result = checkContinuous(schematic);
    expect(result.continuous).toBe(false);
    expect(result.unreachable).toContain('orphan');
  });
});

describe('single-zone systems', () => {
  it('no automatic bypass is added when there is no valve arrangement to close a zone against', () => {
    const schematic = buildArrangementSchematic('direct', 'none');
    expect(schematic.safetyComponents.some((c) => c.id === 'bypass')).toBe(false);
  });
  it('an automatic bypass is present wherever zones can close', () => {
    const schematic = buildArrangementSchematic('direct', 's-plan');
    expect(schematic.safetyComponents.some((c) => c.id === 'bypass')).toBe(true);
  });
});

describe('bivalent', () => {
  it('the boiler branches in with an NRV and its own pump recorded as safety components', () => {
    const schematic = buildArrangementSchematic('bivalent-direct', 's-plan', {
      boilerType: 'system', boilerMaxFlowTempC: 50, boilerServesDhw: false, switchoverTempC: 0,
    });
    expect(schematic.safetyComponents.some((c) => c.id === 'nrv')).toBe(true);
    expect(schematic.safetyComponents.some((c) => c.id === 'boiler-pump')).toBe(true);
  });
});
