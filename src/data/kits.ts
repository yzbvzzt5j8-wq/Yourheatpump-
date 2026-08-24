import type { Kit } from '../types/materials';
import { MATERIALS_CATALOGUE } from './materials';

function findMaterialId(productName: string): string {
  const material = MATERIALS_CATALOGUE.find((m) => m.productName === productName);
  if (!material) throw new Error(`Kit references unknown material: ${productName}`);
  return material.id;
}

/**
 * Eight editable kits (spec Part 4). Lines are starting points — the
 * engineer can remove manufacturer-supplied items and add or adjust
 * quantities per job.
 */
export const KITS: Kit[] = [
  {
    id: 'kit-monobloc-external',
    type: 'monobloc-external-connection',
    name: 'Monobloc external connection',
    lines: [
      { materialId: findMaterialId('Anti-vibration flexible hose set (pair)'), quantity: 1, manufacturerSupplied: false },
      { materialId: findMaterialId('Anti-vibration outdoor unit feet (set of 4)'), quantity: 1, manufacturerSupplied: false },
      { materialId: findMaterialId('Condensate trap and pipe kit'), quantity: 1, manufacturerSupplied: false },
      { materialId: findMaterialId('UV-stable pipe insulation 22mm x 2m (external)'), quantity: 6, manufacturerSupplied: false },
    ],
  },
  {
    id: 'kit-antifreeze-valve-system',
    type: 'antifreeze-valve-system',
    name: 'Antifreeze valve system',
    lines: [
      { materialId: findMaterialId('Automatic bypass valve 22mm'), quantity: 1, manufacturerSupplied: false },
    ],
  },
  {
    id: 'kit-glycol-system',
    type: 'glycol-system',
    name: 'Glycol system',
    lines: [
      { materialId: findMaterialId('Propylene glycol antifreeze, 20L'), quantity: 1, manufacturerSupplied: false },
    ],
  },
  {
    id: 'kit-cylinder',
    type: 'cylinder',
    name: 'Cylinder',
    lines: [
      { materialId: findMaterialId('Cylinder'), quantity: 1, manufacturerSupplied: false },
      { materialId: findMaterialId('Flow/return temperature sensor pair'), quantity: 1, manufacturerSupplied: true },
    ],
  },
  {
    id: 'kit-buffer-volumiser',
    type: 'buffer-volumiser',
    name: 'Buffer / volumiser',
    lines: [
      { materialId: findMaterialId('Volumiser'), quantity: 1, manufacturerSupplied: false },
    ],
  },
  {
    id: 'kit-radiator-upgrade',
    type: 'radiator-upgrade',
    name: 'Radiator upgrade',
    lines: [
      { materialId: findMaterialId('Radiator upgrade — estimating allowance'), quantity: 1, manufacturerSupplied: false },
    ],
  },
  {
    id: 'kit-electrical-estimating',
    type: 'electrical-estimating',
    name: 'Electrical estimating',
    lines: [
      { materialId: findMaterialId('Electrical estimating allowance (supply + isolator + cabling)'), quantity: 1, manufacturerSupplied: false },
    ],
  },
  {
    id: 'kit-flushing-commissioning',
    type: 'flushing-commissioning',
    name: 'Flushing and commissioning',
    lines: [
      { materialId: findMaterialId('System flush / cleaner, 5L'), quantity: 1, manufacturerSupplied: false },
      { materialId: findMaterialId('Inhibitor, 5L'), quantity: 1, manufacturerSupplied: false },
      { materialId: findMaterialId('Magnetic system filter 22mm'), quantity: 1, manufacturerSupplied: false },
    ],
  },
];
