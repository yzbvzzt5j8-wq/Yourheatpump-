/**
 * Radiator catalogue — Delta-50 rated outputs by type and size.
 *
 * ILLUSTRATIVE STARTER DATA for development and UI testing only, not
 * sourced from a verified manufacturer catalogue. Radiators need an exact
 * model and Delta-50 output selected before a real design relies on this
 * (see spec Part 4 guardrails) — treat these entries as placeholders to
 * replace, not as a source of truth.
 */

export type RadiatorType = 'Type 11' | 'Type 21' | 'Type 22' | 'Type 33' | 'Column' | 'Towel Rail';

export interface RadiatorCatalogueEntry {
  id: string;
  manufacturer: string;
  type: RadiatorType;
  heightMm: number;
  lengthMm: number;
  outputAtD50W: number;
}

function entry(id: string, type: RadiatorType, heightMm: number, lengthMm: number, outputAtD50W: number): RadiatorCatalogueEntry {
  return { id, manufacturer: 'Illustrative example — replace before real use', type, heightMm, lengthMm, outputAtD50W };
}

export const RADIATOR_CATALOGUE: RadiatorCatalogueEntry[] = [
  entry('rad-t11-600x600', 'Type 11', 600, 600, 700),
  entry('rad-t11-600x1000', 'Type 11', 600, 1000, 1160),
  entry('rad-t21-600x600', 'Type 21', 600, 600, 970),
  entry('rad-t21-600x1000', 'Type 21', 600, 1000, 1610),
  entry('rad-t22-600x600', 'Type 22', 600, 600, 1330),
  entry('rad-t22-600x1000', 'Type 22', 600, 1000, 2210),
  entry('rad-t22-600x1400', 'Type 22', 600, 1400, 3100),
  entry('rad-t33-600x1000', 'Type 33', 600, 1000, 2900),
  entry('rad-towel-500x800', 'Towel Rail', 800, 500, 350),
  entry('rad-towel-600x1200', 'Towel Rail', 1200, 600, 600),
];
