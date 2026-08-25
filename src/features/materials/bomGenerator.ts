import type { Circuit, HydraulicArrangement } from '../../types/hydraulics';
import type { Design } from '../../types/design';
import type { BomLine, MaterialRecord } from '../../types/materials';
import type { HydraulicsResult } from '../hydraulics/hydraulicsCalc';
import type { VolumeResult } from '../../calc/volume';

function uid(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function findMaterial(catalogue: MaterialRecord[], productName: string): MaterialRecord | undefined {
  return catalogue.find((m) => m.productName === productName && m.active);
}

export interface BomGeneratorInput {
  jobId: string;
  circuits: Circuit[];
  hydraulics: HydraulicsResult;
  arrangement: HydraulicArrangement;
  design: Design;
  volumeResult: VolumeResult;
  catalogue: MaterialRecord[];
}

export interface BomGeneratorOutput {
  lines: BomLine[];
  /** Things the generator could not price because the catalogue has no matching entry — never silently invented. */
  warnings: string[];
}

/**
 * Generates a starting bill of materials from the live design. Every line
 * carries its reason and starts unconfirmed — an engineer must confirm
 * each one before it enters the quotation (spec Part 4). This deliberately
 * does NOT auto-add buffer/volumiser/LLH/secondary pump/plate HX beyond
 * what the arrangement already records with its own reason, and never
 * invents a price for main equipment.
 */
export function generateBom(input: BomGeneratorInput): BomGeneratorOutput {
  const { jobId, circuits, hydraulics, arrangement, design, volumeResult, catalogue } = input;
  const lines: BomLine[] = [];
  const warnings: string[] = [];

  function addLine(material: MaterialRecord | undefined, quantity: number, wastePercent: number, reason: string, missingLabel: string) {
    if (!material) {
      warnings.push(`No catalogue entry for "${missingLabel}" — add one before this line can be quoted.`);
      return;
    }
    lines.push({ id: uid('bom'), jobId, materialId: material.id, quantity, wastePercent, reason, engineerConfirmed: false });
  }

  // --- Pipework + insulation, grouped by effective pipe size -------------
  const lengthBySize = new Map<number, { totalM: number; runs: number }>();
  for (const circuit of circuits) {
    const h = hydraulics.byId.get(circuit.id);
    if (!h) continue;
    const entry = lengthBySize.get(h.effectiveSizeMm) ?? { totalM: 0, runs: 0 };
    entry.totalM += h.developedLengthM;
    entry.runs += 1;
    lengthBySize.set(h.effectiveSizeMm, entry);
  }
  for (const [sizeMm, { totalM, runs }] of lengthBySize) {
    const pipe = findMaterial(catalogue, `Copper tube ${sizeMm}mm x 3m`);
    const pipeReason = `${totalM.toFixed(1)}m developed length across ${runs} run(s) at ${sizeMm}mm, +10% waste`;
    addLine(pipe, pipe ? Math.ceil((totalM * 1.1) / 3) : 0, 0.1, pipeReason, `Copper tube ${sizeMm}mm x 3m`);

    const insulation = findMaterial(catalogue, `Pipe insulation ${sizeMm}mm x 2m (internal, Class O)`);
    addLine(insulation, insulation ? Math.ceil((totalM * 1.1) / 2) : 0, 0.1, `${pipeReason} — internal insulation; verify external runs need the UV-stable product`, `Pipe insulation ${sizeMm}mm`);
  }

  // --- Antifreeze --------------------------------------------------------
  if (arrangement.antifreeze.glycolType !== 'none') {
    const neededL = volumeResult.totalVolumeL * arrangement.antifreeze.concentrationFraction;
    const glycol = findMaterial(catalogue, 'Propylene glycol antifreeze, 20L');
    addLine(
      glycol, glycol ? Math.ceil(neededL / 20) : 0, 0,
      `System volume ${volumeResult.totalVolumeL.toFixed(0)} L x ${(arrangement.antifreeze.concentrationFraction * 100).toFixed(0)}% concentration = ${neededL.toFixed(1)} L needed`,
      'Propylene glycol antifreeze, 20L',
    );
  }

  // --- Automatic bypass — wherever zones can close -----------------------
  if (circuits.some((c) => c.controlType !== 'always-open')) {
    const bypass = findMaterial(catalogue, 'Automatic bypass valve 22mm');
    addLine(bypass, 1, 0, 'Automatic bypass required wherever zones can close', 'Automatic bypass valve 22mm');
  }

  // --- Volumiser (only if the arrangement already records one, with its reason) ---
  if (arrangement.volumiser.fitted) {
    const volumiser = findMaterial(catalogue, 'Volumiser');
    const reason = volumeResult.shortfallL > 0
      ? `Open volume ${volumeResult.openVolumeExcludingVolumiserL.toFixed(0)} L against ${(volumeResult.openVolumeExcludingVolumiserL + volumeResult.shortfallL).toFixed(0)} L minimum — ${volumeResult.shortfallL.toFixed(0)} L short`
      : arrangement.volumiser.reason || 'Fitted per engineer decision on the Arrangement tab';
    addLine(volumiser, 1, 0, reason, 'Volumiser');
  }

  // --- Cylinder ------------------------------------------------------------
  if (design.dhw.cylinderVolumeL > 0) {
    const cylinder = findMaterial(catalogue, 'Cylinder');
    addLine(cylinder, 1, 0, `${design.dhw.cylinderVolumeL} L cylinder per hot water design`, 'Cylinder');
  }

  // --- Main equipment --------------------------------------------------
  for (const name of ['Outdoor unit', 'Hydraulic module', 'Controller']) {
    const item = findMaterial(catalogue, name);
    addLine(item, design.heatPump.unitCount, 0, `Selected heat pump model/configuration from Design (${design.heatPump.unitCount} unit(s))`, name);
  }
  if (design.heatPump.supplementaryHeaterKw) {
    const backup = findMaterial(catalogue, 'Backup heater');
    addLine(backup, 1, 0, `${design.heatPump.supplementaryHeaterKw} kW supplementary heater per Design`, 'Backup heater');
  }

  // --- Safety / commissioning components, always required ---------------
  for (const name of [
    'Pressure relief valve 3 bar 22mm', 'Automatic air vent 15mm', 'Drain cock 15mm',
    'Flow setter / commissioning valve 22mm', 'Magnetic system filter 22mm', 'Flow/return temperature sensor pair',
  ]) {
    const item = findMaterial(catalogue, name);
    addLine(item, 1, 0, 'Standard safety/commissioning component per the schematic rules', name);
  }

  // --- Monobloc external connection -------------------------------------
  for (const name of ['Anti-vibration flexible hose set (pair)', 'Anti-vibration outdoor unit feet (set of 4)', 'Condensate trap and pipe kit']) {
    const item = findMaterial(catalogue, name);
    addLine(item, 1, 0, 'Monobloc external connection', name);
  }

  // --- Flushing and commissioning (BS 7593) -------------------------------
  for (const name of ['System flush / cleaner, 5L', 'Inhibitor, 5L']) {
    const item = findMaterial(catalogue, name);
    addLine(item, 1, 0, 'Pre-commission flush and dose per BS 7593', name);
  }

  // --- Estimating allowances ---------------------------------------------
  const electrical = findMaterial(catalogue, 'Electrical estimating allowance (supply + isolator + cabling)');
  addLine(electrical, 1, 0, 'Estimating allowance only — a competent electrician must confirm the actual requirement', 'Electrical estimating allowance');

  if (circuits.some((c) => c.emitterType === 'radiator' || c.emitterType === 'mixed')) {
    const radiators = findMaterial(catalogue, 'Radiator upgrade — estimating allowance');
    addLine(radiators, 1, 0, 'Estimating allowance only — exact models and Delta-50 outputs must be selected from the radiator catalogue', 'Radiator upgrade allowance');
  }

  return { lines, warnings };
}
