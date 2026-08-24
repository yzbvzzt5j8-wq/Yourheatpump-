import { useEffect, useState } from 'react';
import type { Design } from '../../types/design';
import type { MountingPosition } from '../../calc/sound';
import { estimateSoundPressure, MCS020_NEIGHBOUR_LIMIT_DBA } from '../../calc/sound';
import { HEAT_PUMP_CATALOGUE } from '../../data/heatPumps';
import { getDesignForJob, saveDesign } from '../../db/designs';
import { Banner, Card, CheckboxField, Field, Select, SectionHeading, StatGrid, TextInput } from '../../components/ui';

export function SoundScreen({ jobId }: { jobId: string }) {
  const [design, setDesign] = useState<Design | null>(null);

  useEffect(() => {
    getDesignForJob(jobId).then((d) => setDesign(d ?? null));
  }, [jobId]);

  if (!design) return <Banner tone="info">Complete guided setup first.</Banner>;

  const model = HEAT_PUMP_CATALOGUE.find((m) => m.id === design.heatPump.modelId);
  const config = model?.configurations.find((c) => c.id === design.heatPump.publishedConfigurationId);
  const soundPowerLwDbA = config?.soundPowerLwDbA ?? 0;

  async function persist(next: Design) {
    setDesign(next);
    await saveDesign({ ...next, updatedAt: new Date().toISOString() });
  }

  const result = estimateSoundPressure({
    soundPowerLwDbA,
    distanceM: design.sound.distanceToNeighbourM,
    mountingPosition: design.sound.mountingPosition,
    lineOfSightBroken: design.sound.lineOfSightBroken,
  });
  const pass = result.soundPressureLpDbA <= MCS020_NEIGHBOUR_LIMIT_DBA;

  return (
    <div className="space-y-4">
      <SectionHeading title="Sound" subtitle="Design-stage estimate from sound power (Lw), never sound pressure." />
      <Banner tone="warning">Formal submission for MCS purposes must use the official MCS 020 calculator — this is an early-warning estimate only.</Banner>

      <Card className="space-y-3">
        <Field label="Mounting position">
          <Select
            value={design.sound.mountingPosition}
            onChange={(e) => persist({ ...design, sound: { ...design.sound, mountingPosition: e.target.value as MountingPosition } })}
          >
            <option value="free">Free-standing, away from walls</option>
            <option value="wall">Against one wall</option>
            <option value="corner">In a corner (two walls)</option>
          </Select>
        </Field>
        <Field label="Distance to neighbour's nearest habitable window (m)">
          <TextInput
            type="number"
            value={design.sound.distanceToNeighbourM}
            onChange={(e) => persist({ ...design, sound: { ...design.sound, distanceToNeighbourM: Number(e.target.value) } })}
          />
        </Field>
        <CheckboxField
          label="Line of sight to that window is genuinely broken by a solid barrier"
          checked={design.sound.lineOfSightBroken}
          onChange={(e) => persist({ ...design, sound: { ...design.sound, lineOfSightBroken: e.target.checked } })}
        />
      </Card>

      <Card>
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-700">Estimated sound pressure at the window</h3>
          <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${pass ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>{pass ? 'PASS' : 'FAIL'}</span>
        </div>
        <StatGrid items={[
          { label: 'Sound power (unit)', value: soundPowerLwDbA.toFixed(0), unit: 'dB(A) Lw' },
          { label: 'Estimated pressure', value: result.soundPressureLpDbA.toFixed(1), unit: 'dB(A) Lp' },
          { label: 'MCS 020 limit', value: String(MCS020_NEIGHBOUR_LIMIT_DBA), unit: 'dB(A)' },
          { label: 'Directivity Q', value: String(result.directivityQ) },
          { label: 'Barrier correction', value: result.barrierCorrectionAppliedDb.toFixed(0), unit: 'dB' },
        ]} />
      </Card>
    </div>
  );
}
