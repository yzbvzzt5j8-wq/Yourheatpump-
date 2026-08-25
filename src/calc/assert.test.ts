import { describe, it, expect } from 'vitest';
import { assertFinite } from './assert';

describe('assertFinite — no calculation reachable with NaN or undefined inputs', () => {
  it('passes through a finite number', () => {
    expect(assertFinite(42, 'x')).toBe(42);
  });
  it('throws on NaN', () => {
    expect(() => assertFinite(NaN, 'x')).toThrow(/finite number/);
  });
  it('throws on undefined', () => {
    expect(() => assertFinite(undefined as unknown as number, 'x')).toThrow();
  });
  it('throws on Infinity', () => {
    expect(() => assertFinite(Infinity, 'x')).toThrow();
  });
  it('includes the field name in the error, so the offending input is traceable', () => {
    expect(() => assertFinite(NaN, 'roomTempC')).toThrow(/roomTempC/);
  });
});
