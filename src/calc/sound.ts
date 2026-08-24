/**
 * Simplified MCS 020 sound assessment. Works from sound POWER (Lw, dB(A)),
 * never sound pressure — power is a property of the unit, pressure is what
 * a listener at a given distance actually hears.
 *
 * This is a design-stage estimate only. Formal submission for MCS
 * certification purposes must use the official MCS 020 calculator; this
 * module exists to flag likely problems early, not to replace it.
 *
 * Lp = Lw + 10 log10(Q) - 10 log10(4*pi) - 20 log10(r)  [- barrier correction]
 */

export type MountingPosition = 'free' | 'wall' | 'corner';

/** Directivity factor Q by mounting position (hemispherical = 2 for an isolated unit). */
export const DIRECTIVITY_Q: Record<MountingPosition, number> = {
  free: 2, // isolated, away from reflecting surfaces
  wall: 4, // mounted against one reflecting wall
  corner: 8, // mounted in a corner formed by two reflecting walls
};

/** Typical barrier correction where line of sight to the receiver is genuinely broken. */
export const BARRIER_CORRECTION_DB = 5;

export interface SoundAssessmentInput {
  soundPowerLwDbA: number;
  distanceM: number;
  mountingPosition: MountingPosition;
  /** Only apply when line of sight to the receiver window is genuinely broken by a solid barrier. */
  lineOfSightBroken: boolean;
}

export interface SoundAssessmentResult {
  soundPressureLpDbA: number;
  directivityQ: number;
  barrierCorrectionAppliedDb: number;
}

export function estimateSoundPressure(input: SoundAssessmentInput): SoundAssessmentResult {
  const { soundPowerLwDbA, distanceM, mountingPosition, lineOfSightBroken } = input;
  if (distanceM <= 0) throw new Error('distanceM must be > 0');
  const Q = DIRECTIVITY_Q[mountingPosition];
  const barrierCorrectionAppliedDb = lineOfSightBroken ? BARRIER_CORRECTION_DB : 0;
  const soundPressureLpDbA =
    soundPowerLwDbA + 10 * Math.log10(Q) - 10 * Math.log10(4 * Math.PI) - 20 * Math.log10(distanceM) - barrierCorrectionAppliedDb;
  return { soundPressureLpDbA, directivityQ: Q, barrierCorrectionAppliedDb };
}

/** MCS 020 design-stage limit at the neighbour's nearest habitable window. */
export const MCS020_NEIGHBOUR_LIMIT_DBA = 42;
