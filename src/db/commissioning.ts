import { db } from './schema';
import type { CommissioningRecord, ServiceRecord } from '../types/commissioning';

export async function getCommissioningForJob(jobId: string): Promise<CommissioningRecord | undefined> {
  return db.commissioningRecords.where('jobId').equals(jobId).first();
}
export async function saveCommissioning(record: CommissioningRecord): Promise<void> {
  await db.commissioningRecords.put(record);
}

export async function getServiceRecordsForJob(jobId: string): Promise<ServiceRecord[]> {
  return db.serviceRecords.where('jobId').equals(jobId).reverse().sortBy('serviceDate');
}
export async function saveServiceRecord(record: ServiceRecord): Promise<void> {
  await db.serviceRecords.put(record);
}
export async function deleteServiceRecord(id: string): Promise<void> {
  await db.serviceRecords.delete(id);
}
