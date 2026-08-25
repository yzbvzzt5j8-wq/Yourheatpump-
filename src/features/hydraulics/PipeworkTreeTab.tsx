import type { Circuit } from '../../types/hydraulics';
import type { Design } from '../../types/design';
import type { Survey } from '../../types/survey';
import { waterProperties, glycolProperties } from '../../calc/fluids';
import { COPPER_PIPES } from '../../calc/pipes';
import { computeHydraulics } from './hydraulicsCalc';
import { CircuitTreeEditor } from './CircuitTreeEditor';
import { Banner, Card, SectionHeading, Select, TextInput } from '../../components/ui';

export function PipeworkTreeTab({
  jobId,
  design,
  glycolFraction,
  survey,
  circuits,
  onChange,
}: {
  jobId: string;
  design: Design;
  glycolFraction: number;
  survey: Survey | null;
  circuits: Circuit[];
  onChange: (circuits: Circuit[]) => void;
}) {
  const meanTempC = (design.designConditions.flowTempC + design.designConditions.returnTempC) / 2;
  const fluid = glycolFraction > 0 ? glycolProperties(glycolFraction, meanTempC) : waterProperties(meanTempC);
  const result = computeHydraulics(circuits, design.designConditions, fluid, 'velocityAnd300', survey);

  function setOverride(circuitId: string, sizeMm: number | null, reason: string) {
    onChange(circuits.map((c) => (c.id === circuitId ? { ...c, pipeSizeOverride: sizeMm ? { sizeMm, reason } : undefined } : c)));
  }

  return (
    <div className="space-y-4">
      <SectionHeading title="Pipework tree" subtitle="Each pipe is sized for everything downstream. Length changes pressure drop, not pipe size." />

      <div className="space-y-2">
        {result.flat.map((node) => {
          const h = result.byId.get(node.id);
          const circuit = circuits.find((c) => c.id === node.id);
          const isIndex = result.indexCircuit?.id === node.id;
          if (!h || !circuit) return null;
          return (
            <Card key={node.id} className={isIndex ? 'border-sky-400 bg-sky-50' : ''}>
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-900">{node.label}</span>
                {isIndex && <span className="rounded-full bg-sky-700 px-2 py-0.5 text-xs font-semibold text-white">INDEX CIRCUIT</span>}
              </div>
              <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-2 text-sm sm:grid-cols-4">
                <div><div className="text-xs text-slate-500">Load</div><div className="whitespace-nowrap font-medium">{(node.totalLoadW / 1000).toFixed(2)} kW</div></div>
                <div><div className="text-xs text-slate-500">Flow</div><div className="whitespace-nowrap font-medium">{h.flowLps.toFixed(3)} L/s</div></div>
                <div><div className="text-xs text-slate-500">Velocity</div><div className="whitespace-nowrap font-medium">{h.effectiveVelocityMs.toFixed(2)} m/s</div></div>
                <div><div className="text-xs text-slate-500">Δp</div><div className="whitespace-nowrap font-medium">{h.effectivePressureDropPaPerM.toFixed(0)} Pa/m</div></div>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
                <span className="text-xs text-slate-500">Auto size: {h.autoSize.size.nominalMm}mm</span>
                <Select
                  className="w-28"
                  value={circuit.pipeSizeOverride?.sizeMm ?? ''}
                  onChange={(e) => setOverride(node.id, e.target.value ? Number(e.target.value) : null, circuit.pipeSizeOverride?.reason ?? '')}
                >
                  <option value="">Use auto size</option>
                  {COPPER_PIPES.map((p) => <option key={p.nominalMm} value={p.nominalMm}>{p.nominalMm}mm (override)</option>)}
                </Select>
                {circuit.pipeSizeOverride && (
                  <TextInput
                    className="flex-1"
                    placeholder="Reason for override — recorded on the schedule"
                    value={circuit.pipeSizeOverride.reason}
                    onChange={(e) => setOverride(node.id, circuit.pipeSizeOverride!.sizeMm, e.target.value)}
                  />
                )}
              </div>
              {!h.autoSize.velocityOk && <p className="mt-1 text-xs text-red-600">Auto-sizing could not meet the velocity limit on any candidate pipe — check this run.</p>}
            </Card>
          );
        })}
        {result.flat.length === 0 && <Banner tone="info">No heating areas yet — add them below.</Banner>}
      </div>

      <CircuitTreeEditor jobId={jobId} survey={survey} circuits={circuits} onChange={onChange} />
    </div>
  );
}
