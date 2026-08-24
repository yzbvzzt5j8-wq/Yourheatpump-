import type { MaterialRecord, SupplierPrice } from '../types/materials';

/**
 * Seed catalogue of UK average starting costs, ex-VAT. These are
 * ESTIMATING FIGURES ONLY — see the banner in features/materials — and
 * must be checked against current supplier quotations before a customer
 * quotation is issued. Main equipment carries no price and is always
 * 'supplier-quote-required' (see spec Part 4 guardrails).
 */
export const CATALOGUE_REVIEW_DATE = '2026-08-23';
export const CATALOGUE_STALE_WARNING_DAYS = 90;

function price(supplier: string, costExVat: number, vatRatePercent = 20): SupplierPrice {
  const vatAmount = costExVat * (vatRatePercent / 100);
  return { supplier, costExVat, vatAmount, costIncVat: costExVat + vatAmount, dateChecked: CATALOGUE_REVIEW_DATE };
}

let nextId = 1;
function id(prefix: string): string {
  return `${prefix}-${String(nextId++).padStart(3, '0')}`;
}

export const MATERIALS_CATALOGUE: MaterialRecord[] = [
  // --- Pipework ---------------------------------------------------
  {
    id: id('mat'), category: 'pipework', productName: 'Copper tube 15mm x 3m', manufacturer: 'Generic EN 1057',
    description: 'Half-hard copper tube to EN 1057', size: '15mm', connectionType: 'compression/solder',
    unitOfSale: '3m length', packQuantity: 1,
    supplierPrices: [price('Plumbase Basildon', 6.4), price('Williams Trade Supplies Basildon', 6.1), price('City Plumbing', 6.9), price('Screwfix', 7.5)],
    dateChecked: CATALOGUE_REVIEW_DATE, defaultWastePercent: 0.1, defaultMarkupFraction: 0.2,
    includedWithHeatPumpOrCylinder: false, active: true, status: 'provisional',
  },
  {
    id: id('mat'), category: 'pipework', productName: 'Copper tube 22mm x 3m', manufacturer: 'Generic EN 1057',
    description: 'Half-hard copper tube to EN 1057', size: '22mm', connectionType: 'compression/solder',
    unitOfSale: '3m length', packQuantity: 1,
    supplierPrices: [price('Plumbase Basildon', 9.8), price('Williams Trade Supplies Basildon', 9.4), price('City Plumbing', 10.6), price('Screwfix', 11.2)],
    dateChecked: CATALOGUE_REVIEW_DATE, defaultWastePercent: 0.1, defaultMarkupFraction: 0.2,
    includedWithHeatPumpOrCylinder: false, active: true, status: 'provisional',
  },
  {
    id: id('mat'), category: 'pipework', productName: 'Copper tube 28mm x 3m', manufacturer: 'Generic EN 1057',
    description: 'Half-hard copper tube to EN 1057', size: '28mm', connectionType: 'compression/solder',
    unitOfSale: '3m length', packQuantity: 1,
    supplierPrices: [price('Plumbase Basildon', 15.9), price('Williams Trade Supplies Basildon', 15.2), price('City Plumbing', 17.1)],
    dateChecked: CATALOGUE_REVIEW_DATE, defaultWastePercent: 0.1, defaultMarkupFraction: 0.2,
    includedWithHeatPumpOrCylinder: false, active: true, status: 'provisional',
  },
  {
    id: id('mat'), category: 'pipework', productName: 'Copper tube 35mm x 3m', manufacturer: 'Generic EN 1057',
    description: 'Half-hard copper tube to EN 1057', size: '35mm', connectionType: 'compression/solder',
    unitOfSale: '3m length', packQuantity: 1,
    supplierPrices: [price('Plumbase Basildon', 24.5), price('Williams Trade Supplies Basildon', 23.8)],
    dateChecked: CATALOGUE_REVIEW_DATE, defaultWastePercent: 0.1, defaultMarkupFraction: 0.2,
    includedWithHeatPumpOrCylinder: false, active: true, status: 'provisional',
  },
  {
    id: id('mat'), category: 'pipework', productName: 'MLCP pipe 20mm x 25m coil', manufacturer: 'Generic',
    description: 'Multi-layer composite pipe', size: '20mm', connectionType: 'push-fit/crimp',
    unitOfSale: '25m coil', packQuantity: 1,
    supplierPrices: [price('Plumbase Basildon', 38.0), price('Williams Trade Supplies Basildon', 36.5), price('BES', 41.0)],
    dateChecked: CATALOGUE_REVIEW_DATE, defaultWastePercent: 0.1, defaultMarkupFraction: 0.2,
    includedWithHeatPumpOrCylinder: false, active: true, status: 'provisional',
  },

  // --- Press-fit fittings (provisional, ranges by brand) ----------
  {
    id: id('mat'), category: 'fittings', productName: 'Press-fit elbow 22mm', manufacturer: 'Pegler Xpress',
    description: 'Press-fit copper elbow', size: '22mm', connectionType: 'press-fit',
    unitOfSale: 'each', packQuantity: 1,
    supplierPrices: [price('Plumbase Basildon', 4.2), price('City Plumbing', 4.6)],
    dateChecked: CATALOGUE_REVIEW_DATE, defaultWastePercent: 0.1, defaultMarkupFraction: 0.25,
    includedWithHeatPumpOrCylinder: false, active: true, status: 'provisional',
    notes: 'Provisional — press-fit ranges vary by brand (Pegler Xpress, Conex Bänninger, Geberit Mapress, merchant-own). Verify before quoting.',
  },
  {
    id: id('mat'), category: 'fittings', productName: 'Press-fit elbow 22mm', manufacturer: 'Conex Bänninger',
    description: 'Press-fit copper elbow', size: '22mm', connectionType: 'press-fit',
    unitOfSale: 'each', packQuantity: 1,
    supplierPrices: [price('Williams Trade Supplies Basildon', 4.5), price('City Plumbing', 4.9)],
    dateChecked: CATALOGUE_REVIEW_DATE, defaultWastePercent: 0.1, defaultMarkupFraction: 0.25,
    includedWithHeatPumpOrCylinder: false, active: true, status: 'provisional',
  },
  {
    id: id('mat'), category: 'fittings', productName: 'Press-fit elbow 22mm', manufacturer: 'Geberit Mapress',
    description: 'Press-fit copper elbow', size: '22mm', connectionType: 'press-fit',
    unitOfSale: 'each', packQuantity: 1,
    supplierPrices: [price('City Plumbing', 5.8), price('BES', 6.1)],
    dateChecked: CATALOGUE_REVIEW_DATE, defaultWastePercent: 0.1, defaultMarkupFraction: 0.25,
    includedWithHeatPumpOrCylinder: false, active: true, status: 'provisional',
  },
  {
    id: id('mat'), category: 'fittings', productName: 'Compression coupling 22mm', manufacturer: 'Generic',
    description: 'Straight compression coupling', size: '22mm', connectionType: 'compression',
    unitOfSale: 'each', packQuantity: 1,
    supplierPrices: [price('Plumbase Basildon', 2.1), price('Screwfix', 2.6), price('Toolstation', 2.4)],
    dateChecked: CATALOGUE_REVIEW_DATE, defaultWastePercent: 0.1, defaultMarkupFraction: 0.25,
    includedWithHeatPumpOrCylinder: false, active: true, status: 'provisional',
  },

  // --- Insulation ---------------------------------------------------
  {
    id: id('mat'), category: 'insulation', productName: 'Pipe insulation 22mm x 2m (internal, Class O)', manufacturer: 'Armaflex-equivalent',
    description: 'Nitrile foam pipe insulation, internal use', size: '22mm', connectionType: 'n/a',
    unitOfSale: '2m length', packQuantity: 1,
    supplierPrices: [price('Plumbase Basildon', 5.3), price('Screwfix', 5.9)],
    dateChecked: CATALOGUE_REVIEW_DATE, defaultWastePercent: 0.1, defaultMarkupFraction: 0.2,
    includedWithHeatPumpOrCylinder: false, active: true, status: 'provisional',
  },
  {
    id: id('mat'), category: 'insulation', productName: 'UV-stable pipe insulation 22mm x 2m (external)', manufacturer: 'Armaflex-equivalent',
    description: 'UV-stable nitrile foam pipe insulation, external use', size: '22mm', connectionType: 'n/a',
    unitOfSale: '2m length', packQuantity: 1,
    supplierPrices: [price('Plumbase Basildon', 8.9), price('City Plumbing', 9.6)],
    dateChecked: CATALOGUE_REVIEW_DATE, defaultWastePercent: 0.1, defaultMarkupFraction: 0.2,
    includedWithHeatPumpOrCylinder: false, active: true, status: 'provisional',
  },

  // --- Valves / filters / flexibles / freeze protection ----------
  {
    id: id('mat'), category: 'valves', productName: 'Automatic bypass valve 22mm', manufacturer: 'Generic',
    description: 'Differential pressure automatic bypass valve', size: '22mm', connectionType: 'compression',
    unitOfSale: 'each', packQuantity: 1,
    supplierPrices: [price('Plumbase Basildon', 42.0), price('City Plumbing', 45.5)],
    dateChecked: CATALOGUE_REVIEW_DATE, defaultWastePercent: 0, defaultMarkupFraction: 0.2,
    includedWithHeatPumpOrCylinder: false, active: true, status: 'provisional',
  },
  {
    id: id('mat'), category: 'filters', productName: 'Magnetic system filter 22mm', manufacturer: 'Generic',
    description: 'In-line magnetic filter, fitted on the return', size: '22mm', connectionType: 'compression',
    unitOfSale: 'each', packQuantity: 1,
    supplierPrices: [price('Plumbase Basildon', 68.0), price('Williams Trade Supplies Basildon', 65.0), price('Screwfix', 74.0)],
    dateChecked: CATALOGUE_REVIEW_DATE, defaultWastePercent: 0, defaultMarkupFraction: 0.2,
    includedWithHeatPumpOrCylinder: false, active: true, status: 'provisional',
  },
  {
    id: id('mat'), category: 'flexibles', productName: 'Anti-vibration flexible hose set (pair)', manufacturer: 'Generic',
    description: 'Flow/return flexible connectors for the outdoor unit', size: '22mm', connectionType: 'compression',
    unitOfSale: 'pair', packQuantity: 1,
    supplierPrices: [price('Plumbase Basildon', 34.0), price('City Plumbing', 37.0)],
    dateChecked: CATALOGUE_REVIEW_DATE, defaultWastePercent: 0, defaultMarkupFraction: 0.2,
    includedWithHeatPumpOrCylinder: false, active: true, status: 'provisional',
  },
  {
    id: id('mat'), category: 'freeze-protection', productName: 'Propylene glycol antifreeze, 20L', manufacturer: 'Generic (inhibited)',
    description: 'Inhibited propylene glycol heat transfer fluid, ready-mixed or concentrate', size: '20L', connectionType: 'n/a',
    unitOfSale: '20L drum', packQuantity: 1,
    supplierPrices: [price('Plumbase Basildon', 58.0), price('City Plumbing', 62.0), price('Manufacturer Direct', 55.0)],
    dateChecked: CATALOGUE_REVIEW_DATE, defaultWastePercent: 0, defaultMarkupFraction: 0.2,
    includedWithHeatPumpOrCylinder: false, active: true, status: 'provisional',
    notes: 'Never add just because the unit is a monobloc — quantity must be calculated from system volume x approved concentration.',
  },

  // --- Safety / commissioning components --------------------------
  {
    id: id('mat'), category: 'valves', productName: 'Pressure relief valve 3 bar 22mm', manufacturer: 'Generic',
    description: 'PRV, fitted on the return', size: '22mm', connectionType: 'compression',
    unitOfSale: 'each', packQuantity: 1,
    supplierPrices: [price('Plumbase Basildon', 22.0), price('Screwfix', 24.5)],
    dateChecked: CATALOGUE_REVIEW_DATE, defaultWastePercent: 0, defaultMarkupFraction: 0.2,
    includedWithHeatPumpOrCylinder: false, active: true, status: 'provisional',
  },
  {
    id: id('mat'), category: 'valves', productName: 'Automatic air vent 15mm', manufacturer: 'Generic',
    description: 'Automatic air vent', size: '15mm', connectionType: 'compression',
    unitOfSale: 'each', packQuantity: 1,
    supplierPrices: [price('Plumbase Basildon', 9.5), price('Toolstation', 10.8)],
    dateChecked: CATALOGUE_REVIEW_DATE, defaultWastePercent: 0, defaultMarkupFraction: 0.2,
    includedWithHeatPumpOrCylinder: false, active: true, status: 'provisional',
  },
  {
    id: id('mat'), category: 'valves', productName: 'Drain cock 15mm', manufacturer: 'Generic',
    description: 'Hose-union drain cock', size: '15mm', connectionType: 'compression',
    unitOfSale: 'each', packQuantity: 1,
    supplierPrices: [price('Plumbase Basildon', 4.8), price('Screwfix', 5.4)],
    dateChecked: CATALOGUE_REVIEW_DATE, defaultWastePercent: 0, defaultMarkupFraction: 0.2,
    includedWithHeatPumpOrCylinder: false, active: true, status: 'provisional',
  },
  {
    id: id('mat'), category: 'valves', productName: 'Flow setter / commissioning valve 22mm', manufacturer: 'Generic',
    description: 'Double regulating valve with flow indication', size: '22mm', connectionType: 'compression',
    unitOfSale: 'each', packQuantity: 1,
    supplierPrices: [price('Plumbase Basildon', 46.0), price('City Plumbing', 49.0)],
    dateChecked: CATALOGUE_REVIEW_DATE, defaultWastePercent: 0, defaultMarkupFraction: 0.2,
    includedWithHeatPumpOrCylinder: false, active: true, status: 'provisional',
  },
  {
    id: id('mat'), category: 'sundries', productName: 'Flow/return temperature sensor pair', manufacturer: 'Generic',
    description: 'Immersion-pocket temperature sensors', size: 'n/a', connectionType: 'n/a',
    unitOfSale: 'pair', packQuantity: 1,
    supplierPrices: [price('Manufacturer Direct', 32.0)],
    dateChecked: CATALOGUE_REVIEW_DATE, defaultWastePercent: 0, defaultMarkupFraction: 0.15,
    includedWithHeatPumpOrCylinder: false, active: true, status: 'provisional',
  },

  // --- Chemicals ----------------------------------------------------
  {
    id: id('mat'), category: 'chemicals', productName: 'System flush / cleaner, 5L', manufacturer: 'Generic',
    description: 'Pre-commission chemical flush per BS 7593', size: '5L', connectionType: 'n/a',
    unitOfSale: '5L', packQuantity: 1,
    supplierPrices: [price('Plumbase Basildon', 24.0), price('Screwfix', 26.5)],
    dateChecked: CATALOGUE_REVIEW_DATE, defaultWastePercent: 0, defaultMarkupFraction: 0.2,
    includedWithHeatPumpOrCylinder: false, active: true, status: 'provisional',
  },
  {
    id: id('mat'), category: 'chemicals', productName: 'Inhibitor, 5L', manufacturer: 'Generic',
    description: 'Corrosion inhibitor, dosed post-flush', size: '5L', connectionType: 'n/a',
    unitOfSale: '5L', packQuantity: 1,
    supplierPrices: [price('Plumbase Basildon', 26.0), price('Screwfix', 28.0)],
    dateChecked: CATALOGUE_REVIEW_DATE, defaultWastePercent: 0, defaultMarkupFraction: 0.2,
    includedWithHeatPumpOrCylinder: false, active: true, status: 'provisional',
  },

  // --- Mounting / condensate -----------------------------------
  {
    id: id('mat'), category: 'mounting', productName: 'Anti-vibration outdoor unit feet (set of 4)', manufacturer: 'Generic',
    description: 'Rubber anti-vibration mounting feet', size: 'n/a', connectionType: 'n/a',
    unitOfSale: 'set of 4', packQuantity: 1,
    supplierPrices: [price('Plumbase Basildon', 28.0), price('City Plumbing', 31.0)],
    dateChecked: CATALOGUE_REVIEW_DATE, defaultWastePercent: 0, defaultMarkupFraction: 0.2,
    includedWithHeatPumpOrCylinder: false, active: true, status: 'provisional',
  },
  {
    id: id('mat'), category: 'condensate', productName: 'Condensate trap and pipe kit', manufacturer: 'Generic',
    description: 'Condensate management kit for the outdoor unit', size: '21.5mm', connectionType: 'push-fit',
    unitOfSale: 'kit', packQuantity: 1,
    supplierPrices: [price('Plumbase Basildon', 18.0), price('Screwfix', 21.0)],
    dateChecked: CATALOGUE_REVIEW_DATE, defaultWastePercent: 0, defaultMarkupFraction: 0.2,
    includedWithHeatPumpOrCylinder: false, active: true, status: 'provisional',
  },

  // --- Electrical (estimating allowance only) ---------------------
  {
    id: id('mat'), category: 'electrical', productName: 'Electrical estimating allowance (supply + isolator + cabling)', manufacturer: 'n/a',
    description: 'Estimating allowance only — final electrical work must be sized by a competent electrician, never from heating output.',
    size: 'n/a', connectionType: 'n/a', unitOfSale: 'allowance', packQuantity: 1,
    supplierPrices: [price('Local Merchant', 350)],
    dateChecked: CATALOGUE_REVIEW_DATE, defaultWastePercent: 0, defaultMarkupFraction: 0.15,
    includedWithHeatPumpOrCylinder: false, active: true, status: 'provisional',
    notes: 'Estimating allowance only. Must never be sized from heating output — a competent electrician must confirm the actual requirement.',
  },

  // --- Radiators (estimating allowance only) -----------------------
  {
    id: id('mat'), category: 'radiators', productName: 'Radiator upgrade — estimating allowance', manufacturer: 'n/a',
    description: 'Estimating allowance only — an exact model and Delta-50 output must be selected before quoting.',
    size: 'n/a', connectionType: 'n/a', unitOfSale: 'allowance', packQuantity: 1,
    supplierPrices: [price('Local Merchant', 180)],
    dateChecked: CATALOGUE_REVIEW_DATE, defaultWastePercent: 0, defaultMarkupFraction: 0.2,
    includedWithHeatPumpOrCylinder: false, active: true, status: 'provisional',
    notes: 'Estimating allowance only. Radiators need an exact model and Delta-50 output selected from the radiator catalogue.',
  },

  // --- Main equipment: quote required, never averaged --------------
  {
    id: id('mat'), category: 'main-equipment', productName: 'Outdoor unit', manufacturer: 'n/a',
    description: 'Model and price selected per job — never an average.', unitOfSale: 'each', packQuantity: 1,
    supplierPrices: [], dateChecked: CATALOGUE_REVIEW_DATE, defaultWastePercent: 0, defaultMarkupFraction: 0.15,
    includedWithHeatPumpOrCylinder: false, active: true, status: 'supplier-quote-required',
  },
  {
    id: id('mat'), category: 'main-equipment', productName: 'Hydraulic module', manufacturer: 'n/a',
    description: 'Model and price selected per job — never an average.', unitOfSale: 'each', packQuantity: 1,
    supplierPrices: [], dateChecked: CATALOGUE_REVIEW_DATE, defaultWastePercent: 0, defaultMarkupFraction: 0.15,
    includedWithHeatPumpOrCylinder: false, active: true, status: 'supplier-quote-required',
  },
  {
    id: id('mat'), category: 'main-equipment', productName: 'Controller', manufacturer: 'n/a',
    description: 'Model and price selected per job — never an average.', unitOfSale: 'each', packQuantity: 1,
    supplierPrices: [], dateChecked: CATALOGUE_REVIEW_DATE, defaultWastePercent: 0, defaultMarkupFraction: 0.15,
    includedWithHeatPumpOrCylinder: false, active: true, status: 'supplier-quote-required',
  },
  {
    id: id('mat'), category: 'main-equipment', productName: 'Backup heater', manufacturer: 'n/a',
    description: 'Model and price selected per job — never an average.', unitOfSale: 'each', packQuantity: 1,
    supplierPrices: [], dateChecked: CATALOGUE_REVIEW_DATE, defaultWastePercent: 0, defaultMarkupFraction: 0.15,
    includedWithHeatPumpOrCylinder: false, active: true, status: 'supplier-quote-required',
  },
  {
    id: id('mat'), category: 'main-equipment', productName: 'Cylinder', manufacturer: 'n/a',
    description: 'Model and price selected per job — never an average.', unitOfSale: 'each', packQuantity: 1,
    supplierPrices: [], dateChecked: CATALOGUE_REVIEW_DATE, defaultWastePercent: 0, defaultMarkupFraction: 0.15,
    includedWithHeatPumpOrCylinder: false, active: true, status: 'supplier-quote-required',
  },
  {
    id: id('mat'), category: 'main-equipment', productName: 'Pre-plumbed cylinder', manufacturer: 'n/a',
    description: 'Model and price selected per job — never an average. Never double-charge components it already includes (immersion, expansion vessel, inlet control group, T&P valve, motorised valve, tundish, sensors, wiring centre, primary pump).',
    unitOfSale: 'each', packQuantity: 1,
    supplierPrices: [], dateChecked: CATALOGUE_REVIEW_DATE, defaultWastePercent: 0, defaultMarkupFraction: 0.15,
    includedWithHeatPumpOrCylinder: false, active: true, status: 'supplier-quote-required',
  },
  {
    id: id('mat'), category: 'main-equipment', productName: 'Hydraulic tower', manufacturer: 'n/a',
    description: 'Model and price selected per job — never an average.', unitOfSale: 'each', packQuantity: 1,
    supplierPrices: [], dateChecked: CATALOGUE_REVIEW_DATE, defaultWastePercent: 0, defaultMarkupFraction: 0.15,
    includedWithHeatPumpOrCylinder: false, active: true, status: 'supplier-quote-required',
  },
  {
    id: id('mat'), category: 'main-equipment', productName: 'Installation pack', manufacturer: 'n/a',
    description: 'Model and price selected per job — never an average.', unitOfSale: 'each', packQuantity: 1,
    supplierPrices: [], dateChecked: CATALOGUE_REVIEW_DATE, defaultWastePercent: 0, defaultMarkupFraction: 0.15,
    includedWithHeatPumpOrCylinder: false, active: true, status: 'supplier-quote-required',
  },

  // --- Never auto-added: buffer / volumiser / LLH / secondary pump / plate HX ---
  {
    id: id('mat'), category: 'main-equipment', productName: 'Buffer vessel', manufacturer: 'n/a',
    description: 'Never auto-added — only added when the design or manufacturer requires it, with the reason recorded.',
    unitOfSale: 'each', packQuantity: 1,
    supplierPrices: [], dateChecked: CATALOGUE_REVIEW_DATE, defaultWastePercent: 0, defaultMarkupFraction: 0.15,
    includedWithHeatPumpOrCylinder: false, active: true, status: 'supplier-quote-required',
  },
  {
    id: id('mat'), category: 'main-equipment', productName: 'Volumiser', manufacturer: 'n/a',
    description: 'Never auto-added — only added when the design or manufacturer requires it, with the reason recorded.',
    unitOfSale: 'each', packQuantity: 1,
    supplierPrices: [], dateChecked: CATALOGUE_REVIEW_DATE, defaultWastePercent: 0, defaultMarkupFraction: 0.15,
    includedWithHeatPumpOrCylinder: false, active: true, status: 'supplier-quote-required',
  },
  {
    id: id('mat'), category: 'main-equipment', productName: 'Low loss header', manufacturer: 'n/a',
    description: 'Never auto-added — only added when the design or manufacturer requires it, with the reason recorded.',
    unitOfSale: 'each', packQuantity: 1,
    supplierPrices: [], dateChecked: CATALOGUE_REVIEW_DATE, defaultWastePercent: 0, defaultMarkupFraction: 0.15,
    includedWithHeatPumpOrCylinder: false, active: true, status: 'supplier-quote-required',
  },
  {
    id: id('mat'), category: 'pumps', productName: 'Secondary pump', manufacturer: 'n/a',
    description: 'Never auto-added — only added when the design or manufacturer requires it, with the reason recorded.',
    unitOfSale: 'each', packQuantity: 1,
    supplierPrices: [], dateChecked: CATALOGUE_REVIEW_DATE, defaultWastePercent: 0, defaultMarkupFraction: 0.15,
    includedWithHeatPumpOrCylinder: false, active: true, status: 'supplier-quote-required',
  },
  {
    id: id('mat'), category: 'main-equipment', productName: 'Plate heat exchanger', manufacturer: 'n/a',
    description: 'Never auto-added — only added when the design or manufacturer requires it, with the reason recorded.',
    unitOfSale: 'each', packQuantity: 1,
    supplierPrices: [], dateChecked: CATALOGUE_REVIEW_DATE, defaultWastePercent: 0, defaultMarkupFraction: 0.15,
    includedWithHeatPumpOrCylinder: false, active: true, status: 'supplier-quote-required',
  },
];

export function isCataloguePriceStale(dateCheckedIso: string, todayIso: string): boolean {
  const days = (new Date(todayIso).getTime() - new Date(dateCheckedIso).getTime()) / (1000 * 60 * 60 * 24);
  return days > CATALOGUE_STALE_WARNING_DAYS;
}
