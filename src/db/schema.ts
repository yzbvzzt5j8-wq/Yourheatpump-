import Dexie, { type EntityTable } from 'dexie';
import type { Job } from '../types/job';
import type { Survey } from '../types/survey';
import type { Design } from '../types/design';
import type { HydraulicArrangement, Circuit } from '../types/hydraulics';
import type { MaterialRecord, BomLine } from '../types/materials';
import type { CommissioningRecord, ServiceRecord } from '../types/commissioning';
import type { AppSettingsBundle } from '../types/settings';

export interface SettingsRow {
  id: 'app-settings';
  value: AppSettingsBundle;
}

/**
 * IndexedDB schema via Dexie. Offline-first — everything a job needs lives
 * here; JSON export/import (see backup.ts) is the only sync mechanism in
 * v1 (no backend).
 */
export class YourHeatPumpDB extends Dexie {
  jobs!: EntityTable<Job, 'id'>;
  surveys!: EntityTable<Survey, 'id'>;
  designs!: EntityTable<Design, 'id'>;
  arrangements!: EntityTable<HydraulicArrangement, 'id'>;
  circuits!: EntityTable<Circuit, 'id'>;
  materials!: EntityTable<MaterialRecord, 'id'>;
  bomLines!: EntityTable<BomLine, 'id'>;
  commissioningRecords!: EntityTable<CommissioningRecord, 'id'>;
  serviceRecords!: EntityTable<ServiceRecord, 'id'>;
  settings!: EntityTable<SettingsRow, 'id'>;

  constructor(name = 'yourheatpump') {
    super(name);
    this.version(1).stores({
      jobs: 'id, reference, status, updatedAt',
      surveys: 'id, jobId',
      designs: 'id, jobId, surveyId',
      arrangements: 'id, jobId, designId',
      circuits: 'id, jobId, parentId',
      materials: 'id, category, status, active',
      bomLines: 'id, materialId',
      commissioningRecords: 'id, jobId',
      serviceRecords: 'id, jobId, serviceDate',
      settings: 'id',
    });
  }
}

export const db = new YourHeatPumpDB();
