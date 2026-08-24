import type { Circuit, ControlType, EmitterType } from '../../types/hydraulics';
import type { Survey } from '../../types/survey';
import { calculateRoomHeatLoss } from '../../calc/heatloss';
import { Banner, Button, Card, Field, Select, TextInput } from '../../components/ui';

function uid(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

const EMITTER_TYPES: EmitterType[] = ['radiator', 'ufh', 'towel-rail', 'fan-coil', 'mixed'];
const CONTROL_TYPES: ControlType[] = ['zone-1', 'zone-2', 'zone-3', 'trvs-only', 'always-open'];

function roomHeatLossW(survey: Survey, roomId: string): number | null {
  const room = survey.rooms.find((r) => r.id === roomId);
  if (!room) return null;
  const volumeM3 = room.lengthM * room.widthM * room.heightM;
  const result = calculateRoomHeatLoss({
    roomTempC: room.designTempC,
    externalTempC: survey.externalDesignTempC,
    fabric: room.fabric,
    partitions: room.partitions,
    volumeM3,
    airChangesPerHour: room.airChangesPerHour,
    bridgingFraction: survey.bridgingFraction,
  });
  return result.totalW;
}

/** Every circuit's load, derived from its assigned rooms' surveyed heat loss. */
function circuitLoadW(survey: Survey | null, roomIds: string[]): { loadW: number; missingRoomCount: number } {
  if (!survey) return { loadW: 0, missingRoomCount: roomIds.length };
  let loadW = 0;
  let missingRoomCount = 0;
  for (const id of roomIds) {
    const w = roomHeatLossW(survey, id);
    if (w == null) missingRoomCount++;
    else loadW += w;
  }
  return { loadW, missingRoomCount };
}

function deriveLabel(survey: Survey | null, level: string, roomIds: string[]): string {
  const names = (survey?.rooms ?? []).filter((r) => roomIds.includes(r.id)).map((r) => r.name);
  const roomPart = names.length > 0 ? names.join(' + ') : 'Unassigned';
  return level ? `${level} — ${roomPart}` : roomPart;
}

/**
 * Shared circuit-tree editor used by both the guided setup "Heating areas"
 * step and the Hydraulics screen, so a heating area is only ever added in
 * one place (spec rule: ask one question once).
 */
export function CircuitTreeEditor({
  jobId,
  survey,
  circuits,
  onChange,
}: {
  jobId: string;
  survey: Survey | null;
  circuits: Circuit[];
  onChange: (circuits: Circuit[]) => void;
}) {
  const assignedElsewhere = (excludeCircuitId: string | null) =>
    new Set(circuits.filter((c) => c.id !== excludeCircuitId).flatMap((c) => c.roomIds));

  const surveyedRooms = survey?.rooms ?? [];

  function addCircuit() {
    const newCircuit: Circuit = {
      id: uid('circuit'), jobId, parentId: null, label: 'New area', level: 'Ground floor',
      branchPoint: 'Heat pump primary', verticalM: 0, horizontalM: 5, fittingEquivalentM: 2,
      zone: 'zone-1', controlType: 'zone-1', emitterType: 'radiator', roomIds: [],
    };
    onChange([...circuits, newCircuit]);
  }

  function updateCircuit(id: string, patch: Partial<Circuit>) {
    onChange(
      circuits.map((c) => {
        if (c.id !== id) return c;
        const next = { ...c, ...patch };
        if (patch.roomIds || patch.level) {
          next.label = deriveLabel(survey, next.level, next.roomIds);
        }
        return next;
      }),
    );
  }

  function removeCircuit(id: string) {
    // Also detach children so the tree never references a deleted parent.
    onChange(circuits.filter((c) => c.id !== id).map((c) => (c.parentId === id ? { ...c, parentId: null } : c)));
  }

  return (
    <div className="space-y-3">
      {!survey && <Banner tone="warning">No survey found for this job — room loads cannot be derived automatically.</Banner>}
      {circuits.map((circuit) => {
        const excludedElsewhere = assignedElsewhere(circuit.id);
        const availableRooms = surveyedRooms.filter((r) => !excludedElsewhere.has(r.id));
        const { loadW, missingRoomCount } = circuitLoadW(survey, circuit.roomIds);
        const otherCircuits = circuits.filter((c) => c.id !== circuit.id);

        return (
          <Card key={circuit.id} className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-900">{circuit.label}</span>
              <button className="text-xs text-red-600" onClick={() => removeCircuit(circuit.id)}>Remove</button>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Rooms served" hint="Rooms already assigned to another area drop out of this list.">
                <select
                  multiple
                  className="h-24 w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
                  value={circuit.roomIds}
                  onChange={(e) => updateCircuit(circuit.id, { roomIds: Array.from(e.target.selectedOptions).map((o) => o.value) })}
                >
                  {availableRooms.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
              </Field>
              <Field label="Floor / level">
                <TextInput value={circuit.level} onChange={(e) => updateCircuit(circuit.id, { level: e.target.value })} />
              </Field>
              <Field label="Branches off">
                <Select
                  value={circuit.parentId ?? ''}
                  onChange={(e) => updateCircuit(circuit.id, { parentId: e.target.value || null })}
                >
                  <option value="">Heat pump primary</option>
                  {otherCircuits.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
                </Select>
              </Field>
              <Field label="Branch point">
                <TextInput value={circuit.branchPoint} onChange={(e) => updateCircuit(circuit.id, { branchPoint: e.target.value })} />
              </Field>
              <Field label="Emitter type">
                <Select value={circuit.emitterType} onChange={(e) => updateCircuit(circuit.id, { emitterType: e.target.value as EmitterType })}>
                  {EMITTER_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </Select>
              </Field>
              <Field label="Control">
                <Select value={circuit.controlType} onChange={(e) => updateCircuit(circuit.id, { controlType: e.target.value as ControlType, zone: e.target.value })}>
                  {CONTROL_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </Select>
              </Field>
              <Field label="Horizontal run (m)">
                <TextInput type="number" step="0.5" value={circuit.horizontalM} onChange={(e) => updateCircuit(circuit.id, { horizontalM: Number(e.target.value) })} />
              </Field>
              <Field label="Vertical rise/drop (m)">
                <TextInput type="number" step="0.5" value={circuit.verticalM} onChange={(e) => updateCircuit(circuit.id, { verticalM: Number(e.target.value) })} />
              </Field>
            </div>

            <div className="rounded-md bg-slate-50 p-2 text-sm">
              <span className="font-medium text-slate-900">{(loadW / 1000).toFixed(2)} kW</span>
              <span className="ml-1 text-slate-500">from surveyed rooms</span>
              {missingRoomCount > 0 && (
                <div className="mt-1 text-xs text-amber-700">
                  {missingRoomCount} room(s) here have no matching survey data — this area's load is understated. Add a manual load or match them to a surveyed room.
                </div>
              )}
            </div>
          </Card>
        );
      })}
      <Button onClick={addCircuit}>+ Add heating area</Button>
    </div>
  );
}
