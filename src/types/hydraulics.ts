export type HydraulicTopology =
  | 'direct'
  | 'volumiser'
  | '2-pipe-buffer'
  | '4-pipe-buffer'
  | 'low-loss-header'
  | 'plate-hx'
  | 'mixed-rads-ufh'
  | 'bivalent-direct'
  | 'bivalent-separated';

export type ValveArrangement = 'none' | '3-port-diverter' | 's-plan' | 's-plan-plus' | 'y-plan' | 'custom';

export interface AntifreezeSettings {
  glycolType: 'propylene-glycol' | 'none';
  /** Volume fraction 0-0.6. Never set just because the unit is a monobloc — calculate from system volume x approved concentration. */
  concentrationFraction: number;
}

export interface VolumiserSettings {
  fitted: boolean;
  sizeL: number | null;
  /** Required whenever fitted — never auto-add a volumiser without recording why. */
  reason?: string;
}

export interface BivalentSettings {
  boilerType: 'combi' | 'system' | 'regular';
  /** Boiler limited to 50C, or 65C if it serves DHW legionella cycle. */
  boilerMaxFlowTempC: number;
  boilerServesDhw: boolean;
  switchoverTempC: number;
}

export interface HydraulicArrangement {
  id: string;
  jobId: string;
  designId: string;
  topology: HydraulicTopology;
  valveArrangement: ValveArrangement;
  antifreeze: AntifreezeSettings;
  volumiser: VolumiserSettings;
  bivalent?: BivalentSettings;
  separationAdviceNotes?: string;
  createdAt: string;
  updatedAt: string;
}

export type EmitterType = 'radiator' | 'ufh' | 'towel-rail' | 'fan-coil' | 'mixed';
export type ControlType = 'zone-1' | 'zone-2' | 'zone-3' | 'trvs-only' | 'always-open';

export interface PipeSizeOverride {
  sizeMm: number;
  /** Records that this was a deliberate engineer choice, shown on the schedule. */
  reason: string;
}

export interface Circuit {
  id: string;
  jobId: string;
  parentId: string | null;
  /** Derived as "<floor> — <room>" from the rooms it serves. */
  label: string;
  level: string;
  branchPoint: string;
  verticalM: number;
  horizontalM: number;
  fittingEquivalentM: number;
  zone: string;
  controlType: ControlType;
  emitterType: EmitterType;
  roomIds: string[];
  /** Only set on leaf circuits. */
  loadW?: number;
  emitterCount?: number;
  pipeSizeOverride?: PipeSizeOverride;
}
