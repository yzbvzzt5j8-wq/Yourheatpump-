import type { BFactorKey } from '../calc/heatloss';

export type RoomType =
  | 'Living Room' | 'Kitchen' | 'Dining Room' | 'Bedroom' | 'Bathroom' | 'En-suite'
  | 'WC' | 'Hallway' | 'Landing' | 'Study' | 'Utility' | 'Conservatory' | 'Other';

export interface SurveyFabricElement {
  id: string;
  label: string;
  type: 'wall' | 'window' | 'door' | 'floor' | 'roof' | 'rooflight';
  areaM2: number;
  uValue: number;
  bFactor: BFactorKey | number;
}

export interface SurveyPartition {
  id: string;
  label: string;
  areaM2: number;
  uValue: number;
  /** Room id on the other side, or null if entering the adjacent temperature directly. */
  adjacentRoomId: string | null;
  adjacentRoomTempC: number;
}

export interface SurveyRoom {
  id: string;
  name: string;
  roomType: RoomType;
  floor: string;
  designTempC: number;
  lengthM: number;
  widthM: number;
  heightM: number;
  airChangesPerHour: number;
  fabric: SurveyFabricElement[];
  partitions: SurveyPartition[];
  notes?: string;
}

export type ExternalTempSource = 'CIBSE-design-data' | 'MCS-postcode-lookup' | 'manufacturer-datasheet' | 'other';
export type UValueSource = 'as-built-drawings' | 'age-assumption-table' | 'site-survey-measured' | 'epc' | 'other';
export type AchSource = 'CIBSE-table' | 'age-and-construction-assumption' | 'measured-air-test' | 'other';

/** Where the design inputs came from — captured as tappable options, not blank text, so an assessor can see it on the report. */
export interface DesignDataSources {
  externalTempSource: ExternalTempSource;
  externalTempNotes?: string;
  uValueSource: UValueSource;
  uValueNotes?: string;
  achSource: AchSource;
  achNotes?: string;
}

export interface Survey {
  id: string;
  jobId: string;
  externalDesignTempC: number;
  bridgingFraction: number;
  dataSources: DesignDataSources;
  rooms: SurveyRoom[];
  createdAt: string;
  updatedAt: string;
}
