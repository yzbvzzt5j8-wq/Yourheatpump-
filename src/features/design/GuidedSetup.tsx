import { useEffect, useState } from 'react';
import type { Survey } from '../../types/survey';
import type { Design, DhwDesign, HeatPumpSelection, SoundAssessment } from '../../types/design';
import type { AntifreezeSettings, BivalentSettings, Circuit, HydraulicArrangement, HydraulicTopology, ValveArrangement, VolumiserSettings } from '../../types/hydraulics';
import { HEAT_PUMP_CATALOGUE } from '../../data/heatPumps';
import { ARRANGEMENTS, VALVE_ARRANGEMENT_LABELS } from '../../data/arrangements';
import { interpolateOutputCurve } from '../../data/heatPumps';
import { getSurveyForJob } from '../../db/surveys';
import { saveDesign, saveArrangement, saveCircuits } from '../../db/designs';
import { getSettings } from '../../db/settings';
import { Banner, Button, Card, CheckboxField, Field, Select, TextInput } from '../../components/ui';
import { CircuitTreeEditor } from '../hydraulics/CircuitTreeEditor';

function uid(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

const STEPS = ['Heat pump', 'Primary', 'Hot water', 'Separation', 'Heating areas'] as const;

export function GuidedSetup({
  jobId,
  onComplete,
  initialDesign,
  initialArrangement,
  initialCircuits,
}: {
  jobId: string;
  onComplete: () => void;
  initialDesign?: Design;
  initialArrangement?: HydraulicArrangement;
  initialCircuits?: Circuit[];
}) {
  const [step, setStep] = useState(0);
  const [survey, setSurvey] = useState<Survey | null>(null);

  const [modelId, setModelId] = useState(HEAT_PUMP_CATALOGUE[0].id);
  const [configId, setConfigId] = useState(HEAT_PUMP_CATALOGUE[0].configurations[0].id);
  const [unitCount, setUnitCount] = useState(1);
  const [isHybrid, setIsHybrid] = useState(false);
  const [supplementaryHeaterKw, setSupplementaryHeaterKw] = useState(0);

  const [flowTempC, setFlowTempC] = useState(45);
  const [returnTempC, setReturnTempC] = useState(40);
  const [glycolType, setGlycolType] = useState<AntifreezeSettings['glycolType']>('propylene-glycol');
  const [concentrationFraction, setConcentrationFraction] = useState(0.25);

  const [cylinderVolumeL, setCylinderVolumeL] = useState(210);
  const [dhwDesignTempC, setDhwDesignTempC] = useState(55);
  const [pasteurisationCycleEnabled, setPasteurisationCycleEnabled] = useState(true);
  const [heatExchangerSpecRef, setHeatExchangerSpecRef] = useState('');
  const [diverterValveType, setDiverterValveType] = useState<DhwDesign['diverterValveType']>('3-port');

  const [topology, setTopology] = useState<HydraulicTopology>('direct');
  const [valveArrangement, setValveArrangement] = useState<ValveArrangement>('s-plan');
  const [volumiserFitted, setVolumiserFitted] = useState(false);
  const [volumiserReason, setVolumiserReason] = useState('');
  const [bivalentBoilerType, setBivalentBoilerType] = useState<BivalentSettings['boilerType']>('system');
  const [bivalentBoilerServesDhw, setBivalentBoilerServesDhw] = useState(false);

  const [circuits, setCircuits] = useState<Circuit[]>([]);

  useEffect(() => {
    getSurveyForJob(jobId).then((s) => setSurvey(s ?? null));
    if (!initialDesign) {
      getSettings().then((s) => {
        setConcentrationFraction(s.calculation.defaultAntifreezeConcentrationFraction);
        setDhwDesignTempC(s.project.dhwDesignTempC);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobId]);

  useEffect(() => {
    if (!initialDesign) return;
    setModelId(initialDesign.heatPump.modelId);
    setConfigId(initialDesign.heatPump.publishedConfigurationId);
    setUnitCount(initialDesign.heatPump.unitCount);
    setIsHybrid(initialDesign.heatPump.isHybrid);
    setSupplementaryHeaterKw(initialDesign.heatPump.supplementaryHeaterKw ?? 0);
    setFlowTempC(initialDesign.designConditions.flowTempC);
    setReturnTempC(initialDesign.designConditions.returnTempC);
    setCylinderVolumeL(initialDesign.dhw.cylinderVolumeL);
    setDhwDesignTempC(initialDesign.dhw.designTempC);
    setPasteurisationCycleEnabled(initialDesign.dhw.pasteurisationCycleEnabled);
    setHeatExchangerSpecRef(initialDesign.dhw.heatExchangerSpecRef);
    setDiverterValveType(initialDesign.dhw.diverterValveType);
  }, [initialDesign]);

  useEffect(() => {
    if (!initialArrangement) return;
    setTopology(initialArrangement.topology);
    setValveArrangement(initialArrangement.valveArrangement);
    setGlycolType(initialArrangement.antifreeze.glycolType);
    setConcentrationFraction(initialArrangement.antifreeze.concentrationFraction);
    setVolumiserFitted(initialArrangement.volumiser.fitted);
    setVolumiserReason(initialArrangement.volumiser.reason ?? '');
    if (initialArrangement.bivalent) {
      setBivalentBoilerType(initialArrangement.bivalent.boilerType);
      setBivalentBoilerServesDhw(initialArrangement.bivalent.boilerServesDhw);
    }
  }, [initialArrangement]);

  useEffect(() => {
    if (initialCircuits) setCircuits(initialCircuits);
  }, [initialCircuits]);

  const model = HEAT_PUMP_CATALOGUE.find((m) => m.id === modelId)!;
  const config = model.configurations.find((c) => c.id === configId) ?? model.configurations[0];
  const bivalent = topology.startsWith('bivalent');
  const hasSeparation = ARRANGEMENTS.find((a) => a.topology === topology)?.hasSeparation ?? false;

  async function finish() {
    const now = new Date().toISOString();
    const heatPump: HeatPumpSelection = {
      modelId, publishedConfigurationId: config.id,
      outputAtDesignConditionsW: interpolateOutputCurve(config.outputCurveW, -3), // placeholder external temp until survey supplies one
      isHybrid, hybridOutputAt55FlowW: isHybrid ? interpolateOutputCurve(config.outputCurveW, -3) * 0.6 : undefined,
      supplementaryHeaterKw: supplementaryHeaterKw || undefined, unitCount,
    };
    const dhw: DhwDesign = { cylinderVolumeL, designTempC: dhwDesignTempC, pasteurisationCycleEnabled, heatExchangerSpecRef, diverterValveType };
    const sound: SoundAssessment = { mountingPosition: 'free', distanceToNeighbourM: 3, lineOfSightBroken: false };
    const design: Design = {
      id: initialDesign?.id ?? uid('design'), jobId, surveyId: survey?.id ?? '',
      designConditions: { flowTempC, returnTempC }, heatPump, dhw,
      sound: initialDesign?.sound ?? sound,
      createdAt: initialDesign?.createdAt ?? now, updatedAt: now,
    };

    const antifreeze: AntifreezeSettings = { glycolType, concentrationFraction: glycolType === 'none' ? 0 : concentrationFraction };
    const volumiser: VolumiserSettings = { fitted: volumiserFitted, sizeL: initialArrangement?.volumiser.sizeL ?? null, reason: volumiserFitted ? volumiserReason : undefined };
    const arrangement: HydraulicArrangement = {
      id: initialArrangement?.id ?? uid('arr'), jobId, designId: design.id, topology, valveArrangement, antifreeze, volumiser,
      bivalent: bivalent ? { boilerType: bivalentBoilerType, boilerMaxFlowTempC: bivalentBoilerServesDhw ? 65 : 50, boilerServesDhw: bivalentBoilerServesDhw, switchoverTempC: 0 } : undefined,
      createdAt: initialArrangement?.createdAt ?? now, updatedAt: now,
    };

    await saveDesign(design);
    await saveArrangement(arrangement);
    await saveCircuits(jobId, circuits);
    onComplete();
  }

  const routeSoFar: string[] = [
    `Heat pump: ${model.manufacturer} ${model.modelName} (${config.label})${isHybrid ? ' — hybrid' : ''}`,
    `Primary: ${flowTempC}/${returnTempC}°C${glycolType === 'none' ? '' : `, ${(concentrationFraction * 100).toFixed(0)}% glycol`}`,
    `Hot water: ${cylinderVolumeL} L cylinder at ${dhwDesignTempC}°C${pasteurisationCycleEnabled ? ', pasteurisation on' : ''}`,
    `Separation: ${ARRANGEMENTS.find((a) => a.topology === topology)?.label}, ${VALVE_ARRANGEMENT_LABELS[valveArrangement]}`,
    `Heating areas: ${circuits.length} added`,
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 text-xs">
        {STEPS.map((s, i) => (
          <span key={s} className={`rounded-full px-2 py-1 ${i === step ? 'bg-sky-700 text-white' : i < step ? 'bg-sky-100 text-sky-800' : 'bg-slate-100 text-slate-500'}`}>
            {i + 1}. {s}
          </span>
        ))}
      </div>

      <Card className="bg-slate-50">
        <h4 className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Route so far</h4>
        <ul className="space-y-0.5 text-xs text-slate-600">
          {routeSoFar.slice(0, step + 1).map((line, i) => <li key={i}>• {line}</li>)}
        </ul>
      </Card>

      {step === 0 && (
        <Card className="space-y-3">
          <Banner tone="warning">Heat pump catalogue entries are illustrative example data — replace with verified manufacturer datasheet figures before designing a real system.</Banner>
          <Field label="Model">
            <Select value={modelId} onChange={(e) => { setModelId(e.target.value); const m = HEAT_PUMP_CATALOGUE.find((mm) => mm.id === e.target.value)!; setConfigId(m.configurations[0].id); }}>
              {HEAT_PUMP_CATALOGUE.map((m) => <option key={m.id} value={m.id}>{m.manufacturer} — {m.modelName}</option>)}
            </Select>
          </Field>
          <Field label="Published configuration">
            <Select value={configId} onChange={(e) => setConfigId(e.target.value)}>
              {model.configurations.map((c) => <option key={c.id} value={c.id}>{c.label} — {c.soundPowerLwDbA} dB(A) Lw</option>)}
            </Select>
          </Field>
          <Field label="Number of units">
            <TextInput type="number" min={1} value={unitCount} onChange={(e) => setUnitCount(Number(e.target.value))} />
          </Field>
          <CheckboxField label="Hybrid installation (heat pump + boiler)" checked={isHybrid} onChange={(e) => setIsHybrid(e.target.checked)} />
          {isHybrid && (
            <Banner tone="info">Hybrids are sized to the MIS 3005-D 2025 rule: the heat pump must meet ≥55% of load at 55°C flow — the 100% rule does not apply.</Banner>
          )}
        </Card>
      )}

      {step === 1 && (
        <Card className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Design flow temperature (°C)"><TextInput type="number" value={flowTempC} onChange={(e) => setFlowTempC(Number(e.target.value))} /></Field>
            <Field label="Design return temperature (°C)"><TextInput type="number" value={returnTempC} onChange={(e) => setReturnTempC(Number(e.target.value))} /></Field>
          </div>
          <Field label="Antifreeze">
            <Select value={glycolType} onChange={(e) => setGlycolType(e.target.value as AntifreezeSettings['glycolType'])}>
              <option value="propylene-glycol">Propylene glycol</option>
              <option value="none">None</option>
            </Select>
          </Field>
          {glycolType !== 'none' && (
            <Field label="Concentration (%)" hint="Calculated from system volume elsewhere — this sets the design basis, not a fixed dose.">
              <TextInput type="number" value={concentrationFraction * 100} onChange={(e) => setConcentrationFraction(Number(e.target.value) / 100)} />
            </Field>
          )}
          <Banner tone="info">Length does not change pipe size — flow rate does. Length changes total pressure drop and pump head.</Banner>
        </Card>
      )}

      {step === 2 && (
        <Card className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Cylinder volume (L)"><TextInput type="number" value={cylinderVolumeL} onChange={(e) => setCylinderVolumeL(Number(e.target.value))} /></Field>
            <Field label="DHW design temperature (°C)"><TextInput type="number" value={dhwDesignTempC} onChange={(e) => setDhwDesignTempC(Number(e.target.value))} /></Field>
          </div>
          <CheckboxField label="Pasteurisation cycle enabled" checked={pasteurisationCycleEnabled} onChange={(e) => setPasteurisationCycleEnabled(e.target.checked)} />
          <Field label="Heat exchanger spec reference"><TextInput value={heatExchangerSpecRef} onChange={(e) => setHeatExchangerSpecRef(e.target.value)} placeholder="Per manufacturer specification, cl. 4.2.4" /></Field>
          <Field label="Diverter valve">
            <Select value={diverterValveType} onChange={(e) => setDiverterValveType(e.target.value as DhwDesign['diverterValveType'])}>
              <option value="3-port">3-port diverter</option>
              <option value="none">None</option>
            </Select>
          </Field>
        </Card>
      )}

      {step === 3 && (
        <Card className="space-y-3">
          <Field label="Hydraulic topology">
            <Select value={topology} onChange={(e) => setTopology(e.target.value as HydraulicTopology)}>
              {ARRANGEMENTS.map((a) => <option key={a.topology} value={a.topology}>{a.label}</option>)}
            </Select>
          </Field>
          <p className="text-xs text-slate-500">{ARRANGEMENTS.find((a) => a.topology === topology)?.description}</p>
          <Field label="Valve arrangement">
            <Select value={valveArrangement} onChange={(e) => setValveArrangement(e.target.value as ValveArrangement)}>
              {Object.entries(VALVE_ARRANGEMENT_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </Select>
          </Field>
          {!hasSeparation && (
            <>
              <CheckboxField label="Fit a volumiser" checked={volumiserFitted} onChange={(e) => setVolumiserFitted(e.target.checked)} />
              {volumiserFitted && (
                <Field label="Reason" hint="Never auto-added — record why (e.g. open volume shortfall against manufacturer minimum).">
                  <TextInput value={volumiserReason} onChange={(e) => setVolumiserReason(e.target.value)} />
                </Field>
              )}
            </>
          )}
          {bivalent && (
            <div className="space-y-2 rounded-md bg-amber-50 p-2">
              <Field label="Boiler type">
                <Select value={bivalentBoilerType} onChange={(e) => setBivalentBoilerType(e.target.value as BivalentSettings['boilerType'])}>
                  <option value="combi">Combi</option>
                  <option value="system">System</option>
                  <option value="regular">Regular</option>
                </Select>
              </Field>
              <CheckboxField label="Boiler also serves DHW (legionella cycle — limited to 65°C, else 50°C)" checked={bivalentBoilerServesDhw} onChange={(e) => setBivalentBoilerServesDhw(e.target.checked)} />
            </div>
          )}
        </Card>
      )}

      {step === 4 && (
        <CircuitTreeEditor jobId={jobId} survey={survey} circuits={circuits} onChange={setCircuits} />
      )}

      <div className="flex justify-between">
        <Button variant="secondary" disabled={step === 0} onClick={() => setStep((s) => Math.max(0, s - 1))}>Back</Button>
        {step < STEPS.length - 1 ? (
          <Button onClick={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))}>Next</Button>
        ) : (
          <Button onClick={finish}>Finish setup</Button>
        )}
      </div>
    </div>
  );
}
