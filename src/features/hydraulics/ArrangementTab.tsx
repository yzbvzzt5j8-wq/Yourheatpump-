import type { Circuit, HydraulicArrangement } from '../../types/hydraulics';
import type { Design } from '../../types/design';
import type { Survey } from '../../types/survey';
import { computeSystemVolume } from '../../calc/volume';
import { HEAT_PUMP_CATALOGUE } from '../../data/heatPumps';
import { ARRANGEMENTS, VALVE_ARRANGEMENT_LABELS } from '../../data/arrangements';
import { computeHydraulics, deriveVolumeAreas } from './hydraulicsCalc';
import { waterProperties, glycolProperties } from '../../calc/fluids';
import { buildArrangementSchematic, checkContinuous } from './arrangementSchematic';
import { Banner, Card, SectionHeading, StatGrid, TextInput } from '../../components/ui';

const NODE_SPACING_X = 150;
const NODE_Y_FLOW = 30;
const NODE_Y_RETURN = 70;
const NODE_WIDTH = 130;

function ArrangementSchematicSvg({ schematic }: { schematic: ReturnType<typeof buildArrangementSchematic> }) {
  const trunkNodeIds = schematic.edges.filter((e) => e.kind === 'flow-return').flatMap((e) => [e.from, e.to]);
  const orderedIds = [...new Set(trunkNodeIds)];
  const xById = new Map(orderedIds.map((id, i) => [id, 40 + i * NODE_SPACING_X]));
  const width = 40 + orderedIds.length * NODE_SPACING_X + 40;

  return (
    <div className="overflow-x-auto">
      <svg width={width} height={140} className="min-w-[320px]">
        {orderedIds.slice(0, -1).map((id, i) => {
          const x1 = (xById.get(id) ?? 0) + NODE_WIDTH / 2;
          const x2 = (xById.get(orderedIds[i + 1]) ?? 0) + NODE_WIDTH / 2;
          return (
            <g key={id}>
              <line x1={x1} y1={NODE_Y_FLOW} x2={x2} y2={NODE_Y_FLOW} stroke="#0369a1" strokeWidth={2} />
              <line x1={x1} y1={NODE_Y_RETURN} x2={x2} y2={NODE_Y_RETURN} stroke="#94a3b8" strokeWidth={2} strokeDasharray="4 2" />
            </g>
          );
        })}
        {orderedIds.map((id) => {
          const node = schematic.nodes.find((n) => n.id === id)!;
          const x = xById.get(id) ?? 0;
          return (
            <g key={id}>
              <rect x={x} y={NODE_Y_FLOW - 12} width={NODE_WIDTH} height={64} rx={6} fill="white" stroke="#0369a1" />
              <text x={x + NODE_WIDTH / 2} y={NODE_Y_FLOW + 24} fontSize={10} textAnchor="middle" fill="#0f172a">
                {node.label.length > 20 ? node.label.slice(0, 18) + '…' : node.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export function ArrangementTab({
  design,
  arrangement,
  circuits,
  survey,
  onSaveArrangement,
}: {
  design: Design;
  arrangement: HydraulicArrangement;
  circuits: Circuit[];
  survey: Survey | null;
  onSaveArrangement: (next: HydraulicArrangement) => void;
}) {
  const model = HEAT_PUMP_CATALOGUE.find((m) => m.id === design.heatPump.modelId);
  const config = model?.configurations.find((c) => c.id === design.heatPump.publishedConfigurationId);
  const arrangementInfo = ARRANGEMENTS.find((a) => a.topology === arrangement.topology);

  const fluid = arrangement.antifreeze.glycolType === 'none'
    ? waterProperties((design.designConditions.flowTempC + design.designConditions.returnTempC) / 2)
    : glycolProperties(arrangement.antifreeze.concentrationFraction, (design.designConditions.flowTempC + design.designConditions.returnTempC) / 2);

  const hydraulics = computeHydraulics(circuits, design.designConditions, fluid, 'velocityAnd300', survey);
  const volumeAreas = deriveVolumeAreas(circuits, hydraulics);
  const manufacturerMinimumOpenVolumeL = config?.minOpenVolumeL ?? 0;
  const volumeResult = computeSystemVolume({
    areas: volumeAreas,
    existingVolumiserL: arrangement.volumiser.fitted ? arrangement.volumiser.sizeL ?? undefined : undefined,
    manufacturerMinimumOpenVolumeL,
  });

  const schematic = buildArrangementSchematic(arrangement.topology, arrangement.valveArrangement, arrangement.bivalent);
  const continuity = checkContinuous(schematic);

  function updateVolumiser(sizeL: number | null, reason: string) {
    onSaveArrangement({ ...arrangement, volumiser: { fitted: sizeL != null, sizeL, reason }, updatedAt: new Date().toISOString() });
  }

  return (
    <div className="space-y-4">
      <SectionHeading title="Arrangement" subtitle="Unit configuration, volumiser verdict, valves, topology, separation and bivalent — one screen, one source of truth." />

      <Card>
        <h3 className="mb-2 text-sm font-semibold text-slate-700">Unit and topology</h3>
        <StatGrid items={[
          { label: 'Unit', value: `${model?.manufacturer ?? '—'} ${model?.modelName ?? ''}` },
          { label: 'Configuration', value: config?.label ?? '—' },
          { label: 'Topology', value: arrangementInfo?.label ?? arrangement.topology },
          { label: 'Valves', value: VALVE_ARRANGEMENT_LABELS[arrangement.valveArrangement] },
        ]} />
        <p className="mt-2 text-xs text-slate-500">{arrangementInfo?.description}</p>
        {arrangement.valveArrangement === 'y-plan' && <Banner tone="warning">Y-plan flagged as not ideal — mid-position dilutes the cylinder.</Banner>}
      </Card>

      <Card>
        <h3 className="mb-2 text-sm font-semibold text-slate-700">Volumiser verdict</h3>
        <StatGrid items={[
          { label: 'Open volume (areas)', value: volumeResult.openVolumeExcludingVolumiserL.toFixed(1), unit: 'L' },
          { label: 'Manufacturer minimum', value: manufacturerMinimumOpenVolumeL.toFixed(0), unit: 'L' },
          { label: 'Shortfall', value: volumeResult.shortfallL.toFixed(1), unit: 'L' },
          { label: 'Total system volume', value: volumeResult.totalVolumeL.toFixed(1), unit: 'L' },
        ]} />
        {volumeResult.volumiserNeeded ? (
          <Banner tone="warning">
            {volumeResult.shortfallL.toFixed(0)} L short against the {manufacturerMinimumOpenVolumeL} L minimum. Try the free fixes first —
            removing a TRV so an area becomes always-open, fitting an automatic bypass, or upsizing a run — before adding a volumiser.
            Recommended standard size: <strong>{volumeResult.recommendedVolumiserL} L</strong>.
          </Banner>
        ) : (
          <Banner tone="info">Open volume already meets the manufacturer minimum — no volumiser required.</Banner>
        )}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={arrangement.volumiser.fitted}
              onChange={(e) => updateVolumiser(e.target.checked ? (volumeResult.recommendedVolumiserL ?? 25) : null, arrangement.volumiser.reason ?? '')}
            />
            Fit a volumiser
          </label>
          {arrangement.volumiser.fitted && (
            <>
              <TextInput
                type="number"
                className="w-24"
                value={arrangement.volumiser.sizeL ?? 0}
                onChange={(e) => updateVolumiser(Number(e.target.value), arrangement.volumiser.reason ?? '')}
              />
              <span className="text-xs text-slate-500">L</span>
              <TextInput
                className="flex-1"
                placeholder="Reason (never auto-added)"
                value={arrangement.volumiser.reason ?? ''}
                onChange={(e) => updateVolumiser(arrangement.volumiser.sizeL, e.target.value)}
              />
            </>
          )}
        </div>
      </Card>

      {arrangement.bivalent && (
        <Card>
          <h3 className="mb-2 text-sm font-semibold text-slate-700">Bivalent</h3>
          <StatGrid items={[
            { label: 'Boiler type', value: arrangement.bivalent.boilerType },
            { label: 'Boiler max flow temp', value: String(arrangement.bivalent.boilerMaxFlowTempC), unit: '°C' },
            { label: 'Serves DHW', value: arrangement.bivalent.boilerServesDhw ? 'Yes (legionella cycle)' : 'No' },
          ]} />
          <p className="mt-2 text-xs text-slate-500">NRV on the boiler flow. Heat-only boiler pump on the return.</p>
        </Card>
      )}

      <Card>
        <h3 className="mb-1 text-sm font-semibold text-slate-700">Separation advice</h3>
        <p className="text-sm text-slate-600">
          DHW is taken off the primary, upstream of any separation — downstream of a buffer the cylinder gets diluted water and reheat suffers badly.
          {arrangementInfo?.hasSeparation && ` This topology requires ${arrangementInfo.separationConnections} connection(s)${arrangementInfo.requiresSecondaryPump ? ' and a secondary pump' : ''}.`}
        </p>
      </Card>

      <Card>
        <h3 className="mb-2 text-sm font-semibold text-slate-700">Schematic</h3>
        <p className="mb-2 text-xs text-slate-500">Flow (solid) and return (dashed) drawn as a pair. Wiring, controls and condensate belong on the electrical schematic and the manufacturer's drawing.</p>
        <ArrangementSchematicSvg schematic={schematic} />
        {!continuity.continuous && (
          <Banner tone="critical">Schematic does not trace continuously — disconnected: {continuity.unreachable.join(', ')}</Banner>
        )}
        <ul className="mt-2 space-y-0.5 text-xs text-slate-500">
          {schematic.safetyComponents.map((c) => <li key={c.id}>• {c.label}</li>)}
        </ul>
      </Card>
    </div>
  );
}
