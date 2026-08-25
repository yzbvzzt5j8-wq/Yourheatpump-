/**
 * Layout for the pipework sketch: a SINGLE-LINE drawing (one flow main and
 * one return main from the heat pump, runs teeing off them) — not a
 * flow-and-return pair to every emitter, which produced an unreadable
 * tangle in the prototype. Pure layout math, no React, so the
 * no-overlapping-labels rule can be asserted in code rather than eyeballed.
 *
 * Bands are ordered by water flow (plant room first, then floors) —
 * callers should pass rows pre-sorted descending by flow/load.
 */

export interface SketchRowInput {
  id: string;
  label: string;
  pipeSizeMm: number;
  /** Set when this run changes size partway (e.g. reduces from 28 to 22mm). */
  reducedFromMm?: number;
  emitterType: 'radiator' | 'ufh' | 'towel-rail' | 'fan-coil' | 'mixed';
}

export interface LabelBox {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  text: string;
}

export interface SketchLine {
  id: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  sizeMm: number;
}

export interface EmitterSymbol {
  id: string;
  x: number;
  y: number;
  type: SketchRowInput['emitterType'];
}

export interface PipeworkSketch {
  trunk: SketchLine;
  branches: SketchLine[];
  emitters: EmitterSymbol[];
  labels: LabelBox[];
  width: number;
  height: number;
}

const ROW_HEIGHT = 56;
const TRUNK_X = 70;
const BRANCH_LENGTH = 140;
const TOP_MARGIN = 40;
const LABEL_HEIGHT = 16;
const LABEL_CHAR_WIDTH = 6.2; // monospace-ish estimate, generous on purpose

function estimateLabelWidth(text: string): number {
  return Math.max(24, text.length * LABEL_CHAR_WIDTH);
}

/** Line weight scales with pipe size — used by the renderer, exposed here so it's testable alongside layout. */
export function lineWeightForSize(sizeMm: number): number {
  return Math.max(1.5, sizeMm / 8);
}

export function layoutPipeworkSketch(rows: SketchRowInput[]): PipeworkSketch {
  const branches: SketchLine[] = [];
  const emitters: EmitterSymbol[] = [];
  const labels: LabelBox[] = [];

  rows.forEach((row, i) => {
    const y = TOP_MARGIN + i * ROW_HEIGHT + ROW_HEIGHT / 2;
    const x2 = TRUNK_X + BRANCH_LENGTH;
    branches.push({ id: `branch-${row.id}`, x1: TRUNK_X, y1: y, x2, y2: y, sizeMm: row.pipeSizeMm });
    emitters.push({ id: `emitter-${row.id}`, x: x2, y, type: row.emitterType });

    const sizeText = row.reducedFromMm ? `${row.reducedFromMm}→${row.pipeSizeMm}mm` : `${row.pipeSizeMm}mm`;
    const text = `${row.label} — ${sizeText}`;
    const width = estimateLabelWidth(text);
    labels.push({ id: `label-${row.id}`, x: x2 + 10, y: y - LABEL_HEIGHT / 2, width, height: LABEL_HEIGHT, text });
  });

  const trunkHeight = TOP_MARGIN + rows.length * ROW_HEIGHT;
  const trunk: SketchLine = { id: 'trunk', x1: TRUNK_X, y1: TOP_MARGIN / 2, x2: TRUNK_X, y2: trunkHeight, sizeMm: Math.max(...rows.map((r) => r.pipeSizeMm), 22) };

  const maxLabelRight = Math.max(0, ...labels.map((l) => l.x + l.width));

  return { trunk, branches, emitters, labels, width: maxLabelRight + 20, height: trunkHeight + TOP_MARGIN / 2 };
}

function boxesOverlap(a: LabelBox, b: LabelBox): boolean {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

/** Returns every pair of labels whose bounding boxes overlap — empty means the sketch is clean. */
export function findOverlappingLabels(labels: LabelBox[]): [LabelBox, LabelBox][] {
  const overlaps: [LabelBox, LabelBox][] = [];
  for (let i = 0; i < labels.length; i++) {
    for (let j = i + 1; j < labels.length; j++) {
      if (boxesOverlap(labels[i], labels[j])) overlaps.push([labels[i], labels[j]]);
    }
  }
  return overlaps;
}
