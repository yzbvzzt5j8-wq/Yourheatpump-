import { db } from './schema';
import type { Job } from '../types/job';

export async function listJobs(): Promise<Job[]> {
  return db.jobs.orderBy('updatedAt').reverse().toArray();
}

export async function getJob(id: string): Promise<Job | undefined> {
  return db.jobs.get(id);
}

export async function saveJob(job: Job): Promise<void> {
  await db.jobs.put(job);
}

/** Deletes a job and every record that hangs off it. */
export async function deleteJobCascade(jobId: string): Promise<void> {
  await db.transaction(
    'rw',
    [db.jobs, db.surveys, db.designs, db.arrangements, db.circuits, db.commissioningRecords, db.serviceRecords],
    async () => {
      await db.jobs.delete(jobId);
      await db.surveys.where('jobId').equals(jobId).delete();
      await db.designs.where('jobId').equals(jobId).delete();
      await db.arrangements.where('jobId').equals(jobId).delete();
      await db.circuits.where('jobId').equals(jobId).delete();
      await db.commissioningRecords.where('jobId').equals(jobId).delete();
      await db.serviceRecords.where('jobId').equals(jobId).delete();
    },
  );
}
