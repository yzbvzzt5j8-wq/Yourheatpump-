import { describe, it, expect, beforeEach } from 'vitest';
import { db } from './schema';
import { getSettings, saveSettings, resetSettings } from './settings';
import { seedMaterialsIfEmpty } from './seed';
import { exportBackup, importBackup, parseBackupJson } from './backup';
import { listJobs, saveJob, deleteJobCascade } from './jobs';
import { DEFAULT_SETTINGS } from '../types/settings';
import type { Job } from '../types/job';
import type { Survey } from '../types/survey';

async function clearAll() {
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
}

beforeEach(async () => {
  await clearAll();
});

function makeJob(id: string): Job {
  return {
    id,
    reference: `REF-${id}`,
    name: `Job ${id}`,
    customer: { name: 'Test Customer', addressLine1: '1 Test St', city: 'Basildon', postcode: 'SS14 1AA' },
    status: 'survey',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

describe('jobs repository', () => {
  it('saves and lists jobs', async () => {
    await saveJob(makeJob('a'));
    await saveJob(makeJob('b'));
    const jobs = await listJobs();
    expect(jobs.length).toBe(2);
  });

  it('cascade-deletes a job and its dependent records', async () => {
    const job = makeJob('c');
    await saveJob(job);
    const survey: Survey = {
      id: 'survey-c', jobId: job.id, externalDesignTempC: -3, bridgingFraction: 0.15,
      dataSources: { externalTempSource: 'CIBSE-design-data', uValueSource: 'age-assumption-table', achSource: 'CIBSE-table' },
      rooms: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    };
    await db.surveys.put(survey);
    await deleteJobCascade(job.id);
    expect(await db.jobs.get(job.id)).toBeUndefined();
    expect(await db.surveys.get(survey.id)).toBeUndefined();
  });
});

describe('settings — defaults for new jobs only', () => {
  it('returns defaults when nothing has been saved', async () => {
    const settings = await getSettings();
    expect(settings).toEqual(DEFAULT_SETTINGS);
  });

  it('persists and reads back a change', async () => {
    const settings = await getSettings();
    settings.company.name = 'Blue Flow Heating';
    await saveSettings(settings);
    const reread = await getSettings();
    expect(reread.company.name).toBe('Blue Flow Heating');
  });

  it('reset restores the shipped defaults', async () => {
    const settings = await getSettings();
    settings.company.name = 'Changed';
    await saveSettings(settings);
    await resetSettings();
    const reread = await getSettings();
    expect(reread.company.name).toBe('');
  });

  it('saving a setting never touches an existing job record', async () => {
    const job = makeJob('settings-job');
    await saveJob(job);
    const before = await db.jobs.get(job.id);
    const settings = await getSettings();
    settings.calculation.defaultExternalDesignTempC = -5;
    await saveSettings(settings);
    const after = await db.jobs.get(job.id);
    expect(after).toEqual(before);
  });
});

describe('catalogue seeding', () => {
  it('seeds materials only when the table is empty', async () => {
    await seedMaterialsIfEmpty();
    const countAfterFirst = await db.materials.count();
    expect(countAfterFirst).toBeGreaterThan(0);

    // Simulate an engineer edit, then re-run seeding — must not duplicate or reset it.
    const first = await db.materials.toCollection().first();
    await db.materials.update(first!.id, { manualPriceExVat: 999 });
    await seedMaterialsIfEmpty();
    const countAfterSecond = await db.materials.count();
    expect(countAfterSecond).toBe(countAfterFirst);
    const edited = await db.materials.get(first!.id);
    expect(edited?.manualPriceExVat).toBe(999);
  });
});

describe('backup / restore', () => {
  it('round-trips a job through export and import', async () => {
    await saveJob(makeJob('backup-job'));
    const backup = await exportBackup();
    await clearAll();
    expect(await listJobs()).toEqual([]);
    await importBackup(backup);
    const jobs = await listJobs();
    expect(jobs.length).toBe(1);
    expect(jobs[0].id).toBe('backup-job');
  });

  it('rejects a file that is not a recognised backup', () => {
    expect(() => parseBackupJson(JSON.stringify({ foo: 'bar' }))).toThrow();
  });

  it('parses a valid backup JSON string', async () => {
    await saveJob(makeJob('parse-job'));
    const backup = await exportBackup();
    const text = JSON.stringify(backup);
    const parsed = parseBackupJson(text);
    expect(parsed.tables.jobs.length).toBe(1);
  });
});
