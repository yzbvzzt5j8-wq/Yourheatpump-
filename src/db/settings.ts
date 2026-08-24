import { db } from './schema';
import { DEFAULT_SETTINGS, type AppSettingsBundle } from '../types/settings';

const SETTINGS_ID = 'app-settings' as const;

/**
 * Settings are defaults for NEW jobs only. Reading them never mutates an
 * existing Job/Survey/Design — those store their own snapshot of the
 * values that applied when they were created. Changing a setting here
 * only changes what the guided setup pre-fills next time.
 */
function cloneDefaults(): AppSettingsBundle {
  // Deliberate deep clone — callers mutate the returned object freely, and
  // that must never reach back into the shared DEFAULT_SETTINGS constant.
  return structuredClone(DEFAULT_SETTINGS);
}

export async function getSettings(): Promise<AppSettingsBundle> {
  const row = await db.settings.get(SETTINGS_ID);
  return row?.value ?? cloneDefaults();
}

export async function saveSettings(value: AppSettingsBundle): Promise<void> {
  await db.settings.put({ id: SETTINGS_ID, value });
}

export async function resetSettings(): Promise<void> {
  await db.settings.put({ id: SETTINGS_ID, value: cloneDefaults() });
}
