import { describe, it, expect } from 'vitest';
import { computeSystemVolume, type VolumeArea } from './volume';

describe('open volume vs total volume', () => {
  it('an always-open area (no valves) contributes to open volume', () => {
    const areas: VolumeArea[] = [{ id: 'a', label: 'Always open loop', volumeL: 20, hasIsolatingValve: false }];
    const result = computeSystemVolume({ areas, manufacturerMinimumOpenVolumeL: 10 });
    expect(result.openVolumeExcludingVolumiserL).toBe(20);
  });

  it('a zoned area (TRV / zone valve) does NOT contribute to open volume', () => {
    const areas: VolumeArea[] = [{ id: 'a', label: 'Zoned upstairs', volumeL: 20, hasIsolatingValve: true }];
    const result = computeSystemVolume({ areas, manufacturerMinimumOpenVolumeL: 10 });
    expect(result.openVolumeExcludingVolumiserL).toBe(0);
    expect(result.totalVolumeL).toBe(20);
  });

  it('DHW-mode volume is modelled separately for a 3-port diverter', () => {
    const areas: VolumeArea[] = [
      { id: 'heating', label: 'Heating primary', volumeL: 15, hasIsolatingValve: false },
      { id: 'dhw', label: 'DHW leg', volumeL: 5, hasIsolatingValve: false, isDhwOnly: true },
    ];
    const result = computeSystemVolume({ areas, manufacturerMinimumOpenVolumeL: 10 });
    expect(result.dhwModeVolumeL).toBe(5);
    expect(result.openVolumeExcludingVolumiserL).toBe(15); // DHW leg excluded from heating open volume
  });
});

describe('volumiser verdict', () => {
  it('31 L open volume against a 40 L minimum -> 9 L short, recommends smallest standard size that covers it', () => {
    const areas: VolumeArea[] = [{ id: 'a', label: 'Open loop', volumeL: 31, hasIsolatingValve: false }];
    const result = computeSystemVolume({ areas, manufacturerMinimumOpenVolumeL: 40 });
    expect(result.shortfallL).toBe(9);
    expect(result.volumiserNeeded).toBe(true);
    expect(result.recommendedVolumiserL).toBe(25);
  });

  it('excludes an already-fitted volumiser from the verdict, so it never falsely reports "not needed"', () => {
    const areas: VolumeArea[] = [{ id: 'a', label: 'Open loop', volumeL: 31, hasIsolatingValve: false }];
    const result = computeSystemVolume({ areas, existingVolumiserL: 40, manufacturerMinimumOpenVolumeL: 40 });
    // Even though a 40 L volumiser is already fitted, the verdict is based on
    // the areas alone: it must still say a volumiser was needed.
    expect(result.shortfallL).toBe(9);
    expect(result.volumiserNeeded).toBe(true);
    expect(result.openVolumeIncludingVolumiserL).toBe(71);
  });

  it('reports no volumiser needed when open volume already meets the minimum', () => {
    const areas: VolumeArea[] = [{ id: 'a', label: 'Open loop', volumeL: 45, hasIsolatingValve: false }];
    const result = computeSystemVolume({ areas, manufacturerMinimumOpenVolumeL: 40 });
    expect(result.volumiserNeeded).toBe(false);
    expect(result.recommendedVolumiserL).toBeNull();
  });
});
