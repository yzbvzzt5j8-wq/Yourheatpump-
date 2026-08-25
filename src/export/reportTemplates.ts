import type { Job } from '../types/job';
import type { Survey } from '../types/survey';
import type { Design } from '../types/design';
import type { Circuit, HydraulicArrangement } from '../types/hydraulics';
import type { CommissioningRecord, ServiceRecord } from '../types/commissioning';
import type { CompanySettings } from '../types/settings';
import { calculateRoomHeatLoss } from '../calc/heatloss';
import { checkSizingCompliance, checkMcsScope, emitterBandFromFlowTemp } from '../calc/compliance';
import { estimateSoundPressure, MCS020_NEIGHBOUR_LIMIT_DBA } from '../calc/sound';
import { HEAT_PUMP_CATALOGUE, interpolateOutputCurve } from '../data/heatPumps';
import { ARRANGEMENTS, VALVE_ARRANGEMENT_LABELS } from '../data/arrangements';
import { evaluatePumpDuty } from '../calc/pump';
import { layoutPipeworkSketch, lineWeightForSize, type SketchRowInput } from '../features/hydraulics/pipeworkSketch';
import type { HydraulicsResult } from '../features/hydraulics/hydraulicsCalc';
import { reportShell } from './reportShell';

function badge(pass: boolean): string {
  return `<span class="badge ${pass ? 'pass' : 'fail'}">${pass ? 'PASS' : 'FAIL'}</span>`;
}

// --- 1. Design report ----------------------------------------------------

export function buildDesignReport(job: Job, survey: Survey, design: Design, company: CompanySettings): string {
  const model = HEAT_PUMP_CATALOGUE.find((m) => m.id === design.heatPump.modelId);
  const config = model?.configurations.find((c) => c.id === design.heatPump.publishedConfigurationId);

  const roomRows = survey.rooms.map((room) => {
    const volumeM3 = room.lengthM * room.widthM * room.heightM;
    const result = calculateRoomHeatLoss({
      roomTempC: room.designTempC, externalTempC: survey.externalDesignTempC,
      fabric: room.fabric, partitions: room.partitions, volumeM3,
      airChangesPerHour: room.airChangesPerHour, bridgingFraction: survey.bridgingFraction,
    });
    return { room, result };
  });
  const totalHeatLossW = roomRows.reduce((sum, r) => sum + r.result.totalW, 0);
  const outputAtDesignW = config ? interpolateOutputCurve(config.outputCurveW, survey.externalDesignTempC) * design.heatPump.unitCount : 0;
  const sizing = checkSizingCompliance({
    isHybrid: design.heatPump.isHybrid, designHeatLossW: totalHeatLossW,
    heatPumpOutputAtDesignConditionsW: outputAtDesignW,
    hybridOutputAt55FlowW: design.heatPump.isHybrid ? outputAtDesignW * 0.6 : undefined,
  });
  const scope = checkMcsScope({ unitOutputsKw: Array(design.heatPump.unitCount).fill(model?.ratedOutputKw ?? 0) });
  const emitterBand = emitterBandFromFlowTemp(design.designConditions.flowTempC);
  const sound = estimateSoundPressure({
    soundPowerLwDbA: config?.soundPowerLwDbA ?? 0, distanceM: design.sound.distanceToNeighbourM,
    mountingPosition: design.sound.mountingPosition, lineOfSightBroken: design.sound.lineOfSightBroken,
  });

  const body = `
    <h2>Design conditions</h2>
    <div class="card">
      <table><tbody>
        <tr><td>External design temperature</td><td>${survey.externalDesignTempC}&deg;C (source: ${survey.dataSources.externalTempSource})</td></tr>
        <tr><td>U-value source</td><td>${survey.dataSources.uValueSource}</td></tr>
        <tr><td>Air change rate source</td><td>${survey.dataSources.achSource}</td></tr>
        <tr><td>Design flow / return</td><td>${design.designConditions.flowTempC} / ${design.designConditions.returnTempC}&deg;C</td></tr>
        <tr><td>Thermal bridging allowance</td><td>${(survey.bridgingFraction * 100).toFixed(0)}%</td></tr>
      </tbody></table>
    </div>

    <h2>Room-by-room heat loss</h2>
    <div class="card">
      <table><thead><tr><th>Room</th><th>Floor</th><th>Fabric (W)</th><th>Partitions (W)</th><th>Ventilation (W)</th><th>Total (W)</th></tr></thead><tbody>
        ${roomRows.map(({ room, result }) => `<tr><td>${room.name}</td><td>${room.floor}</td><td>${result.fabricW.toFixed(0)}</td><td>${result.partitionsW.toFixed(0)}</td><td>${result.ventilationW.toFixed(0)}</td><td><strong>${result.totalW.toFixed(0)}</strong></td></tr>`).join('')}
        <tr><td colspan="5"><strong>Total design heat loss</strong></td><td><strong>${(totalHeatLossW / 1000).toFixed(2)} kW</strong></td></tr>
      </tbody></table>
    </div>

    <h2>Heat pump and sizing</h2>
    <div class="card">
      <table><tbody>
        <tr><td>Selected unit</td><td>${model?.manufacturer ?? '—'} ${model?.modelName ?? ''} (${config?.label ?? '—'})</td></tr>
        <tr><td>Units</td><td>${design.heatPump.unitCount}</td></tr>
        <tr><td>Sizing rule</td><td>${sizing.rule === '100%-of-load' ? '100% of design load' : 'Hybrid: ≥55% of load at 55°C flow'} ${badge(sizing.pass)}</td></tr>
        <tr><td>Required / actual output</td><td>${(sizing.requiredW / 1000).toFixed(2)} kW / ${(sizing.actualW / 1000).toFixed(2)} kW</td></tr>
        <tr><td>Scope (70kW total / 45kW per unit)</td><td>${scope.totalOutputKw.toFixed(1)} kW ${badge(scope.pass)}</td></tr>
        <tr><td>MCS 021 emitter band</td><td>Band ${emitterBand}</td></tr>
      </tbody></table>
    </div>

    <h2>Hot water</h2>
    <div class="card">
      <table><tbody>
        <tr><td>Cylinder</td><td>${design.dhw.cylinderVolumeL} L at ${design.dhw.designTempC}&deg;C</td></tr>
        <tr><td>Pasteurisation cycle</td><td>${design.dhw.pasteurisationCycleEnabled ? 'Enabled' : 'Disabled'}</td></tr>
        <tr><td>Heat exchanger spec</td><td>${design.dhw.heatExchangerSpecRef || '—'}</td></tr>
      </tbody></table>
    </div>

    <h2>Sound (design-stage estimate)</h2>
    <div class="card">
      <table><tbody>
        <tr><td>Estimated sound pressure at neighbour's window</td><td>${sound.soundPressureLpDbA.toFixed(1)} dB(A) ${badge(sound.soundPressureLpDbA <= MCS020_NEIGHBOUR_LIMIT_DBA)}</td></tr>
        <tr><td>MCS 020 design-stage limit</td><td>${MCS020_NEIGHBOUR_LIMIT_DBA} dB(A)</td></tr>
      </tbody></table>
      <p class="muted">Formal submission for MCS purposes uses the official MCS 020 calculator.</p>
    </div>
  `;
  return reportShell('Design Report', job.reference, body, company);
}

