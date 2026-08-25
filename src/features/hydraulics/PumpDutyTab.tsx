import { useState } from 'react';
import type { Circuit, HydraulicArrangement } from '../../types/hydraulics';
import type { Design } from '../../types/design';
import type { Survey } from '../../types/survey';
import { waterProperties, glycolProperties } from '../../calc/fluids';
import { evaluatePumpDuty } from '../../calc/pump';
import { HEAT_PUMP_CATALOGUE } from '../../data/heatPumps';
import { computeHydraulics } from './hydraulicsCalc';
import { Banner, Card, Field, SectionHeading, StatGrid, TextInput } from '../../components/ui';

export function PumpDutyTab({ design, arrangement, circuits, survey }: { design: Design; arrangement: HydraulicArrangement; circuits: Circuit[]; survey: Survey | null }) {
  const [plantPressureDropPa, setPlantPressureDropPa] = useState(5000);
  const [emitterPressureDropPa, setEmitterPressureDropPa] = useState(3000);
  const [marginPercent, setMarginPercent] = useState(10);

  const model = HEAT_PUMP_CATALOGUE.find((m) => m.id === design.heatPump.modelId);
  const config = model?.configurations.find((c) => c.id === design.heatPump.publishedConfigurationId);
  const meanTempC = (design.designConditions.flowTempC + design.designConditions.returnTempC) / 2;
  const fluid = arrangement.antifreeze.glycolType === 'none' ? waterProperties(meanTempC) : glycolProperties(arrangement.antifreeze.concentrationFraction, meanTempC);

  const result = computeHydraulics(circuits, design.designConditions, fluid, 'velocityAnd300', survey);
  const index = result.indexCircuit;
  const indexHydraulics = index ? result.byId.get(index.id) : undefined;

  if (!index || !indexHydraulics || !config) {
    return <Banner tone="info">Add heating areas in the Pipework tree tab first.</Banner>;
  }

  const duty = evaluatePumpDuty({
    indexPathPressureDropPa: index.cumulativePressureDropPa,
    plantPressureDropPa,
    emitterPressureDropPa,
    marginFraction: marginPercent / 100,
    designFlowLps: indexHydraulics.flowLps,
    pumpCurve: config.pumpCurve,
  });

  return (
    <div className="space-y-4">
      <SectionHeading title="Pump duty" subtitle="Does the circulator deliver design flow through the index circuit? Head, not Pa/m, is the real test." />

      <Card>
        <h3 className="mb-2 text-sm font-semibold text-slate-700">Index circuit</h3>
        <p className="text-sm text-slate-600">{index.label} — highest total path resistance to the heat pump, not the longest or largest.</p>
        <StatGrid items={[
          { label: 'Design flow', value: indexHydraulics.flowLps.toFixed(3), unit: 'L/s' },
          { label: 'Pipe path Δp', value: index.cumulativePressureDropPa.toFixed(0), unit: 'Pa' },
        ]} />
      </Card>

      <Card className="space-y-3">
        <h3 className="text-sm font-semibold text-slate-700">Allowances</h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Field label="Plant (heat pump HX etc.) Δp (Pa)"><TextInput type="number" value={plantPressureDropPa} onChange={(e) => setPlantPressureDropPa(Number(e.target.value))} /></Field>
          <Field label="Emitter/TRV Δp (Pa)"><TextInput type="number" value={emitterPressureDropPa} onChange={(e) => setEmitterPressureDropPa(Number(e.target.value))} /></Field>
          <Field label="Safety margin (%)"><TextInput type="number" value={marginPercent} onChange={(e) => setMarginPercent(Number(e.target.value))} /></Field>
        </div>
      </Card>

      <Card>
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-700">Result</h3>
          <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${duty.pass ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>{duty.pass ? 'PASS' : 'FAIL'}</span>
        </div>
        <StatGrid items={[
          { label: 'Required head', value: duty.requiredHeadPa.toFixed(0), unit: 'Pa' },
          { label: 'Available head', value: duty.availableHeadPa.toFixed(0), unit: 'Pa' },
          { label: 'Margin', value: duty.marginPa.toFixed(0), unit: 'Pa' },
        ]} />
        {!duty.pass && <Banner tone="critical">The circulator cannot deliver design flow through the index circuit — reduce resistance (larger pipe, shorter route, remove a restriction) or fit a secondary pump.</Banner>}
      </Card>
    </div>
  );
}
