import type { PriceRecord, VatTreatment } from '../calc/pricing';

export type MaterialCategory =
  | 'pipework' | 'fittings' | 'insulation' | 'valves' | 'filters' | 'flexibles'
  | 'freeze-protection' | 'cylinder' | 'radiators' | 'pumps' | 'electrical'
  | 'chemicals' | 'mounting' | 'condensate' | 'sundries' | 'main-equipment' | 'other';

export type MaterialStatus = 'verified' | 'provisional' | 'outdated' | 'supplier-quote-required';

export type Supplier =
  | 'Plumbase Basildon' | 'Williams Trade Supplies Basildon' | 'City Plumbing' | 'Screwfix'
  | 'Toolstation' | 'BES' | 'Local Merchant' | 'Manufacturer Direct' | 'Other';

export const PREFERRED_SUPPLIERS: Supplier[] = ['Plumbase Basildon', 'Williams Trade Supplies Basildon'];

export interface SupplierPrice extends PriceRecord {
  supplier: Supplier | string;
  supplierCode?: string;
  vatAmount: number;
  costIncVat: number;
  sourceReference?: string;
}

export interface MaterialRecord {
  id: string;
  category: MaterialCategory;
  productName: string;
  manufacturer: string;
  partNumber?: string;
  description: string;
  size?: string;
  connectionType?: string;
  unitOfSale: string; // e.g. "each", "3m length", "15m coil"
  packQuantity: number;
  supplierPrices: SupplierPrice[];
  /** Manually entered trade price — see calc/pricing.ts effectiveUnitPriceExVat. Never overwritten by a refresh. */
  manualPriceExVat?: number | null;
  dateChecked: string;
  defaultWastePercent: number;
  defaultMarkupFraction: number;
  customerSellingPriceExVat?: number;
  stockStatus?: string;
  /** True if this line is already included with a purchased heat pump or cylinder — never double-charge it. */
  includedWithHeatPumpOrCylinder: boolean;
  notes?: string;
  active: boolean;
  status: MaterialStatus;
}

export type KitType =
  | 'monobloc-external-connection' | 'antifreeze-valve-system' | 'glycol-system' | 'cylinder'
  | 'buffer-volumiser' | 'radiator-upgrade' | 'electrical-estimating' | 'flushing-commissioning';

export interface KitLine {
  materialId: string;
  quantity: number;
  /** True if this line came from the manufacturer and can be removed by the engineer. */
  manufacturerSupplied: boolean;
}

export interface Kit {
  id: string;
  type: KitType;
  name: string;
  lines: KitLine[];
}

export interface BomLine {
  id: string;
  materialId: string;
  quantity: number;
  wastePercent: number;
  /** Every line carries its reason, e.g. "Open volume 31 L against 40 L minimum — 9 L short". */
  reason: string;
  /** Must be true before this line enters the quotation. */
  engineerConfirmed: boolean;
}

export interface QuoteVatSelection {
  treatment: VatTreatment;
  customRatePercent?: number;
  confirmedByEngineer: boolean;
}
