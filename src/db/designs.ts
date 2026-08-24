import { db } from './schema';
import type { Design } from '../types/design';
import type { HydraulicArrangement, Circuit } from '../types/hydraulics';

export async function getDesignForJob(jobId: string): Promise<Design | undefined> {
  return db.designs.where('jobId').equals(jobId).first();
}
export async function saveDesign(design: Design): Promise<void> {
  await db.designs.put(design);
}

export async function getArrangementForJob(jobId: string): Promise<HydraulicArrangement | undefined> {
  return db.arrangements.where('jobId').equals(jobId).first();
}
export async function saveArrangement(arrangement: HydraulicArrangement): Promise<void> {
  await db.arrangements.put(arrangement);
}

export async function getCircuitsForJob(jobId: string): Promise<Circuit[]> {
  return db.circuits.where('jobId').equals(jobId).toArray();
}
export async function saveCircuits(jobId: string, circuits: Circuit[]): Promise<void> {
  await db.transaction('rw', db.circuits, async () => {
    await db.circuits.where('jobId').equals(jobId).delete();
    if (circuits.length > 0) await db.circuits.bulkAdd(circuits);
  });
}
