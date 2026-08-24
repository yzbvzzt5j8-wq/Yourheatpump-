import { describe, it, expect } from 'vitest';
import {
  computePriceStats,
  effectiveUnitPriceExVat,
  refreshCatalogueAverages,
  sellingPriceExVat,
  grossMarginFraction,
  calculateVat,
  ESM_ZERO_RATE_END_DATE,
} from './pricing';

describe('price statistics — median is the recommended average', () => {
  it('computes low/high/mean/median distinctly, median resists an outlier', () => {
    const prices = [
      { supplier: 'A', costExVat: 10 },
      { supplier: 'B', costExVat: 11 },
      { supplier: 'C', costExVat: 12 },
      { supplier: 'D', costExVat: 50 }, // promotional outlier / one-off
    ];
    const stats = computePriceStats(prices);
    expect(stats.low).toBe(10);
    expect(stats.high).toBe(50);
    expect(stats.mean).toBe(20.75);
    expect(stats.median).toBe(11.5); // far less distorted by the 50 outlier
  });

  it('surfaces preferred-supplier and last-purchased cost separately', () => {
    const prices = [
      { supplier: 'Plumbase Basildon', costExVat: 15 },
      { supplier: 'Screwfix', costExVat: 13 },
    ];
    const stats = computePriceStats(prices, ['Plumbase Basildon'], 'Screwfix');
    expect(stats.preferredSupplierCost).toBe(15);
    expect(stats.lastPurchasedCost).toBe(13);
  });
});

describe('manual price precedence', () => {
  it('an engineer-entered manual price is used over the catalogue average', () => {
    const material = {
      manualPriceExVat: 42,
      priceStats: computePriceStats([{ supplier: 'A', costExVat: 10 }, { supplier: 'B', costExVat: 30 }]),
    };
    expect(effectiveUnitPriceExVat(material)).toBe(42);
  });

  it('falls back to the median when no manual price has been entered', () => {
    const material = {
      manualPriceExVat: null,
      priceStats: computePriceStats([{ supplier: 'A', costExVat: 10 }, { supplier: 'B', costExVat: 30 }]),
    };
    expect(effectiveUnitPriceExVat(material)).toBe(20);
  });

  it('refreshing catalogue averages never overwrites a manually entered price', () => {
    const material = {
      manualPriceExVat: 99,
      priceStats: computePriceStats([{ supplier: 'A', costExVat: 10 }]),
    };
    const refreshed = refreshCatalogueAverages(material, [
      { supplier: 'A', costExVat: 500 },
      { supplier: 'B', costExVat: 600 },
    ]);
    expect(refreshed.manualPriceExVat).toBe(99); // untouched
    expect(refreshed.priceStats.median).not.toBe(99); // stats did update
    expect(effectiveUnitPriceExVat(refreshed)).toBe(99); // and the manual price still wins
  });
});

describe('markup vs margin', () => {
  it('a 20% markup is a 16.7% margin — the two must never be conflated', () => {
    const selling = sellingPriceExVat(100, 0.2);
    expect(selling).toBe(120);
    const margin = grossMarginFraction(100, selling);
    expect(margin).toBeCloseTo(0.1667, 3);
  });
});

describe('VAT treatment', () => {
  it('GB qualifying ESM supply-and-install is 0% (temporary, to 31 Mar 2027)', () => {
    const result = calculateVat({ costExVat: 1000, treatment: 'zero-rated-esm' });
    expect(result.ratePercent).toBe(0);
    expect(result.vatAmount).toBe(0);
    expect(result.costIncVat).toBe(1000);
    expect(ESM_ZERO_RATE_END_DATE).toBe('2027-03-31');
  });

  it('standard-rated supply and standard-rated additional work are both 20%', () => {
    expect(calculateVat({ costExVat: 100, treatment: 'standard-supply' }).ratePercent).toBe(20);
    expect(calculateVat({ costExVat: 100, treatment: 'standard-additional-work' }).ratePercent).toBe(20);
  });

  it('every VAT result requires installer confirmation before the quote finalises', () => {
    const result = calculateVat({ costExVat: 100, treatment: 'zero-rated-esm' });
    expect(result.requiresConfirmation).toBe(true);
  });

  it('custom treatment requires an explicit rate and does not silently default', () => {
    expect(() => calculateVat({ costExVat: 100, treatment: 'custom' })).toThrow();
    const result = calculateVat({ costExVat: 100, treatment: 'custom', customRatePercent: 12.5 });
    expect(result.ratePercent).toBe(12.5);
  });
});
