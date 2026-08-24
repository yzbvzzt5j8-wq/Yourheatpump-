import type { HydraulicTopology } from '../types/hydraulics';

export interface ArrangementInfo {
  topology: HydraulicTopology;
  label: string;
  description: string;
  /** True if a separation device (buffer/LLH/plate HX) sits between HP and heating circuits. */
  hasSeparation: boolean;
  /** Number of physical connections the separation device makes into the primary (0 if none). */
  separationConnections: number;
  requiresSecondaryPump: boolean;
  bivalent: boolean;
}

/**
 * The nine hydraulic topologies (spec Part 3). All arrangement decisions —
 * unit configuration, volumiser verdict, valve arrangement, topology,
 * schematic, separation advice and bivalent settings — live on one screen
 * (features/hydraulics/ArrangementScreen) so they cannot disagree with
 * each other.
 */
export const ARRANGEMENTS: ArrangementInfo[] = [
  {
    topology: 'direct',
    label: 'Direct',
    description: 'Heat pump primary feeds the heating circuits directly, no separation device.',
    hasSeparation: false, separationConnections: 0, requiresSecondaryPump: false, bivalent: false,
  },
  {
    topology: 'volumiser',
    label: 'Volumiser',
    description: 'A volumiser is plumbed in series (normally on the return) to make up open volume. All water passes through — no mixing, no temperature penalty.',
    hasSeparation: false, separationConnections: 2, requiresSecondaryPump: false, bivalent: false,
  },
  {
    topology: '2-pipe-buffer',
    label: '2-pipe buffer',
    description: 'Buffer vessel in series with the primary, two connections.',
    hasSeparation: true, separationConnections: 2, requiresSecondaryPump: false, bivalent: false,
  },
  {
    topology: '4-pipe-buffer',
    label: '4-pipe buffer',
    description: 'Buffer vessel with four connections, hydraulically separating primary and secondary sides. Requires a secondary pump.',
    hasSeparation: true, separationConnections: 4, requiresSecondaryPump: true, bivalent: false,
  },
  {
    topology: 'low-loss-header',
    label: 'Low loss header',
    description: 'Low loss header hydraulically separates the heat pump primary from the distribution circuits. Requires a secondary pump.',
    hasSeparation: true, separationConnections: 4, requiresSecondaryPump: true, bivalent: false,
  },
  {
    topology: 'plate-hx',
    label: 'Plate heat exchanger',
    description: 'Plate HX fully separates primary and secondary fluids — typically used where the primary is glycol-dosed and the secondary is not.',
    hasSeparation: true, separationConnections: 4, requiresSecondaryPump: true, bivalent: false,
  },
  {
    topology: 'mixed-rads-ufh',
    label: 'Mixed radiators + UFH',
    description: 'Radiator circuits and underfloor heating circuits on the same primary, typically via a blending valve set on the UFH manifold.',
    hasSeparation: false, separationConnections: 0, requiresSecondaryPump: false, bivalent: false,
  },
  {
    topology: 'bivalent-direct',
    label: 'Bivalent — direct',
    description: 'Heat pump and boiler both feed the primary directly. NRV on the boiler flow, boiler limited to 50C (65C if it serves DHW legionella), heat-only boiler pump on the return.',
    hasSeparation: false, separationConnections: 0, requiresSecondaryPump: false, bivalent: true,
  },
  {
    topology: 'bivalent-separated',
    label: 'Bivalent — separated',
    description: 'Heat pump and boiler hydraulically separated (buffer or LLH), each with its own pump. NRV on the boiler flow, boiler limited to 50C (65C if it serves DHW legionella).',
    hasSeparation: true, separationConnections: 4, requiresSecondaryPump: true, bivalent: true,
  },
];

export function getArrangementInfo(topology: HydraulicTopology): ArrangementInfo {
  const info = ARRANGEMENTS.find((a) => a.topology === topology);
  if (!info) throw new Error(`Unknown topology: ${topology}`);
  return info;
}

export const VALVE_ARRANGEMENT_LABELS: Record<string, string> = {
  none: 'No valves',
  '3-port-diverter': '3-port diverter',
  's-plan': 'S-plan',
  's-plan-plus': 'S-plan Plus',
  'y-plan': 'Y-plan (not ideal — mid-position dilutes the cylinder)',
  custom: 'Custom',
};
