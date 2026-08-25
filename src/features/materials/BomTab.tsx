import { useEffect, useState } from 'react';
import type { BomLine, MaterialRecord } from '../../types/materials';
import type { Design } from '../../types/design';
import type { Circuit, HydraulicArrangement } from '../../types/hydraulics';
import type { Survey } from '../../types/survey';
import { getDesignForJob, getArrangementForJob, getCircuitsForJob } from '../../db/designs';
import { getSurveyForJob } from '../../db/surveys';
import { getBomLinesForJob, saveBomLinesForJob } from '../../db/materials';
import { computeHydraulics } from '../hydraulics/hydraulicsCalc';
import { deriveVolumeAreas } from '../hydraulics/hydraulicsCalc';
import { computeSystemVolume } from '../../calc/volume';
import { waterProperties, glycolProperties } from '../../calc/fluids';
import { HEAT_PUMP_CATALOGUE } from '../../data/heatPumps';
import { effectiveUnitPriceExVat, computePriceStats } from '../../calc/pricing';
import { PREFERRED_SUPPLIERS } from '../../types/materials';
import { generateBom } from './bomGenerator';
import { Banner, Button, Card } from '../../components/ui';

export function BomTab({ jobId, materials }: { jobId: string; materials: MaterialRecord[] }) {
  const [design, setDesign] = useState<Design | null>(null);
  const [arrangement, setArrangement] = useState<HydraulicArrangement | null>(null);
  const [circuits, setCircuits] = useState<Circuit[]>([]);
  const [survey, setSurvey] = useState<Survey | null>(null);
  const [lines, setLines] = useState<BomLine[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([getDesignForJob(jobId), getArrangementForJob(jobId), getCircuitsForJob(jobId), getSurveyForJob(jobId), getBomLinesForJob(jobId)]).then(
      ([d, a, c, s, existingLines]) => {
        setDesign(d ?? null);
        setArrangement(a ?? null);
        setCircuits(c);
        setSurvey(s ?? null);
        setLines(existingLines);
        setLoading(false);
      },
    );
  }, [jobId]);

  if (loading) return <p className="text-sm text-slate-500">Loading…</p>;
  if (!design || !arrangement) return <Banner tone="info">Complete guided setup in Design, then add heating areas in Hydraulics, before generating a bill of materials.</Banner>;

  const meanTempC = (design.designConditions.flowTempC + design.designConditions.returnTempC) / 2;
  const fluid = arrangement.antifreeze.glycolType === 'none' ? waterProperties(meanTempC) : glycolProperties(arrangement.antifreeze.concentrationFraction, meanTempC);
  const hydraulics = computeHydraulics(circuits, design.designConditions, fluid, 'velocityAnd300', survey);
  const config = HEAT_PUMP_CATALOGUE.find((m) => m.id === design.heatPump.modelId)?.configurations.find((c) => c.id === design.heatPump.publishedConfigurationId);
  const volumeAreas = deriveVolumeAreas(circuits, hydraulics);
  const volumeResult = computeSystemVolume({
    areas: volumeAreas,
    existingVolumiserL: arrangement.volumiser.fitted ? arrangement.volumiser.sizeL ?? undefined : undefined,
    manufacturerMinimumOpenVolumeL: config?.minOpenVolumeL ?? 0,
  });

  async function regenerate() {
    const result = generateBom({ jobId, circuits, hydraulics, arrangement: arrangement!, design: design!, volumeResult, catalogue: materials });
    setLines(result.lines);
    setWarnings(result.warnings);
    await saveBomLinesForJob(jobId, result.lines);
  }

  async function toggleConfirmed(lineId: string) {
    const next = lines.map((l) => (l.id === lineId ? { ...l, engineerConfirmed: !l.engineerConfirmed } : l));
    setLines(next);
    await saveBomLinesForJob(jobId, next);
  }

  const confirmedTotal = lines
    .filter((l) => l.engineerConfirmed)
    .reduce((sum, l) => {
      const material = materials.find((m) => m.id === l.materialId);
      if (!material) return sum;
      const stats = computePriceStats(material.supplierPrices, PREFERRED_SUPPLIERS);
      const price = effectiveUnitPriceExVat({ manualPriceExVat: material.manualPriceExVat, priceStats: stats });
      return sum + price * l.quantity;
    }, 0);

  return (
    <div className="space-y-4">
      <Button onClick={regenerate}>{lines.length > 0 ? 'Regenerate' : 'Generate'} bill of materials</Button>

      {warnings.length > 0 && (
        <Banner tone="warning">
          <ul className="list-disc space-y-0.5 pl-4">{warnings.map((w, i) => <li key={i}>{w}</li>)}</ul>
        </Banner>
      )}

      <div className="space-y-2">
        {lines.map((line) => {
          const material = materials.find((m) => m.id === line.materialId);
          return (
            <Card key={line.id}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-sm font-semibold text-slate-900">{material?.productName ?? line.materialId}</div>
                  <div className="text-xs text-slate-500">Qty {line.quantity} · waste {(line.wastePercent * 100).toFixed(0)}%</div>
                </div>
                <label className="flex items-center gap-1 whitespace-nowrap text-xs text-slate-600">
                  <input type="checkbox" checked={line.engineerConfirmed} onChange={() => toggleConfirmed(line.id)} />
                  Confirmed
                </label>
              </div>
              <p className="mt-1 text-xs text-slate-500">{line.reason}</p>
            </Card>
          );
        })}
        {lines.length === 0 && <Banner tone="info">No bill of materials generated yet.</Banner>}
      </div>

      {lines.length > 0 && (
        <Card>
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-500">Confirmed lines total (ex VAT)</span>
            <span className="text-lg font-bold text-slate-900">£{confirmedTotal.toFixed(2)}</span>
          </div>
          <p className="mt-1 text-xs text-slate-400">Only confirmed lines count toward the quotation. Main equipment quote-required items are excluded until priced.</p>
        </Card>
      )}
    </div>
  );
}
