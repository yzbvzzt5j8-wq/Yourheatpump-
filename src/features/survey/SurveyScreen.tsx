import { useEffect, useState } from 'react';
import type { AchSource, ExternalTempSource, Survey, SurveyRoom, UValueSource } from '../../types/survey';
import { getSurveyForJob, saveSurvey } from '../../db/surveys';
import { getSettings } from '../../db/settings';
import { calculateRoomHeatLoss } from '../../calc/heatloss';
import { Banner, Button, Card, Field, Select, SectionHeading, TextInput } from '../../components/ui';
import { RoomEditor } from './RoomEditor';

function uid(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function blankRoom(): SurveyRoom {
  return {
    id: uid('room'), name: 'New room', roomType: 'Living Room', floor: 'Ground floor',
    designTempC: 21, lengthM: 4, widthM: 3, heightM: 2.4, airChangesPerHour: 1,
    fabric: [], partitions: [],
  };
}

export function SurveyScreen({ jobId }: { jobId: string | null }) {
  const [survey, setSurvey] = useState<Survey | null>(null);
  const [expandedRoomId, setExpandedRoomId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    if (!jobId) {
      setSurvey(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    (async () => {
      const existing = await getSurveyForJob(jobId);
      if (cancelled) return;
      if (existing) {
        setSurvey(existing);
      } else {
        const settings = await getSettings();
        const now = new Date().toISOString();
        setSurvey({
          id: uid('survey'), jobId,
          externalDesignTempC: settings.calculation.defaultExternalDesignTempC,
          bridgingFraction: settings.calculation.defaultBridgingFraction,
          dataSources: { externalTempSource: 'CIBSE-design-data', uValueSource: 'age-assumption-table', achSource: 'CIBSE-table' },
          rooms: [],
          createdAt: now, updatedAt: now,
        });
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [jobId]);

  async function persist(next: Survey) {
    const withTimestamp = { ...next, updatedAt: new Date().toISOString() };
    setSurvey(withTimestamp);
    await saveSurvey(withTimestamp);
  }

  if (!jobId) return <Banner tone="info">Select or create a job from Home first.</Banner>;
  if (loading || !survey) return <p className="text-sm text-slate-500">Loading survey…</p>;

  const totalW = survey.rooms.reduce((sum, room) => {
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
    return sum + result.totalW;
  }, 0);

  return (
    <div className="space-y-4">
      <SectionHeading title="Survey" subtitle="Room-by-room heat loss per BS EN 12831, simplified per MIS 3005." />

      <Card className="space-y-3">
        <h3 className="text-sm font-semibold text-slate-700">Design conditions</h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="External design temperature (°C)">
            <TextInput
              type="number"
              value={survey.externalDesignTempC}
              onChange={(e) => persist({ ...survey, externalDesignTempC: Number(e.target.value) })}
            />
          </Field>
          <Field label="Thermal bridging allowance (%)">
            <TextInput
              type="number"
              value={survey.bridgingFraction * 100}
              onChange={(e) => persist({ ...survey, bridgingFraction: Number(e.target.value) / 100 })}
            />
          </Field>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Field label="External temp source" hint="An assessor may ask where this came from.">
            <Select
              value={survey.dataSources.externalTempSource}
              onChange={(e) => persist({ ...survey, dataSources: { ...survey.dataSources, externalTempSource: e.target.value as ExternalTempSource } })}
            >
              <option value="CIBSE-design-data">CIBSE design data</option>
              <option value="MCS-postcode-lookup">MCS postcode lookup</option>
              <option value="manufacturer-datasheet">Manufacturer datasheet</option>
              <option value="other">Other</option>
            </Select>
          </Field>
          <Field label="U-value source">
            <Select
              value={survey.dataSources.uValueSource}
              onChange={(e) => persist({ ...survey, dataSources: { ...survey.dataSources, uValueSource: e.target.value as UValueSource } })}
            >
              <option value="as-built-drawings">As-built drawings</option>
              <option value="age-assumption-table">Age assumption table</option>
              <option value="site-survey-measured">Site survey (measured)</option>
              <option value="epc">EPC</option>
              <option value="other">Other</option>
            </Select>
          </Field>
          <Field label="Air change rate source">
            <Select
              value={survey.dataSources.achSource}
              onChange={(e) => persist({ ...survey, dataSources: { ...survey.dataSources, achSource: e.target.value as AchSource } })}
            >
              <option value="CIBSE-table">CIBSE table</option>
              <option value="age-and-construction-assumption">Age/construction assumption</option>
              <option value="measured-air-test">Measured air test</option>
              <option value="other">Other</option>
            </Select>
          </Field>
        </div>
      </Card>

      <Card>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-slate-500">Total design heat loss</div>
            <div className="text-2xl font-bold text-slate-900">{(totalW / 1000).toFixed(2)} kW</div>
          </div>
          <div className="text-right text-xs text-slate-400">{survey.rooms.length} room{survey.rooms.length === 1 ? '' : 's'}</div>
        </div>
      </Card>

      <div className="space-y-3">
        {survey.rooms.map((room) => (
          <div key={room.id}>
            <button
              onClick={() => setExpandedRoomId(expandedRoomId === room.id ? null : room.id)}
              className="flex w-full items-center justify-between rounded-md border border-slate-200 bg-white px-4 py-3 text-left"
            >
              <span className="text-sm font-medium text-slate-900">{room.name} <span className="font-normal text-slate-400">— {room.floor}</span></span>
              <span className="text-xs text-slate-400">{expandedRoomId === room.id ? 'Hide' : 'Edit'}</span>
            </button>
            {expandedRoomId === room.id && (
              <div className="mt-2">
                <RoomEditor
                  room={room}
                  otherRooms={survey.rooms.filter((r) => r.id !== room.id)}
                  externalTempC={survey.externalDesignTempC}
                  bridgingFraction={survey.bridgingFraction}
                  onChange={(next) => persist({ ...survey, rooms: survey.rooms.map((r) => (r.id === next.id ? next : r)) })}
                  onDelete={() => {
                    persist({ ...survey, rooms: survey.rooms.filter((r) => r.id !== room.id) });
                    setExpandedRoomId(null);
                  }}
                />
              </div>
            )}
          </div>
        ))}
      </div>

      <Button
        onClick={() => {
          const room = blankRoom();
          persist({ ...survey, rooms: [...survey.rooms, room] });
          setExpandedRoomId(room.id);
        }}
      >
        + Add room
      </Button>
    </div>
  );
}
