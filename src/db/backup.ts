import { db } from './schema';

export interface BackupFile {
  formatVersion: 1;
  exportedAt: string;
  tables: {
    jobs: unknown[];
    surveys: unknown[];
    designs: unknown[];
    arrangements: unknown[];
    circuits: unknown[];
    materials: unknown[];
    bomLines: unknown[];
    commissioningRecords: unknown[];
    serviceRecords: unknown[];
    settings: unknown[];
  };
}

export async function exportBackup(): Promise<BackupFile> {
  const [jobs, surveys, designs, arrangements, circuits, materials, bomLines, commissioningRecords, serviceRecords, settings] =
    await Promise.all([
      db.jobs.toArray(),
      db.surveys.toArray(),
      db.designs.toArray(),
      db.arrangements.toArray(),
      db.circuits.toArray(),
      db.materials.toArray(),
      db.bomLines.toArray(),
      db.commissioningRecords.toArray(),
      db.serviceRecords.toArray(),
      db.settings.toArray(),
    ]);
  return {
    formatVersion: 1,
    exportedAt: new Date().toISOString(),
    tables: { jobs, surveys, designs, arrangements, circuits, materials, bomLines, commissioningRecords, serviceRecords, settings },
  };
}

/** Replaces all local data with the contents of a backup file. Destructive — the caller must confirm with the user first. */
export async function importBackup(backup: BackupFile): Promise<void> {
  if (backup.formatVersion !== 1) {
    throw new Error(`Unsupported backup format version: ${backup.formatVersion}`);
  }
  await db.transaction(
    'rw',
    [db.jobs, db.surveys, db.designs, db.arrangements, db.circuits, db.materials, db.bomLines, db.commissioningRecords, db.serviceRecords, db.settings],
    async () => {
      await Promise.all([
        db.jobs.clear(),
        db.surveys.clear(),
        db.designs.clear(),
        db.arrangements.clear(),
        db.circuits.clear(),
        db.materials.clear(),
        db.bomLines.clear(),
        db.commissioningRecords.clear(),
        db.serviceRecords.clear(),
        db.settings.clear(),
      ]);
      await Promise.all([
        db.jobs.bulkAdd(backup.tables.jobs as never[]),
        db.surveys.bulkAdd(backup.tables.surveys as never[]),
        db.designs.bulkAdd(backup.tables.designs as never[]),
        db.arrangements.bulkAdd(backup.tables.arrangements as never[]),
        db.circuits.bulkAdd(backup.tables.circuits as never[]),
        db.materials.bulkAdd(backup.tables.materials as never[]),
        db.bomLines.bulkAdd(backup.tables.bomLines as never[]),
        db.commissioningRecords.bulkAdd(backup.tables.commissioningRecords as never[]),
        db.serviceRecords.bulkAdd(backup.tables.serviceRecords as never[]),
        db.settings.bulkAdd(backup.tables.settings as never[]),
      ]);
    },
  );
}

export function backupToJsonBlob(backup: BackupFile): Blob {
  return new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
}

export function parseBackupJson(text: string): BackupFile {
  const parsed = JSON.parse(text);
  if (!parsed || typeof parsed !== 'object' || parsed.formatVersion !== 1) {
    throw new Error('Not a recognised YourHeatPump backup file');
  }
  return parsed as BackupFile;
}