// --- 2. Hydraulic design form ---------------------------------------------

export function buildHydraulicDesignForm(
  job: Job, design: Design, arrangement: HydraulicArrangement, hydraulics: HydraulicsResult, company: CompanySettings,
): string {
  const arrangementInfo = ARRANGEMENTS.find((a) => a.topology === arrangement.topology);
  const model = HEAT_PUMP_CATALOGUE.find((m) => m.id === design.heatPump.modelId);
  const config = model?.configurations.find((c) => c.id === design.heatPump.publishedConfigurationId);

  const rows = hydraulics.flat.map((node) => {
    const h = hydraulics.byId.get(node.id);
    const isIndex = hydraulics.indexCircuit?.id === node.id;
    return `<tr>
      <td>${node.label}${isIndex ? ' <span class="badge fail">INDEX</span>' : ''}</td>
      <td>${(node.totalLoadW / 1000).toFixed(2)} kW</td>
      <td>${h?.flowLps.toFixed(3) ?? '—'} L/s</td>
      <td>${h?.effectiveSizeMm ?? '—'} mm</td>
      <td>${h?.effectiveVelocityMs.toFixed(2) ?? '—'} m/s</td>
      <td>${h?.effectivePressureDropPaPerM.toFixed(0) ?? '—'} Pa/m</td>
    </tr>`;
  }).join('');

  let pumpSection = '<p class="muted">No index circuit — add heating areas in Hydraulics.</p>';
  if (hydraulics.indexCircuit && config) {
    const indexH = hydraulics.byId.get(hydraulics.indexCircuit.id)!;
    const duty = evaluatePumpDuty({
      indexPathPressureDropPa: hydraulics.indexCircuit.cumulativePressureDropPa,
      plantPressureDropPa: 5000, emitterPressureDropPa: 3000, marginFraction: 0.1,
      designFlowLps: indexH.flowLps, pumpCurve: config.pumpCurve,
    });
    pumpSection = `<table><tbody>
      <tr><td>Required head</td><td>${duty.requiredHeadPa.toFixed(0)} Pa</td></tr>
      <tr><td>Available head at design flow</td><td>${duty.availableHeadPa.toFixed(0)} Pa</td></tr>
      <tr><td>Result</td><td>${badge(duty.pass)}</td></tr>
    </tbody></table>`;
  }

  const body = `
    <h2>Arrangement</h2>
    <div class="card">
      <table><tbody>
        <tr><td>Topology</td><td>${arrangementInfo?.label ?? arrangement.topology}</td></tr>
        <tr><td>Valve arrangement</td><td>${VALVE_ARRANGEMENT_LABELS[arrangement.valveArrangement]}</td></tr>
        <tr><td>Antifreeze</td><td>${arrangement.antifreeze.glycolType === 'none' ? 'None' : `${(arrangement.antifreeze.concentrationFraction * 100).toFixed(0)}% propylene glycol`}</td></tr>
        <tr><td>Volumiser</td><td>${arrangement.volumiser.fitted ? `Fitted, ${arrangement.volumiser.sizeL} L — ${arrangement.volumiser.reason ?? ''}` : 'Not fitted'}</td></tr>
      </tbody></table>
    </div>

    <h2>Circuit schedule</h2>
    <div class="card">
      <table><thead><tr><th>Circuit</th><th>Load</th><th>Flow</th><th>Size</th><th>Velocity</th><th>&Delta;p</th></tr></thead><tbody>${rows}</tbody></table>
    </div>

    <h2>Pump duty</h2>
    <div class="card">${pumpSection}</div>
  `;
  return reportShell('Hydraulic Design Form', job.reference, body, company);
}

