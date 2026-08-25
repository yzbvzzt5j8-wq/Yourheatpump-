import type { CommissioningChecklistItem } from '../../types/commissioning';

export function defaultChecklist(): CommissioningChecklistItem[] {
  return [
    { id: 'flush', label: 'System flushed and dosed per BS 7593', checked: false },
    { id: 'flow-verified', label: 'Design flow rate verified at the index circuit', checked: false },
    { id: 'pump-duty', label: 'Pump duty confirmed against the design pass/fail', checked: false },
    { id: 'glycol-dosed', label: 'Antifreeze concentration checked with a refractometer (if fitted)', checked: false },
    { id: 'controls', label: 'Controls and zone valves function-tested', checked: false },
    { id: 'dhw-cycle', label: 'DHW pasteurisation cycle run and verified', checked: false },
    { id: 'condensate', label: 'Condensate route checked and frost-protected', checked: false },
    { id: 'fgas', label: 'F-Gas registration confirmed (split systems only)', reference: 'F-Gas', checked: false },
    { id: 'g3', label: 'G3 unvented certification completed (unvented cylinders only)', reference: 'G3', checked: false },
    { id: 'dno', label: 'DNO notified where required', reference: 'DNO', checked: false },
    { id: 'building-control', label: 'Building control notified/certified', checked: false },
    { id: 'mcs-database', label: 'Registered on the MCS database (outside this application)', checked: false },
  ];
}
