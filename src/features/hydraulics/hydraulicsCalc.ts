import type { Circuit } from '../../types/hydraulics';
import type { DesignConditions } from '../../types/design';
import type { Survey } from '../../types/survey';
import type { FluidProperties } from '../../calc/fluids';
import { volumetricFlowLps } from '../../calc/fluids';
import { calculateRoomHeatLoss } from '../../calc/heatloss';
import { COPPER_PIPES, developedLengthM, pipeInternalVolumeL, pressureDrop, selectPipeSize, type PipeSizingResult, type SizingBasis } from '../../calc/pipes';
import { buildCircuitTree, findIndexCircuit, flattenTree, type CircuitInput, type CircuitNode } from '../../calc/tree';
import type { VolumeArea } from '../../calc/volume';

/**
 * A leaf circuit's load is always derived live from the survey's room heat
 * loss, never from a cached figure on the Circuit record — the survey is
 * the single source of truth, and re-deriving here means an edit to a
 * room's heat loss after the circuit was created can never go stale in the
 * pipe sizing. circuit.loadW is used only as a manual fallback when a room
 * isn't matched to the survey (or there is no survey at all).
 */
function resolveLeafLoadW(circuit: Circuit, survey: Survey | null): number {
  if (!survey || circuit.roomIds.length === 0) return circuit.loadW ?? 0;
  let sum = 0;
  for (const roomId of circuit.roomIds) {
    const room = survey.rooms.find((r) => r.id === roomId);
    if (!room) continue; // unmatched room contributes 0 — flagged separately in the UI
    const volumeM3 = room.lengthM * room.widthM * room.heightM;
    sum += calculateRoomHeatLoss({
      roomTempC: room.designTempC, externalTempC: survey.externalDesignTempC,
      fabric: room.fabric, partitions: room.partitions, volumeM3,
      airChangesPerHour: room.airChangesPerHour, bridgingFraction: survey.bridgingFraction,
    }).totalW;
  }
  return sum;
}

export interface CircuitHydraulics {
  circuitId: string;
  flowLps: number;
  developedLengthM: number;
  autoSize: PipeSizingResult;
  /** The size actually used — the override if the engineer set one, otherwise the auto-selected size. */
  effectiveSizeMm: number;
  effectivePressureDropPaPerM: number;
  effectiveVelocityMs: number;
  segmentPressureDropPa: number;
}

export interface HydraulicsResult {
  tree: CircuitNode[];
  flat: CircuitNode[];
  indexCircuit: CircuitNode | null;
  byId: Map<string, CircuitHydraulics>;
}

function toCircuitInput(circuit: Circuit, survey: Survey | null, segmentPressureDropPa: number): CircuitInput {
  return {
    id: circuit.id, parentId: circuit.parentId, label: circuit.label, level: circuit.level,
    branchPoint: circuit.branchPoint, verticalM: circuit.verticalM, zone: circuit.zone,
    roomId: circuit.roomIds[0], loadW: resolveLeafLoadW(circuit, survey), segmentPressureDropPa,
  };
}

export function computeHydraulics(
  circuits: Circuit[],
  designConditions: DesignConditions,
  fluid: FluidProperties,
  basis: SizingBasis,
  survey: Survey | null = null,
): HydraulicsResult {
  if (circuits.length === 0) {
    return { tree: [], flat: [], indexCircuit: null, byId: new Map() };
  }
  const deltaT = designConditions.flowTempC - designConditions.returnTempC;

  // Pass 1: roll up loads only (segment pressure drop unknown yet).
  const loadOnlyRoots = buildCircuitTree(circuits.map((c) => toCircuitInput(c, survey, 0)));
  const totalLoadById = new Map<string, number>();
  for (const node of flattenTree(loadOnlyRoots)) totalLoadById.set(node.id, node.totalLoadW);

  // Pass 2: size each segment from its own rolled-up flow, then rebuild the tree with real pressure drops.
  const byId = new Map<string, CircuitHydraulics>();
  for (const circuit of circuits) {
    const totalLoadW = totalLoadById.get(circuit.id) ?? 0;
    const flowLps = deltaT > 0 ? volumetricFlowLps(totalLoadW / 1000, deltaT, fluid) : 0;
    const autoSize = selectPipeSize(flowLps, fluid, basis);
    const length = developedLengthM(circuit.horizontalM, circuit.verticalM, circuit.fittingEquivalentM);

    const effectiveSizeMm = circuit.pipeSizeOverride?.sizeMm ?? autoSize.size.nominalMm;
    const effectivePipe = COPPER_PIPES.find((p) => p.nominalMm === effectiveSizeMm) ?? autoSize.size;
    const effective = pressureDrop(flowLps, effectivePipe.idMm, fluid);

    byId.set(circuit.id, {
      circuitId: circuit.id, flowLps, developedLengthM: length, autoSize,
      effectiveSizeMm, effectivePressureDropPaPerM: effective.pressureDropPaPerM,
      effectiveVelocityMs: effective.velocityMs, segmentPressureDropPa: effective.pressureDropPaPerM * length,
    });
  }

  const finalRoots = buildCircuitTree(circuits.map((c) => toCircuitInput(c, survey, byId.get(c.id)?.segmentPressureDropPa ?? 0)));
  const flat = flattenTree(finalRoots);
  const indexCircuit = flat.length > 0 ? findIndexCircuit(finalRoots) : null;

  return { tree: finalRoots, flat, indexCircuit, byId };
}

/**
 * Each circuit's pipe internal volume, tagged as isolating or always-open —
 * feeds calc/volume.ts's open-volume / volumiser verdict. A circuit whose
 * control is 'always-open' contributes to open volume even with every
 * TRV/zone valve elsewhere closed; anything else can be isolated.
 */
export function deriveVolumeAreas(circuits: Circuit[], hydraulics: HydraulicsResult): VolumeArea[] {
  return circuits.map((circuit) => {
    const h = hydraulics.byId.get(circuit.id);
    const pipe = COPPER_PIPES.find((p) => p.nominalMm === h?.effectiveSizeMm);
    const volumeL = h && pipe ? pipeInternalVolumeL(pipe.idMm, h.developedLengthM) : 0;
    return {
      id: circuit.id,
      label: circuit.label,
      volumeL,
      hasIsolatingValve: circuit.controlType !== 'always-open',
    };
  });
}
