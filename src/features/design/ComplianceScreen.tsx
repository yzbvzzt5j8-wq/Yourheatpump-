import { useEffect, useState } from 'react';
import type { Survey } from '../../types/survey';
import type { Design } from '../../types/design';
import { calculateRoomHeatLoss } from '../../calc/heatloss';
import { checkSizingCompliance, checkMcsScope, emitterBandFromFlowTemp } from '../../calc/compliance';
import { HEAT_PUMP_CATALOGUE, interpolateOutputCurve } from '../../data/heatPumps';
import { getSurveyForJob } from '../../db/surveys';
import { getDesignForJob } from '../../db/designs';
import { Banner, Card, SectionHeading, StatGrid } from '../../components/ui';

function PassFail({ pass }: { pass: boolean }) {
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${pass ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
      {pass ? 'PASS' : 'FAIL'}
    </span>
  );
}

export function ComplianceScreen({ jobId }: { jobId: string }) {
  const [survey, setSurvey] = useState<Survey | null>(null);
  const [design, setDesign] = useState<Design | null>(null);

  useEffect(() => {
    getSurveyForJob(jobId).then((s) => setSurvey(s ?? null));
    getDesignForJob(jobId).then((d) => setDesign(d ?? null));
  }, [jobId]);

  if (!design) return <Banner tone="info">Complete guided setup first.</Banner>;
  if (!survey) return <Banner tone="warning">No survey found — heat loss figures cannot be checked.</Banner>;

  const totalHeatLossW = survey.rooms.reduce((sum, room) => {
    const volumeM3 = room.lengthM * room.widthM * room.heightM;
    return sum + calculateRoomHeatLoss({
      roomTempC: room.designTempC, externalTempC: survey.externalDesignTempC,
      fabric: room.fabric, partitions: room.partitions, volumeM3,
      airChangesPerHour: room.airChangesPerHour, bridgingFraction: survey.bridgingFraction,
    }).totalW;
  }, 0);

  const model = HEAT_PUMP_CATALOGUE.find((m) => m.id === design.heatPump.modelId);
  const config = model?.configurations.find((c) => c.id === design.heatPump.publishedConfigurationId);
  const outputAtDesignW = config ? interpolateOutputCurve(config.outputCurveW, survey.externalDesignTempC) * design.heatPump.unitCount : 0;
  const outputAt55W = outputAtDesignW * 0.6; // placeholder ratio pending a real 55C-flow output curve per model

  const sizing = checkSizingCompliance({
    isHybrid: design.heatPump.isHybrid,
    designHeatLossW: totalHeatLossW,
    heatPumpOutputAtDesignConditionsW: outputAtDesignW,
    hybridOutputAt55FlowW: design.heatPump.isHybrid ? outputAt55W : undefined,
  });

  const scope = checkMcsScope({ unitOutputsKw: Array(design.heatPump.unitCount).fill(model?.ratedOutputKw ?? 0) });
  const emitterBand = emitterBandFromFlowTemp(design.designConditions.flowTempC);

  const dhwOk = design.dhw.designTempC >= 55;

  return (
    <div className="space-y-4">
      <SectionHeading title="MCS compliance" subtitle="Checks against the live design — pass/fail with the actual figures. Not a certification." />
      <Banner tone="warning">This is a design aid, not MCS-certified documentation. Certified paperwork, the official MCS 020 sound assessment and MCS database registration happen outside this application.</Banner>

      <Card>
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-700">Sizing — {sizing.rule === '100%-of-load' ? '100% of load' : 'Hybrid: ≥55% of load at 55°C flow'}</h3>
          <PassFail pass={sizing.pass} />
        </div>
        <StatGrid items={[
          { label: 'Design heat loss', value: (totalHeatLossW / 1000).toFixed(2), unit: 'kW' },
          { label: 'Required', value: (sizing.requiredW / 1000).toFixed(2), unit: 'kW' },
          { label: 'Heat pump output', value: (sizing.actualW / 1000).toFixed(2), unit: 'kW' },
          { label: '% of load met', value: (sizing.percentageOfLoadMet * 100).toFixed(0), unit: '%' },
        ]} />
      </Card>

      <Card>
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-700">Scope — 70 kW total / 45 kW per unit</h3>
          <PassFail pass={scope.pass} />
        </div>
        <StatGrid items={[
          { label: 'Total output', value: scope.totalOutputKw.toFixed(1), unit: 'kW' },
          { label: 'Units', value: String(design.heatPump.unitCount) },
        ]} />
        {!scope.perUnitOk && <p className="mt-2 text-xs text-red-700">Unit(s) exceeding 45 kW: {scope.failingUnitIndices.map((i) => i + 1).join(', ')}</p>}
      </Card>

      <Card>
        <h3 className="mb-2 text-sm font-semibold text-slate-700">MCS 021 emitter band</h3>
        <p className="text-sm text-slate-600">Design flow {design.designConditions.flowTempC}°C → Band <strong>{emitterBand}</strong></p>
        <p className="mt-1 text-xs text-slate-500">MIS 3005 requires the installer to explain flow temperature vs efficiency to the customer.</p>
      </Card>

      <Card>
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-700">DHW</h3>
          <PassFail pass={dhwOk} />
        </div>
        <StatGrid items={[
          { label: 'Design temperature', value: String(design.dhw.designTempC), unit: '°C (≥55 required)' },
          { label: 'Pasteurisation cycle', value: design.dhw.pasteurisationCycleEnabled ? 'Enabled' : 'Disabled' },
        ]} />
      </Card>

      <Card>
        <h3 className="mb-2 text-sm font-semibold text-slate-700">Design data sources</h3>
        <ul className="space-y-1 text-sm text-slate-600">
          <li>External temperature: {survey.dataSources.externalTempSource}</li>
          <li>U-values: {survey.dataSources.uValueSource}</li>
          <li>Air change rates: {survey.dataSources.achSource}</li>
        </ul>
      </Card>

      <Card>
        <h3 className="mb-1 text-sm font-semibold text-slate-700">Also required (not checked here)</h3>
        <p className="text-xs text-slate-500">F-Gas registration for split systems, G3 unvented certification, DNO notification, building control, BS 7593 flushing, handover pack (cl. 7.1.1), customer briefing (cl. 7.2.1), certificate within 10 working days.</p>
      </Card>
    </div>
  );
}
