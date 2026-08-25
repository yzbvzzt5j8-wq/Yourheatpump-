import { describe, it, expect } from 'vitest';
import { layoutPipeworkSketch, findOverlappingLabels, lineWeightForSize, type SketchRowInput } from './pipeworkSketch';

function row(id: string, label: string, pipeSizeMm: number): SketchRowInput {
  return { id, label, pipeSizeMm, emitterType: 'radiator' };
}

describe('pipework sketch: single-line drawing', () => {
  it('draws one trunk (flow+return combined) with runs teeing off it — not a pair to every emitter', () => {
    const sketch = layoutPipeworkSketch([row('a', 'GF — Kitchen', 15), row('b', 'GF — Lounge', 22)]);
    expect(sketch.branches.length).toBe(2);
    expect(sketch.trunk).toBeDefined();
  });

  it('no label bounding box overlaps another, for 1 to 30 rows', () => {
    for (const n of [1, 2, 5, 10, 30]) {
      const rows = Array.from({ length: n }, (_, i) => row(`r${i}`, `Branch ${i} with a fairly long room name`, 15 + (i % 4) * 7));
      const sketch = layoutPipeworkSketch(rows);
      const overlaps = findOverlappingLabels(sketch.labels);
      expect(overlaps).toEqual([]);
    }
  });

  it('the overlap checker actually detects overlaps (assertion is not vacuous)', () => {
    const overlaps = findOverlappingLabels([
      { id: 'a', x: 0, y: 0, width: 50, height: 16, text: 'a' },
      { id: 'b', x: 10, y: 5, width: 50, height: 16, text: 'b' },
    ]);
    expect(overlaps.length).toBe(1);
  });

  it('a size change is labelled with a reducer, e.g. 28->22mm', () => {
    const sketch = layoutPipeworkSketch([{ id: 'a', label: 'Branch A', pipeSizeMm: 22, reducedFromMm: 28, emitterType: 'radiator' }]);
    expect(sketch.labels[0].text).toContain('28→22mm');
  });

  it('line weight scales with pipe size', () => {
    expect(lineWeightForSize(28)).toBeGreaterThan(lineWeightForSize(15));
  });
});
