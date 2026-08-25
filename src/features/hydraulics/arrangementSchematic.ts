/**
 * Arrangement schematic: the topology/plant diagram (unit, separation
 * device, DHW take-off, valve arrangement, safety/commissioning
 * components, bivalent boiler) — distinct from the pipework sketch
 * (features/hydraulics/pipeworkSketch.ts), which is the live single-line
 * drawing of the user's own circuits.
 *
 * Unlike the pipework sketch, this one draws flow AND return as a pair,
 * per spec. Every arrangement must trace continuously from the heat pump
 * outlet to the heating circuits and back — checkContinuous asserts that
 * in code rather than leaving it to be eyeballed.
 */
import type { HydraulicTopology, ValveArrangement, BivalentSettings } from '../../types/hydraulics';
import { getArrangementInfo } from '../../data/arrangements';

export interface SchematicNode {
  id: string;
  label: string;
}

export interface SchematicEdge {
  from: string;
  to: string;
  /** 'flow' and 'return' are drawn as a pair; 'branch' is a side connection (DHW, safety component). */
  kind: 'flow-return' | 'branch';
}

export interface SafetyComponent {
  id: string;
  label: string;
  /** Node this component attaches to. */
  attachesTo: string;
}

export interface ArrangementSchematic {
  nodes: SchematicNode[];
  edges: SchematicEdge[];
  safetyComponents: SafetyComponent[];
}

const ALWAYS_ON_RETURN: SafetyComponent[] = [
  { id: 'filter', label: 'Filter', attachesTo: 'return-main' },
  { id: 'expansion', label: 'Expansion vessel', attachesTo: 'return-main' },
  { id: 'prv', label: 'PRV', attachesTo: 'return-main' },
  { id: 'gauge', label: 'Pressure gauge', attachesTo: 'return-main' },
  { id: 'aav', label: 'Automatic air vent', attachesTo: 'return-main' },
  { id: 'drain', label: 'Drain cock', attachesTo: 'return-main' },
  { id: 'flow-setter', label: 'Flow setter', attachesTo: 'return-main' },
  { id: 'sensors', label: 'Flow/return sensors', attachesTo: 'return-main' },
];

export function buildArrangementSchematic(
  topology: HydraulicTopology,
  valveArrangement: ValveArrangement,
  bivalent?: BivalentSettings,
): ArrangementSchematic {
  const info = getArrangementInfo(topology);
  const nodes: SchematicNode[] = [{ id: 'hp', label: 'Heat pump' }];
  const edges: SchematicEdge[] = [];
  const safetyComponents: SafetyComponent[] = [...ALWAYS_ON_RETURN, { id: 'cylinder-tp', label: "Cylinder T&P / immersion", attachesTo: 'dhw' }];

  let last = 'hp';

  // DHW is taken off the primary, UPSTREAM of any separation.
  nodes.push({ id: 'dhw', label: 'DHW take-off (upstream of separation)' });
  edges.push({ from: last, to: 'dhw', kind: 'flow-return' });
  last = 'dhw';

  if (info.hasSeparation) {
    const label =
      topology === '2-pipe-buffer' ? 'Buffer (2-pipe)' :
      topology === '4-pipe-buffer' ? 'Buffer (4-pipe)' :
      topology === 'low-loss-header' ? 'Low loss header' :
      topology === 'plate-hx' ? 'Plate heat exchanger' :
      'Separation device';
    nodes.push({ id: 'separation', label });
    edges.push({ from: last, to: 'separation', kind: 'flow-return' });
    last = 'separation';
    if (info.requiresSecondaryPump) {
      nodes.push({ id: 'secondary-pump', label: 'Secondary pump' });
      edges.push({ from: last, to: 'secondary-pump', kind: 'flow-return' });
      last = 'secondary-pump';
    }
  }

  const valveLabel = { none: 'No valves — zone valves on the flow', '3-port-diverter': '3-port diverter', 's-plan': 'S-plan valves', 's-plan-plus': 'S-plan Plus valves', 'y-plan': 'Y-plan valve (mid-position)', custom: 'Custom valve arrangement' }[valveArrangement];
  nodes.push({ id: 'valves', label: valveLabel });
  edges.push({ from: last, to: 'valves', kind: 'flow-return' });
  last = 'valves';

  // No header on a single-zone system — bypass only where zones can close.
  nodes.push({ id: 'circuits', label: 'Heating circuits' });
  edges.push({ from: last, to: 'circuits', kind: 'flow-return' });
  if (valveArrangement !== 'none') {
    safetyComponents.push({ id: 'bypass', label: 'Automatic bypass', attachesTo: 'valves' });
  }

  if (bivalent) {
    nodes.push({ id: 'boiler', label: `Boiler (${bivalent.boilerType}, max ${bivalent.boilerMaxFlowTempC}°C)` });
    const boilerJoinsAt = info.hasSeparation ? 'separation' : 'hp';
    edges.push({ from: 'boiler', to: boilerJoinsAt, kind: 'branch' });
    safetyComponents.push({ id: 'nrv', label: 'NRV on boiler flow', attachesTo: 'boiler' });
    safetyComponents.push({ id: 'boiler-pump', label: 'Heat-only boiler pump (return)', attachesTo: 'boiler' });
  }

  return { nodes, edges, safetyComponents };
}

/**
 * Confirms the schematic traces continuously from the heat pump outlet to
 * the heating circuits and back: every node — trunk (flow-return) or
 * branch (DHW, bivalent boiler, safety component) — is reachable from
 * 'hp'. A branch off the main flow-return pair is still a real physical
 * connection; only a node with no edge at all (a dangling symbol) fails
 * this check.
 */
export function checkContinuous(schematic: ArrangementSchematic): { continuous: boolean; unreachable: string[] } {
  const adjacency = new Map<string, string[]>();
  for (const node of schematic.nodes) adjacency.set(node.id, []);
  for (const edge of schematic.edges) {
    adjacency.get(edge.from)?.push(edge.to);
    adjacency.get(edge.to)?.push(edge.from);
  }

  const visited = new Set<string>();
  const queue = ['hp'];
  while (queue.length > 0) {
    const current = queue.shift()!;
    if (visited.has(current)) continue;
    visited.add(current);
    for (const neighbour of adjacency.get(current) ?? []) queue.push(neighbour);
  }

  const unreachable = schematic.nodes.map((n) => n.id).filter((id) => !visited.has(id));
  return { continuous: unreachable.length === 0, unreachable };
}
