import type { MountingPosition } from '../calc/sound';

export interface HeatPumpSelection {
  /** References a HeatPumpModel.id in data/heatPumps.ts */
  modelId: string;
  /** The manufacturer's published configuration this design uses (e.g. a specific output setting). */
  publishedConfigurationId: string;
  outputAtDesignConditionsW: number;
  isHybrid: boolean;
  /** Only used when isHybrid is true. */
  hybridOutputAt55FlowW?: number;
  supplementaryHeaterKw?: number;
  unitCount: number;
}

export interface DhwDesign {
  cylinderVolumeL: number;
  designTempC: number; // 55C per MIS 3005 cl. 4.2.4
  pasteurisationCycleEnabled: boolean;
  heatExchangerSpecRef: string;
  diverterValveType: '3-port' | 'none';
}

export interface SoundAssessment {
  mountingPosition: MountingPosition;
  distanceToNeighbourM: number;
  lineOfSightBroken: boolean;
}

export interface DesignConditions {
  flowTempC: number;
  returnTempC: number;
}

export interface Design {
  id: string;
  jobId: string;
  surveyId: string;
  designConditions: DesignConditions;
  heatPump: HeatPumpSelection;
  dhw: DhwDesign;
  sound: SoundAssessment;
  createdAt: string;
  updatedAt: string;
}
