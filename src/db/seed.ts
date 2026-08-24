import { db } from './schema';
import { MATERIALS_CATALOGUE } from '../data/materials';

/** Seeds the materials table from the starter catalogue on first run only — never overwrites an edited/archived record. */
export async function seedMaterialsIfEmpty(): Promise<void> {
  const count = await db.materials.count();
  if (count > 0) return;
  await db.materials.bulkAdd(MATERIALS_CATALOGUE);
}
