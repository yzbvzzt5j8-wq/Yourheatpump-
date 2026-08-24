/**
 * Pricing calculations: supplier price statistics, manual-price precedence,
 * VAT treatment, and markup vs margin. Pricing must never influence
 * engineering (see spec rule 2) — this module only touches money, never
 * pipe sizes, emitter selection, or any other technical output.
 */

export interface PriceRecord {
  supplier: string;
  costExVat: number;
  dateChecked?: string;
}

export interface PriceStats {
  low: number;
  high: number;
  mean: number;
  /** Median is the recommended average — less distorted by promotions and outliers. */
  median: number;
  preferredSupplierCost: number | null;
  lastPurchasedCost: number | null;
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

export function computePriceStats(
  prices: PriceRecord[],
  preferredSuppliers: string[] = [],
  lastPurchasedSupplier?: string,
): PriceStats {
  if (prices.length === 0) {
    return { low: 0, high: 0, mean: 0, median: 0, preferredSupplierCost: null, lastPurchasedCost: null };
  }
  const costs = prices.map((p) => p.costExVat);
  const preferred = prices.find((p) => preferredSuppliers.includes(p.supplier));
  const lastPurchased = lastPurchasedSupplier ? prices.find((p) => p.supplier === lastPurchasedSupplier) : undefined;
  return {
    low: Math.min(...costs),
    high: Math.max(...costs),
    mean: costs.reduce((sum, c) => sum + c, 0) / costs.length,
    median: median(costs),
    preferredSupplierCost: preferred?.costExVat ?? null,
    lastPurchasedCost: lastPurchased?.costExVat ?? null,
  };
}

export interface MaterialPricing {
  /** Set only when an engineer has typed a trade price in directly. */
  manualPriceExVat?: number | null;
  priceStats: PriceStats;
}

/**
 * The price actually used in a quote. A manually entered trade price always
 * wins — a catalogue refresh (see refreshCatalogueAverages) must never
 * silently overwrite it.
 */
export function effectiveUnitPriceExVat(material: MaterialPricing): number {
  return material.manualPriceExVat ?? material.priceStats.median;
}

/**
 * Recomputes price statistics for a material from fresh supplier quotes.
 * Deliberately does NOT touch manualPriceExVat — that field is only ever
 * set or cleared by an explicit engineer action, never by a refresh.
 */
export function refreshCatalogueAverages(
  material: MaterialPricing,
  newPrices: PriceRecord[],
  preferredSuppliers: string[] = [],
  lastPurchasedSupplier?: string,
): MaterialPricing {
  return {
    manualPriceExVat: material.manualPriceExVat,
    priceStats: computePriceStats(newPrices, preferredSuppliers, lastPurchasedSupplier),
  };
}

// --- Markup vs margin -------------------------------------------------

export function sellingPriceExVat(costExVat: number, markupFraction: number): number {
  return costExVat * (1 + markupFraction);
}

/** Gross margin % = (selling - cost) / selling — NOT the same number as markup %. */
export function grossMarginFraction(costExVat: number, sellingExVat: number): number {
  if (sellingExVat === 0) return 0;
  return (sellingExVat - costExVat) / sellingExVat;
}

// --- Waste and sundries -------------------------------------------------

export const WASTE_PERCENT = {
  copper: 0.1,
  mlcp: 0.1,
  insulation: 0.1,
  cable: 0.1,
} as const;

export const SUNDRIES_PERCENT_OF_PIPEWORK_AND_FITTINGS = 0.075;

// --- VAT ------------------------------------------------------------

export type VatTreatment =
  | 'zero-rated-esm' // GB qualifying supply-and-install energy-saving materials, temporary 0% to 31 Mar 2027
  | 'standard-supply'
  | 'standard-additional-work'
  | 'northern-ireland'
  | 'custom';

/** GB ESM 0% rate currently runs to this date — the UI must prompt to verify after it. */
export const ESM_ZERO_RATE_END_DATE = '2027-03-31';

export interface VatInput {
  costExVat: number;
  treatment: VatTreatment;
  /** Required when treatment is 'custom' or 'northern-ireland' if the installer overrides the default. */
  customRatePercent?: number;
}

export interface VatResult {
  ratePercent: number;
  vatAmount: number;
  costIncVat: number;
  /** True if the UI must prompt the installer to confirm this rate before the quote finalises. */
  requiresConfirmation: boolean;
}

const STANDARD_RATE_PERCENT = 20;

export function calculateVat(input: VatInput): VatResult {
  const { costExVat, treatment, customRatePercent } = input;
  let ratePercent: number;
  switch (treatment) {
    case 'zero-rated-esm':
      ratePercent = 0;
      break;
    case 'standard-supply':
    case 'standard-additional-work':
      ratePercent = STANDARD_RATE_PERCENT;
      break;
    case 'northern-ireland':
      // NI ESM VAT treatment has differed from GB historically — the
      // installer must confirm the current rate rather than assume GB's 0%.
      ratePercent = customRatePercent ?? STANDARD_RATE_PERCENT;
      break;
    case 'custom':
      if (customRatePercent == null) throw new Error('customRatePercent required for custom VAT treatment');
      ratePercent = customRatePercent;
      break;
  }
  const vatAmount = costExVat * (ratePercent / 100);
  return {
    ratePercent,
    vatAmount,
    costIncVat: costExVat + vatAmount,
    requiresConfirmation: true, // the installer must always confirm treatment before the quote finalises
  };
}
