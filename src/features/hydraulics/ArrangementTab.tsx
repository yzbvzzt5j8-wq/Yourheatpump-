import type { Circuit, HydraulicArrangement } from '../../types/hydraulics';
import type { Design } from '../../types/design';
import type { Survey } from '../../types/survey';
import { computeSystemVolume } from '../../calc/volume';
import { HEAT_PUMP_CATALOGUE } from '../../data/heatPumps';
import { ARRANGEMENTS, VALVE_ARRANGEMENT_LABELS } from '../../data/arrangements';
import { computeHydraulics, deriveVolumeAreas } from './hydraulicsCalc';
import { waterProperties, glycolProperties } from '../../calc/fluids';
import { Banner, Card, SectionHeading, StatGrid, TextInput } from '../../components/ui';

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
    </div>
  );
}
