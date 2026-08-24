import type { RoomType } from '../../types/survey';
import type { BFactorKey } from '../../calc/heatloss';

export const ROOM_TYPES: RoomType[] = [
  'Living Room', 'Kitchen', 'Dining Room', 'Bedroom', 'Bathroom', 'En-suite',
  'WC', 'Hallway', 'Landing', 'Study', 'Utility', 'Conservatory', 'Other',
];

export const DEFAULT_DESIGN_TEMP_BY_ROOM_TYPE: Partial<Record<RoomType, number>> = {
  'Living Room': 21, Kitchen: 18, 'Dining Room': 21, Bedroom: 18, Bathroom: 22,
  'En-suite': 22, WC: 18, Hallway: 18, Landing: 18, Study: 21, Utility: 15, Conservatory: 18, Other: 18,
};

export const B_FACTOR_OPTIONS: { key: BFactorKey; label: string; value: number }[] = [
  { key: 'outsideAir', label: 'Outside air', value: 1.0 },
  { key: 'groundFloor', label: 'Ground floor', value: 0.7 },
  { key: 'unheatedSpace', label: 'Over unheated space / garage', value: 0.5 },
  { key: 'ventilatedLoft', label: 'Ventilated loft above', value: 0.9 },
  { key: 'warmRoof', label: 'Warm roof', value: 1.0 },
  { key: 'partyWallHeated', label: 'Party wall — heated neighbour', value: 0.0 },
  { key: 'partyWallUnknown', label: 'Party wall — occupancy unknown', value: 0.3 },
  { key: 'belowGround', label: 'Below ground', value: 0.6 },
];

export const FABRIC_ELEMENT_TYPES = ['wall', 'window', 'door', 'floor', 'roof', 'rooflight'] as const;
