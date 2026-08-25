import type { Circuit, HydraulicArrangement } from '../../types/hydraulics';
import type { Design } from '../../types/design';
import type { Survey } from '../../types/survey';
import { waterProperties, glycolProperties } from '../../calc/fluids';
import { computeHydraulics } from './hydraulicsCalc';
import { layoutPipeworkSketch, lineWeightForSize, findOverlappingLabels, type SketchRowInput } from './pipeworkSketch';
import { Banner, Card, SectionHeading } from '../../components/ui';

const EMITTER_GLYPH: Record<SketchRowInput['emitterType'], string> = {
  radiator: '▭', ufh: '▤', 'towel-rail': '‖', 'fan-coil': '▢', mixed: '◫',
};

export function SketchTab({ design, arrangement, circuits, survey }: { design: Design; arrangement: HydraulicArrangement; circuits: Circuit[]; survey: Survey | null }) {
  const meanTempC = (design.designConditions.flowTempC + design.designConditions.returnTempC) / 2;
  const fluid = arrangement.antifreeze.glycolType === 'none' ? waterProperties(meanTempC) : glycolProperties(arrangement.antifreeze.concentrationFraction, meanTempC);
  const result = computeHydraulics(circuits, design.designConditions, fluid, 'velocityAnd300', survey);

  const leaves = result.flat.filter((n) => n.children.length === 0).sort((a, b) => b.totalLoadW - a.totalLoadW);

  const rows: SketchRowInput[] = leaves.map((node) => {
    const circuit = circuits.find((c) => c.id === node.id)!;
    const h = result.byId.get(node.id)!;
    const parentH = node.parentId ? result.byId.get(node.parentId) : undefined;
    const reducedFromMm = parentH && parentH.effectiveSizeMm !== h.effectiveSizeMm ? parentH.effectiveSizeMm : undefined;
    return { id: node.id, label: node.label, pipeSizeMm: h.effectiveSizeMm, reducedFromMm, emitterType: circuit.emitterType };
  });

  const sketch = layoutPipeworkSketch(rows);
  const overlaps = findOverlappingLabels(sketch.labels);

  return (
    <div className="space-y-4">
      <SectionHeading title="Pipework sketch" subtitle="Single-line drawing: one flow+return main from the heat pump, runs teeing off it. Ordered by water flow." />
      <Banner tone="info">Wiring, controls and condensate belong on the electrical schematic and the manufacturer's drawing, not here.</Banner>

      {rows.length === 0 ? (
        <Banner tone="warning">No heating areas yet — add them in the Pipework tree tab.</Banner>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <svg width={sketch.width} height={sketch.height} className="min-w-[320px]" role="img" aria-label="Single-line pipework sketch">
              <rect x={0} y={0} width={sketch.width} height={sketch.height} fill="white" />
              <circle cx={sketch.trunk.x1} cy={sketch.trunk.y1} r={6} fill="#0369a1" />
              <text x={sketch.trunk.x1 + 10} y={sketch.trunk.y1 + 4} fontSize={11} fill="#0f172a">Heat pump</text>
              <line x1={sketch.trunk.x1} y1={sketch.trunk.y1} x2={sketch.trunk.x2} y2={sketch.trunk.y2} stroke="#0369a1" strokeWidth={lineWeightForSize(sketch.trunk.sizeMm)} />
              {sketch.branches.map((b) => (
                <line key={b.id} x1={b.x1} y1={b.y1} x2={b.x2} y2={b.y2} stroke="#0369a1" strokeWidth={lineWeightForSize(b.sizeMm)} />
              ))}
              {sketch.emitters.map((e) => (
                <text key={e.id} x={e.x} y={e.y + 4} fontSize={13} textAnchor="middle">{EMITTER_GLYPH[e.type]}</text>
              ))}
              {sketch.labels.map((l) => (
                <text key={l.id} x={l.x} y={l.y + l.height - 3} fontSize={11} fill="#334155">{l.text}</text>
              ))}
            </svg>
          </div>
          <p className="mt-2 text-xs text-slate-500">
            Bands ordered plant room first, then by descending flow. Reducer labels (e.g. 28→22mm) mark size changes; line weight scales with pipe size.
          </p>
        </Card>
      )}

      {overlaps.length > 0 && (
        <Banner tone="critical">{overlaps.length} label bounding box overlap(s) detected — this sketch is not report-ready.</Banner>
      )}
    </div>
  );
}
