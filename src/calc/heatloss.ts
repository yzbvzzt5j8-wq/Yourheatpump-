/**
 * Room heat loss per BS EN 12831 as simplified by MIS 3005.
 *
 *   Fabric      = sum(area x U x dT x b)
 *   Ventilation = 0.33 x ACH x volume x dT
 *   Partitions  = sum(area x U x (T_room - T_adjacent))   where positive
 *   Total       = (fabric + partitions) x (1 + bridging%) + ventilation
 */

export type BFactorKey =
  | 'outsideAir'
  | 'groundFloor'
  | 'unheatedSpace'
  | 'ventilatedLoft'
  | 'warmRoof'
  | 'partyWallHeated'
  | 'partyWallUnknown'
  | 'belowGround';

/**
 * b-factors by adjacency. Each fabric element carries its own adjacency —
 * a party wall to a heated neighbour is NOT the same as an external wall,
 * and charging it at full external dT is a common and serious sizing error.
 */
export const B_FACTORS: Record<BFactorKey, number> = {
  outsideAir: 1.0,
  groundFloor: 0.7,
  unheatedSpace: 0.5, // over unheated space / garage
  ventilatedLoft: 0.9, // ventilated loft above
  warmRoof: 1.0,
  partyWallHeated: 0.0, // party wall, heated neighbour
  partyWallUnknown: 0.3, // party wall, occupancy unknown
  belowGround: 0.6,
};

export interface FabricElement {
  /** Descriptive label, e.g. "Floor over garage" */
  label: string;
  areaM2: number;
  uValue: number;
  bFactor: BFactorKey | number;
}

export interface Partition {
  /** Descriptive label, e.g. "Wall to landing" */
  label: string;
  areaM2: number;
  uValue: number;
  adjacentRoomTempC: number;
}

export interface RoomHeatLossInput {
  roomTempC: number;
  externalTempC: number;
  fabric: FabricElement[];
  partitions?: Partition[];
  volumeM3: number;
  airChangesPerHour: number;
  /** Thermal bridging allowance, e.g. 0.15 for 15%. */
  bridgingFraction: number;
}

export interface RoomHeatLossResult {
  fabricW: number;
  partitionsW: number;
  ventilationW: number;
  totalW: number;
  /** Per-element breakdown for "show the working". */
  fabricBreakdown: { label: string; areaM2: number; uValue: number; bFactor: number; deltaT: number; watts: number }[];
  partitionBreakdown: { label: string; areaM2: number; uValue: number; deltaT: number; watts: number }[];
}

function resolveBFactor(b: BFactorKey | number): number {
  return typeof b === 'number' ? b : B_FACTORS[b];
}

export function calculateRoomHeatLoss(input: RoomHeatLossInput): RoomHeatLossResult {
  const { roomTempC, externalTempC, fabric, partitions = [], volumeM3, airChangesPerHour, bridgingFraction } = input;
  const deltaT = roomTempC - externalTempC;

  const fabricBreakdown = fabric.map((el) => {
    const b = resolveBFactor(el.bFactor);
    const watts = el.areaM2 * el.uValue * deltaT * b;
    return { label: el.label, areaM2: el.areaM2, uValue: el.uValue, bFactor: b, deltaT, watts };
  });
  const fabricW = fabricBreakdown.reduce((sum, e) => sum + e.watts, 0);

  // Partitions only contribute where the adjacent space is cooler (positive loss).
  const partitionBreakdown = partitions.map((p) => {
    const pDeltaT = roomTempC - p.adjacentRoomTempC;
    const watts = pDeltaT > 0 ? p.areaM2 * p.uValue * pDeltaT : 0;
    return { label: p.label, areaM2: p.areaM2, uValue: p.uValue, deltaT: pDeltaT, watts };
  });
  const partitionsW = partitionBreakdown.reduce((sum, e) => sum + e.watts, 0);

  const ventilationW = 0.33 * airChangesPerHour * volumeM3 * deltaT;

  const totalW = (fabricW + partitionsW) * (1 + bridgingFraction) + ventilationW;

  return { fabricW, partitionsW, ventilationW, totalW, fabricBreakdown, partitionBreakdown };
}
