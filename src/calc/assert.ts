/**
 * Guard against NaN/undefined reaching a calculation silently. A form field
 * left empty or a bad parse produces NaN, not an exception — without this,
 * NaN propagates through an entire calc chain and shows up as "NaN kW" on
 * a report instead of a caught error at the point it entered.
 */
export function assertFinite(value: number, name: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(`${name} must be a finite number, got ${value}`);
  }
  return value;
}
