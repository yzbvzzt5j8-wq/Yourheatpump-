import type { SizingBasis } from '../calc/pipes';

export interface CompanySettings {
  name: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  postcode: string;
  phone?: string;
  email?: string;
  mcsNumber?: string;
  gasSafeNumber?: string;
  fGasNumber?: string;
  logoDataUrl?: string;
}

export type UnitSystem = 'metric';

export interface CalculationSettings {
  units: UnitSystem;
  defaultExternalDesignTempC: number;
  defaultBridgingFraction: number;
  velocityLimitOverrideMs?: number;
  pressureDropBasis: SizingBasis;
  defaultAntifreezeConcentrationFraction: number;
}

export interface ProjectSettings {
  radiatorFactorNotes?: string;
  dhwDesignTempC: number;
  preferredManufacturers: string[];
  reportWording: {
    disclaimerFooter: string;
  };
  autosaveEnabled: boolean;
}

export type ThemePreference = 'light' | 'dark' | 'system';
export type TextSize = 'small' | 'medium' | 'large';

export interface AppSettings {
  theme: ThemePreference;
  textSize: TextSize;
  notificationsEnabled: boolean;
}

/**
 * Settings are defaults applied to NEW jobs only. Changing a setting must
 * never rewrite a completed project — each Job/Survey/Design snapshot is
 * self-contained once created.
 */
export interface AppSettingsBundle {
  company: CompanySettings;
  calculation: CalculationSettings;
  project: ProjectSettings;
  app: AppSettings;
}

export const DEFAULT_SETTINGS: AppSettingsBundle = {
  company: { name: '', addressLine1: '', city: '', postcode: '' },
  calculation: {
    units: 'metric',
    defaultExternalDesignTempC: -3,
    defaultBridgingFraction: 0.15,
    pressureDropBasis: 'velocityAnd300',
    defaultAntifreezeConcentrationFraction: 0.25,
  },
  project: {
    dhwDesignTempC: 55,
    preferredManufacturers: [],
    reportWording: {
      disclaimerFooter:
        'This is a design aid, not MCS-certified documentation. Certified paperwork, the official MCS 020 sound assessment and MCS database registration happen outside this application.',
    },
    autosaveEnabled: true,
  },
  app: { theme: 'system', textSize: 'medium', notificationsEnabled: true },
};