// --- 3. Service record ----------------------------------------------------

export function buildServiceRecordReport(job: Job, commissioning: CommissioningRecord | null, serviceRecords: ServiceRecord[], company: CompanySettings): string {
  const checklistRows = (commissioning?.checklist ?? []).map((item) => `<tr><td>${item.checked ? '✓' : '☐'}</td><td>${item.label}</td></tr>`).join('');
  const serviceRows = serviceRecords.map((s) => `<tr><td>${s.serviceDate}</td><td>${s.engineerName}</td><td>${s.findings}</td></tr>`).join('');

  const body = `
    <h2>Commissioning</h2>
    <div class="card">
      <table><tbody>
        <tr><td>Engineer</td><td>${commissioning?.engineerName ?? '—'}</td></tr>
        <tr><td>Date completed</td><td>${commissioning?.dateCompleted ?? '—'}</td></tr>
        <tr><td>Customer briefing date</td><td>${commissioning?.handoverBriefingDate ?? '—'}</td></tr>
        <tr><td>Certificate issued</td><td>${commissioning?.certificateIssuedDate ?? '—'}</td></tr>
      </tbody></table>
    </div>
    <div class="card"><table><tbody>${checklistRows}</tbody></table></div>

    <h2>Service history</h2>
    <div class="card">
      <table><thead><tr><th>Date</th><th>Engineer</th><th>Findings</th></tr></thead><tbody>${serviceRows || '<tr><td colspan="3">No service visits recorded.</td></tr>'}</tbody></table>
    </div>
  `;
  return reportShell('Service Record', job.reference, body, company);
}

// --- 4. Pipework sketch ----------------------------------------------------

export function buildPipeworkSketchReport(job: Job, circuits: Circuit[], hydraulics: HydraulicsResult, company: CompanySettings): string {
  const leaves = hydraulics.flat.filter((n) => n.children.length === 0).sort((a, b) => b.totalLoadW - a.totalLoadW);
  const rows: SketchRowInput[] = leaves.map((node) => {
    const circuit = circuits.find((c) => c.id === node.id)!;
    const h = hydraulics.byId.get(node.id)!;
    return { id: node.id, label: node.label, pipeSizeMm: h.effectiveSizeMm, emitterType: circuit.emitterType };
  });
  const sketch = layoutPipeworkSketch(rows);

  const svg = `<svg width="${sketch.width}" height="${sketch.height}" xmlns="http://www.w3.org/2000/svg">
    <circle cx="${sketch.trunk.x1}" cy="${sketch.trunk.y1}" r="6" fill="#0369a1" />
    <text x="${sketch.trunk.x1 + 10}" y="${sketch.trunk.y1 + 4}" font-size="11" fill="#0f172a">Heat pump</text>
    <line x1="${sketch.trunk.x1}" y1="${sketch.trunk.y1}" x2="${sketch.trunk.x2}" y2="${sketch.trunk.y2}" stroke="#0369a1" stroke-width="${lineWeightForSize(sketch.trunk.sizeMm)}" />
    ${sketch.branches.map((b) => `<line x1="${b.x1}" y1="${b.y1}" x2="${b.x2}" y2="${b.y2}" stroke="#0369a1" stroke-width="${lineWeightForSize(b.sizeMm)}" />`).join('')}
    ${sketch.labels.map((l) => `<text x="${l.x}" y="${l.y + l.height - 3}" font-size="11" fill="#334155">${l.text}</text>`).join('')}
  </svg>`;

  const body = `
    <h2>Pipework sketch</h2>
    <p class="muted">Single-line drawing. Wiring, controls and condensate belong on the electrical schematic and the manufacturer's drawing.</p>
    <div class="card">${svg}</div>
  `;
  return reportShell('Pipework Sketch', job.reference, body, company);
}
