import type { SurveyFabricElement, SurveyPartition, SurveyRoom } from '../../types/survey';
import { calculateRoomHeatLoss } from '../../calc/heatloss';
import { Button, Card, Field, Select, StatGrid, TextInput } from '../../components/ui';
import { B_FACTOR_OPTIONS, FABRIC_ELEMENT_TYPES, ROOM_TYPES } from './roomTypes';

function uid(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export function RoomEditor({
  room,
  otherRooms,
  externalTempC,
  bridgingFraction,
  onChange,
  onDelete,
}: {
  room: SurveyRoom;
  otherRooms: SurveyRoom[];
  externalTempC: number;
  bridgingFraction: number;
  onChange: (room: SurveyRoom) => void;
  onDelete: () => void;
}) {
  const volumeM3 = room.lengthM * room.widthM * room.heightM;

  const result = calculateRoomHeatLoss({
    roomTempC: room.designTempC,
    externalTempC,
    fabric: room.fabric.map((f) => ({ label: f.label, areaM2: f.areaM2, uValue: f.uValue, bFactor: f.bFactor })),
    partitions: room.partitions.map((p) => ({ label: p.label, areaM2: p.areaM2, uValue: p.uValue, adjacentRoomTempC: p.adjacentRoomTempC })),
    volumeM3,
    airChangesPerHour: room.airChangesPerHour,
    bridgingFraction,
  });

  function update<K extends keyof SurveyRoom>(key: K, value: SurveyRoom[K]) {
    onChange({ ...room, [key]: value });
  }

  function addFabric() {
    const el: SurveyFabricElement = { id: uid('fab'), label: 'New element', type: 'wall', areaM2: 0, uValue: 0.3, bFactor: 'outsideAir' };
    update('fabric', [...room.fabric, el]);
  }
  function updateFabric(id: string, patch: Partial<SurveyFabricElement>) {
    update('fabric', room.fabric.map((f) => (f.id === id ? { ...f, ...patch } : f)));
  }
  function removeFabric(id: string) {
    update('fabric', room.fabric.filter((f) => f.id !== id));
  }

  function addPartition() {
    const p: SurveyPartition = { id: uid('part'), label: 'New partition', areaM2: 0, uValue: 1.5, adjacentRoomId: null, adjacentRoomTempC: 18 };
    update('partitions', [...room.partitions, p]);
  }
  function updatePartition(id: string, patch: Partial<SurveyPartition>) {
    update('partitions', room.partitions.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  }
  function removePartition(id: string) {
    update('partitions', room.partitions.filter((p) => p.id !== id));
  }

  return (
    <Card className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Room name">
          <TextInput value={room.name} onChange={(e) => update('name', e.target.value)} />
        </Field>
        <Field label="Room type">
          <Select value={room.roomType} onChange={(e) => update('roomType', e.target.value as SurveyRoom['roomType'])}>
            {ROOM_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </Select>
        </Field>
        <Field label="Floor">
          <TextInput value={room.floor} onChange={(e) => update('floor', e.target.value)} placeholder="Ground floor" />
        </Field>
        <Field label="Design temperature (°C)">
          <TextInput type="number" value={room.designTempC} onChange={(e) => update('designTempC', Number(e.target.value))} />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Field label="Length (m)">
          <TextInput type="number" step="0.1" value={room.lengthM} onChange={(e) => update('lengthM', Number(e.target.value))} />
        </Field>
        <Field label="Width (m)">
          <TextInput type="number" step="0.1" value={room.widthM} onChange={(e) => update('widthM', Number(e.target.value))} />
        </Field>
        <Field label="Height (m)">
          <TextInput type="number" step="0.1" value={room.heightM} onChange={(e) => update('heightM', Number(e.target.value))} />
        </Field>
        <Field label="Air changes/hr">
          <TextInput type="number" step="0.1" value={room.airChangesPerHour} onChange={(e) => update('airChangesPerHour', Number(e.target.value))} />
        </Field>
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <h4 className="text-sm font-semibold text-slate-700">Fabric elements</h4>
          <Button variant="ghost" onClick={addFabric}>+ Add</Button>
        </div>
        <div className="space-y-2">
          {room.fabric.map((f) => (
            <div key={f.id} className="grid grid-cols-2 gap-2 rounded-md border border-slate-200 p-2 sm:grid-cols-6 sm:items-end">
              <TextInput className="sm:col-span-2" value={f.label} onChange={(e) => updateFabric(f.id, { label: e.target.value })} placeholder="Label" />
              <Select value={f.type} onChange={(e) => updateFabric(f.id, { type: e.target.value as SurveyFabricElement['type'] })}>
                {FABRIC_ELEMENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </Select>
              <TextInput type="number" step="0.1" value={f.areaM2} onChange={(e) => updateFabric(f.id, { areaM2: Number(e.target.value) })} placeholder="Area m²" />
              <TextInput type="number" step="0.01" value={f.uValue} onChange={(e) => updateFabric(f.id, { uValue: Number(e.target.value) })} placeholder="U-value" />
              <Select
                value={typeof f.bFactor === 'string' ? f.bFactor : ''}
                onChange={(e) => updateFabric(f.id, { bFactor: e.target.value as SurveyFabricElement['bFactor'] })}
              >
                {B_FACTOR_OPTIONS.map((b) => <option key={b.key} value={b.key}>{b.label} (b={b.value})</option>)}
              </Select>
              <button className="text-xs text-red-600 sm:col-span-6 sm:text-left" onClick={() => removeFabric(f.id)}>Remove</button>
            </div>
          ))}
          {room.fabric.length === 0 && <p className="text-xs text-slate-400">No fabric elements yet.</p>}
        </div>
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <h4 className="text-sm font-semibold text-slate-700">
            Partitions <span className="font-normal text-slate-400">(to rooms at a different design temperature)</span>
          </h4>
          <Button variant="ghost" onClick={addPartition}>+ Add</Button>
        </div>
        <div className="space-y-2">
          {room.partitions.map((p) => (
            <div key={p.id} className="grid grid-cols-2 gap-2 rounded-md border border-slate-200 p-2 sm:grid-cols-5 sm:items-end">
              <TextInput className="sm:col-span-2" value={p.label} onChange={(e) => updatePartition(p.id, { label: e.target.value })} placeholder="Label" />
              <TextInput type="number" step="0.1" value={p.areaM2} onChange={(e) => updatePartition(p.id, { areaM2: Number(e.target.value) })} placeholder="Area m²" />
              <TextInput type="number" step="0.01" value={p.uValue} onChange={(e) => updatePartition(p.id, { uValue: Number(e.target.value) })} placeholder="U-value" />
              <Select
                value={p.adjacentRoomId ?? ''}
                onChange={(e) => {
                  const id = e.target.value || null;
                  const adjRoom = otherRooms.find((r) => r.id === id);
                  updatePartition(p.id, { adjacentRoomId: id, adjacentRoomTempC: adjRoom ? adjRoom.designTempC : p.adjacentRoomTempC });
                }}
              >
                <option value="">Enter temp manually</option>
                {otherRooms.map((r) => <option key={r.id} value={r.id}>{r.name} ({r.designTempC}°C)</option>)}
              </Select>
              {!p.adjacentRoomId && (
                <TextInput
                  type="number"
                  className="sm:col-span-5"
                  value={p.adjacentRoomTempC}
                  onChange={(e) => updatePartition(p.id, { adjacentRoomTempC: Number(e.target.value) })}
                  placeholder="Adjacent room temp °C"
                />
              )}
              <button className="text-xs text-red-600 sm:col-span-5 sm:text-left" onClick={() => removePartition(p.id)}>Remove</button>
            </div>
          ))}
          {room.partitions.length === 0 && <p className="text-xs text-slate-400">No partitions yet — a bathroom losing heat to a landing needs one.</p>}
        </div>
      </div>

      <div>
        <h4 className="mb-2 text-sm font-semibold text-slate-700">Heat loss — show the working</h4>
        <StatGrid
          items={[
            { label: 'Fabric', value: result.fabricW.toFixed(0), unit: 'W' },
            { label: 'Partitions', value: result.partitionsW.toFixed(0), unit: 'W' },
            { label: 'Ventilation', value: result.ventilationW.toFixed(0), unit: 'W' },
            { label: 'Total', value: result.totalW.toFixed(0), unit: 'W' },
            { label: 'Volume', value: volumeM3.toFixed(1), unit: 'm³' },
          ]}
        />
        <details className="mt-2 text-xs text-slate-500">
          <summary className="cursor-pointer">Per-element breakdown</summary>
          <ul className="mt-1 space-y-0.5">
            {result.fabricBreakdown.map((e, i) => (
              <li key={i}>{e.label}: {e.areaM2}m² × {e.uValue} × {e.deltaT.toFixed(1)}K × b{e.bFactor} = {e.watts.toFixed(0)}W</li>
            ))}
            {result.partitionBreakdown.map((e, i) => (
              <li key={`p${i}`}>{e.label}: {e.areaM2}m² × {e.uValue} × {e.deltaT.toFixed(1)}K = {e.watts.toFixed(0)}W</li>
            ))}
          </ul>
        </details>
      </div>

      <Button variant="danger" onClick={onDelete}>Delete room</Button>
    </Card>
  );
}
