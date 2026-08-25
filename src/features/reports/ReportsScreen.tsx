import { useEffect, useState } from 'react';
import type { Job } from '../../types/job';
import type { Survey } from '../../types/survey';
import type { Design } from '../../types/design';
import type { Circuit, HydraulicArrangement } from '../../types/hydraulics';
import type { CommissioningRecord, ServiceRecord } from '../../types/commissioning';
import { getJob } from '../../db/jobs';
import { getSurveyForJob } from '../../db/surveys';
import { getDesignForJob, getArrangementForJob, getCircuitsForJob } from '../../db/designs';
import { getCommissioningForJob, getServiceRecordsForJob } from '../../db/commissioning';
import { getSettings } from '../../db/settings';
import { waterProperties, glycolProperties } from '../../calc/fluids';
import { computeHydraulics } from '../hydraulics/hydraulicsCalc';
import { buildDesignReport, buildHydraulicDesignForm, buildServiceRecordReport, buildPipeworkSketchReport } from '../../export/reportTemplates';
import { exportReport, type ExportResult } from '../../export/exportChain';
import { Banner, Button, Card, SectionHeading } from '../../components/ui';

type DocKey = 'design' | 'hydraulic' | 'service' | 'sketch';
const DOCS: { key: DocKey; label: string }[] = [
  { key: 'design', label: 'Design report' },
  { key: 'hydraulic', label: 'Hydraulic design form' },
  { key: 'sketch', label: 'Pipework sketch' },
  { key: 'service', label: 'Service record' },
];

export function ReportsScreen({ jobId }: { jobId: string | null }) {
  const [job, setJob] = useState<Job | null>(null);
  const [survey, setSurvey] = useState<Survey | null>(null);
  const [design, setDesign] = useState<Design | null>(null);
  const [arrangement, setArrangement] = useState<HydraulicArrangement | null>(null);
  const [circuits, setCircuits] = useState<Circuit[]>([]);
  const [commissioning, setCommissioning] = useState<CommissioningRecord | null>(null);
  const [serviceRecords, setServiceRecords] = useState<ServiceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<DocKey>('design');
  const [html, setHtml] = useState<string>('');
  const [exportResult, setExportResult] = useState<ExportResult | null>(null);

  useEffect(() => {
    if (!jobId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    Promise.all([
      getJob(jobId), getSurveyForJob(jobId), getDesignForJob(jobId), getArrangementForJob(jobId),
      getCircuitsForJob(jobId), getCommissioningForJob(jobId), getServiceRecordsForJob(jobId),
    ]).then(([j, s, d, a, c, com, sr]) => {
      setJob(j ?? null);
      setSurvey(s ?? null);
      setDesign(d ?? null);
      setArrangement(a ?? null);
      setCircuits(c);
      setCommissioning(com ?? null);
      setServiceRecords(sr);
      setLoading(false);
    });
  }, [jobId]);

  useEffect(() => {
    if (!job) return;
    (async () => {
      const settings = await getSettings();
      const company = settings.company;

      if (selected === 'design' && survey && design) {
        setHtml(buildDesignReport(job, survey, design, company));
      } else if (selected === 'hydraulic' && design && arrangement) {
        const meanTempC = (design.designConditions.flowTempC + design.designConditions.returnTempC) / 2;
        const fluid = arrangement.antifreeze.glycolType === 'none' ? waterProperties(meanTempC) : glycolProperties(arrangement.antifreeze.concentrationFraction, meanTempC);
        const hydraulics = computeHydraulics(circuits, design.designConditions, fluid, 'velocityAnd300', survey);
        setHtml(buildHydraulicDesignForm(job, design, arrangement, hydraulics, company));
      } else if (selected === 'sketch' && design && arrangement) {
        const meanTempC = (design.designConditions.flowTempC + design.designConditions.returnTempC) / 2;
        const fluid = arrangement.antifreeze.glycolType === 'none' ? waterProperties(meanTempC) : glycolProperties(arrangement.antifreeze.concentrationFraction, meanTempC);
        const hydraulics = computeHydraulics(circuits, design.designConditions, fluid, 'velocityAnd300', survey);
        setHtml(buildPipeworkSketchReport(job, circuits, hydraulics, company));
      } else if (selected === 'service') {
        setHtml(buildServiceRecordReport(job, commissioning, serviceRecords, company));
      } else {
        setHtml('');
      }
    })();
  }, [selected, job, survey, design, arrangement, circuits, commissioning, serviceRecords]);

  if (!jobId) return <Banner tone="info">Select or create a job from Home first.</Banner>;
  if (loading || !job) return <p className="text-sm text-slate-500">Loading…</p>;

  async function handleExport() {
    if (!html || !job) return;
    const filename = `${job.reference}-${selected}.html`;
    const result = await exportReport(filename, html);
    setExportResult(result);
  }

  return (
    <div className="space-y-4">
      <SectionHeading title="Reports" subtitle="Design report, hydraulic design form, pipework sketch, service record." />

      <div className="flex flex-wrap gap-2 text-sm">
        {DOCS.map((d) => (
          <button key={d.key} onClick={() => { setSelected(d.key); setExportResult(null); }} className={`rounded-full px-3 py-1 ${selected === d.key ? 'bg-sky-700 text-white' : 'bg-slate-100 text-slate-600'}`}>
            {d.label}
          </button>
        ))}
      </div>

      {!html ? (
        <Banner tone="info">This document needs more data first — complete the relevant section (Survey/Design/Hydraulics/Commissioning).</Banner>
      ) : (
        <>
          <Button onClick={handleExport}>Export document</Button>

          {exportResult && (
            <Banner tone={exportResult.success ? 'info' : exportResult.method === 'fallback' ? 'warning' : 'info'}>
              {exportResult.success && `Exported via ${exportResult.method}.`}
              {!exportResult.success && exportResult.error === 'cancelled' && 'Share was cancelled.'}
              {!exportResult.success && exportResult.error !== 'cancelled' && (
                <>
                  Automatic export did not work in this browser. Use your browser's Print function on the preview below, or copy the HTML from it directly.
                </>
              )}
            </Banner>
          )}

          <Card>
            <div className="overflow-x-auto">
              <iframe title="Report preview" srcDoc={html} className="h-[60vh] w-full min-w-[320px] border-0" />
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
