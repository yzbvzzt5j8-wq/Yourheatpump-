import { db } from './schema';
import type { MaterialRecord, BomLine } from '../types/materials';

export async function listMaterials(): Promise<MaterialRecord[]> {
  return db.materials.orderBy('category').toArray();
}

/** Saves a material record. Never call this to overwrite manualPriceExVat as a side effect of a price refresh — see calc/pricing.ts refreshCatalogueAverages. */
export async function saveMaterial(material: MaterialRecord): Promise<void> {
  await db.materials.put(material);
}

export async function getBomLinesForJob(jobId: string): Promise<BomLine[]> {
  return db.bomLines.where('jobId').equals(jobId).toArray();
}

export async function saveBomLinesForJob(jobId: string, lines: BomLine[]): Promise<void> {
  await db.transaction('rw', db.bomLines, async () => {
    await db.bomLines.where('jobId').equals(jobId).delete();
    if (lines.length > 0) await db.bomLines.bulkAdd(lines);
  });
}
