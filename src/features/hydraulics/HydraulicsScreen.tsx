import { useEffect, useState } from 'react';
import type { Design } from '../../types/design';
import type { Circuit, HydraulicArrangement } from '../../types/hydraulics';
import type { Survey } from '../../types/survey';
import { getDesignForJob, getArrangementForJob, getCircuitsForJob, saveArrangement, saveCircuits } from '../../db/designs';
import { getSurveyForJob } from '../../db/surveys';
import { Banner, SectionHeading } from '../../components/ui';
import { ArrangementTab } from './ArrangementTab';
import { PipeworkTreeTab } from './PipeworkTreeTab';
import { PumpDutyTab } from './PumpDutyTab';
import { SketchTab } from './SketchTab';

type Tab = 'arrangement' | 'pipework' | 'sketch' | 'pump';
const TABS: { key: Tab; label: string }[] = [
  { key: 'arrangement', label: 'Arrangement' },
  { key: 'pipework', label: 'Pipework tree' },
  { key: 'sketch', label: 'Sketch' },
  { key: 'pump', label: 'Pump duty' },
];

export function HydraulicsScreen({ jobId }: { jobId: string | null }) {
  const [tab, setTab] = useState<Tab>('arrangement');
  const [design, setDesign] = useState<Design | null>(null);
  const [arrangement, setArrangement] = useState<HydraulicArrangement | null>(null);
  const [circuits, setCircuits] = useState<Circuit[]>([]);
  const [survey, setSurvey] = useState<Survey | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!jobId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    Promise.all([getDesignForJob(jobId), getArrangementForJob(jobId), getCircuitsForJob(jobId), getSurveyForJob(jobId)]).then(
      ([d, a, c, s]) => {
        setDesign(d ?? null);
        setArrangement(a ?? null);
        setCircuits(c);
        setSurvey(s ?? null);
        setLoading(false);
      },
    );
  }, [jobId]);

  async function persistArrangement(next: HydraulicArrangement) {
    setArrangement(next);
    await saveArrangement(next);
  }

  async function persistCircuits(next: Circuit[]) {
    setCircuits(next);
    if (jobId) await saveCircuits(jobId, next);
  }

  if (!jobId) return <Banner tone="info">Select or create a job from Home first.</Banner>;
  if (loading) return <p className="text-sm text-slate-500">Loading…</p>;
  if (!design || !arrangement) return <Banner tone="info">Complete guided setup in Design first.</Banner>;

  return (
    <div className="space-y-4">
      <SectionHeading title="Hydraulics" />
      <div className="flex flex-wrap gap-2 text-sm">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`rounded-full px-3 py-1 ${tab === t.key ? 'bg-sky-700 text-white' : 'bg-slate-100 text-slate-600'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'arrangement' && (
        <ArrangementTab design={design} arrangement={arrangement} circuits={circuits} survey={survey} onSaveArrangement={persistArrangement} />
      )}
      {tab === 'pipework' && (
        <PipeworkTreeTab jobId={jobId} design={design} glycolFraction={arrangement.antifreeze.concentrationFraction} survey={survey} circuits={circuits} onChange={persistCircuits} />
      )}
      {tab === 'sketch' && <SketchTab design={design} arrangement={arrangement} circuits={circuits} survey={survey} />}
      {tab === 'pump' && <PumpDutyTab design={design} arrangement={arrangement} circuits={circuits} survey={survey} />}
    </div>
  );
}
