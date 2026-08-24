import { useEffect, useState } from 'react';
import type { Design } from '../../types/design';
import type { Circuit, HydraulicArrangement } from '../../types/hydraulics';
import { getDesignForJob, getArrangementForJob, getCircuitsForJob } from '../../db/designs';
import { HEAT_PUMP_CATALOGUE } from '../../data/heatPumps';
import { ARRANGEMENTS, VALVE_ARRANGEMENT_LABELS } from '../../data/arrangements';
import { Banner, Button, Card, SectionHeading, StatGrid } from '../../components/ui';
import { GuidedSetup } from './GuidedSetup';
import { ComplianceScreen } from './ComplianceScreen';
import { SoundScreen } from './SoundScreen';

type Tab = 'summary' | 'compliance' | 'sound';

export function DesignScreen({ jobId }: { jobId: string | null }) {
  const [design, setDesign] = useState<Design | null>(null);
  const [arrangement, setArrangement] = useState<HydraulicArrangement | null>(null);
  const [circuits, setCircuits] = useState<Circuit[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [tab, setTab] = useState<Tab>('summary');

  async function refresh(id: string) {
    setLoading(true);
    const [d, a, c] = await Promise.all([getDesignForJob(id), getArrangementForJob(id), getCircuitsForJob(id)]);
    setDesign(d ?? null);
    setArrangement(a ?? null);
    setCircuits(c);
    setLoading(false);
  }

  useEffect(() => {
    if (jobId) refresh(jobId);
    else setLoading(false);
  }, [jobId]);

  if (!jobId) return <Banner tone="info">Select or create a job from Home first.</Banner>;
  if (loading) return <p className="text-sm text-slate-500">Loading…</p>;

  if (!design || editing) {
    return (
      <div className="space-y-4">
        <SectionHeading title="Guided setup" subtitle="Heat pump → primary → hot water → separation → heating areas." />
        <GuidedSetup
          jobId={jobId}
          initialDesign={design ?? undefined}
          initialArrangement={arrangement ?? undefined}
          initialCircuits={circuits}
          onComplete={() => {
            setEditing(false);
            refresh(jobId);
          }}
        />
      </div>
    );
  }

  const model = HEAT_PUMP_CATALOGUE.find((m) => m.id === design.heatPump.modelId);
  const config = model?.configurations.find((c) => c.id === design.heatPump.publishedConfigurationId);
  const arrangementInfo = arrangement ? ARRANGEMENTS.find((a) => a.topology === arrangement.topology) : undefined;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <SectionHeading title="Design" />
        <Button variant="secondary" onClick={() => setEditing(true)}>Edit setup</Button>
      </div>

      <div className="flex gap-2 text-sm">
        {(['summary', 'compliance', 'sound'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-full px-3 py-1 capitalize ${tab === t ? 'bg-sky-700 text-white' : 'bg-slate-100 text-slate-600'}`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'summary' && (
        <div className="space-y-4">
          <Card>
            <h3 className="mb-2 text-sm font-semibold text-slate-700">Heat pump</h3>
            <StatGrid items={[
              { label: 'Model', value: `${model?.manufacturer ?? '—'} ${model?.modelName ?? ''}` },
              { label: 'Configuration', value: config?.label ?? '—' },
              { label: 'Units', value: String(design.heatPump.unitCount) },
              { label: 'Hybrid', value: design.heatPump.isHybrid ? 'Yes' : 'No' },
              { label: 'Design flow/return', value: `${design.designConditions.flowTempC}/${design.designConditions.returnTempC}`, unit: '°C' },
            ]} />
          </Card>
          <Card>
            <h3 className="mb-2 text-sm font-semibold text-slate-700">Hot water</h3>
            <StatGrid items={[
              { label: 'Cylinder', value: String(design.dhw.cylinderVolumeL), unit: 'L' },
              { label: 'Design temp', value: String(design.dhw.designTempC), unit: '°C' },
              { label: 'Pasteurisation', value: design.dhw.pasteurisationCycleEnabled ? 'On' : 'Off' },
              { label: 'Diverter', value: design.dhw.diverterValveType },
            ]} />
          </Card>
          {arrangement && (
            <Card>
              <h3 className="mb-2 text-sm font-semibold text-slate-700">Separation</h3>
              <StatGrid items={[
                { label: 'Topology', value: arrangementInfo?.label ?? arrangement.topology },
                { label: 'Valves', value: VALVE_ARRANGEMENT_LABELS[arrangement.valveArrangement] },
                { label: 'Antifreeze', value: arrangement.antifreeze.glycolType === 'none' ? 'None' : `${(arrangement.antifreeze.concentrationFraction * 100).toFixed(0)}% propylene glycol` },
                { label: 'Volumiser', value: arrangement.volumiser.fitted ? 'Fitted' : 'Not fitted' },
              ]} />
            </Card>
          )}
          <Card>
            <h3 className="mb-2 text-sm font-semibold text-slate-700">Heating areas</h3>
            <p className="text-sm text-slate-600">{circuits.length} area(s) — edit the full circuit tree in Hydraulics.</p>
          </Card>
        </div>
      )}

      {tab === 'compliance' && <ComplianceScreen jobId={jobId} />}
      {tab === 'sound' && <SoundScreen jobId={jobId} />}
    </div>
  );
}
