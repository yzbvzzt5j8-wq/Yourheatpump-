/**
 * System volume: open volume (what circulates with every TRV and zone
 * valve closed), total volume, and DHW-mode volume for systems with a
 * 3-port diverter.
 *
 * Manufacturer minimum volumes refer to OPEN volume, not total. An area
 * marked "always open — no valves" contributes to open volume; a zoned
 * one does not, because it can be shut off entirely.
 */

export const STANDARD_VOLUMISER_SIZES_L = [25, 40, 50, 60, 80, 100, 150, 200, 300];

export interface VolumeArea {
  id: string;
  label: string;
  volumeL: number;
  /** True if this area has a TRV or zone valve that can isolate it. */
  hasIsolatingValve: boolean;
  /** True if this pipework only carries flow during a DHW diversion (3-port valve). */
  isDhwOnly?: boolean;
}

export interface VolumeInput {
  areas: VolumeArea[];
  /** Volumiser already fitted in the design, litres — excluded from the verdict calc. */
  existingVolumiserL?: number;
  manufacturerMinimumOpenVolumeL: number;
}

export interface VolumeResult {
  /** Open volume EXCLUDING any volumiser already added — the basis for the verdict. */
  openVolumeExcludingVolumiserL: number;
  /** Open volume as actually built, including any fitted volumiser. */
  openVolumeIncludingVolumiserL: number;
  totalVolumeL: number;
  dhwModeVolumeL: number;
  shortfallL: number;
  volumiserNeeded: boolean;
  recommendedVolumiserL: number | null;
}

function standardVolumiserSize(shortfallL: number): number {
  const fit = STANDARD_VOLUMISER_SIZES_L.find((size) => size >= shortfallL);
  return fit ?? STANDARD_VOLUMISER_SIZES_L[STANDARD_VOLUMISER_SIZES_L.length - 1];
}

export function computeSystemVolume(input: VolumeInput): VolumeResult {
  const { areas, existingVolumiserL = 0, manufacturerMinimumOpenVolumeL } = input;

  const openFromAreas = areas
    .filter((a) => !a.hasIsolatingValve && !a.isDhwOnly)
    .reduce((sum, a) => sum + a.volumeL, 0);

  const totalVolumeL = areas.reduce((sum, a) => sum + a.volumeL, 0) + existingVolumiserL;
  const dhwModeVolumeL = areas.filter((a) => a.isDhwOnly).reduce((sum, a) => sum + a.volumeL, 0);

  // The verdict deliberately excludes any volumiser already added — otherwise
  // fitting one makes the check report "not needed" regardless of whether it
  // was sized correctly in the first place.
  const openVolumeExcludingVolumiserL = openFromAreas;
  const openVolumeIncludingVolumiserL = openFromAreas + existingVolumiserL;

  const shortfallL = Math.max(0, manufacturerMinimumOpenVolumeL - openVolumeExcludingVolumiserL);
  const volumiserNeeded = shortfallL > 0;

  return {
    openVolumeExcludingVolumiserL,
    openVolumeIncludingVolumiserL,
    totalVolumeL,
    dhwModeVolumeL,
    shortfallL,
    volumiserNeeded,
    recommendedVolumiserL: volumiserNeeded ? standardVolumiserSize(shortfallL) : null,
  };
}
