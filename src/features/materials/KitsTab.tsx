import { useState } from 'react';
import type { MaterialRecord } from '../../types/materials';
import { KITS } from '../../data/kits';
import { Card, SectionHeading } from '../../components/ui';

export function KitsTab({ materials }: { materials: MaterialRecord[] }) {
  const [removed, setRemoved] = useState<Set<string>>(new Set());

  function toggle(key: string) {
    setRemoved((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  return (
    <div className="space-y-4">
      <SectionHeading title="Kits" subtitle="Eight starting kits. Remove manufacturer-supplied items that don't apply to this job." />
      {KITS.map((kit) => (
        <Card key={kit.id}>
          <h3 className="mb-2 text-sm font-semibold text-slate-900">{kit.name}</h3>
          <ul className="space-y-1">
            {kit.lines.map((line) => {
              const material = materials.find((m) => m.id === line.materialId);
              const key = `${kit.id}-${line.materialId}`;
              const isRemoved = removed.has(key);
              return (
                <li key={key} className={`flex items-center justify-between gap-2 text-sm ${isRemoved ? 'text-slate-300 line-through' : 'text-slate-700'}`}>
                  <span>{material?.productName ?? line.materialId} <span className="text-xs text-slate-400">x{line.quantity}</span></span>
                  {line.manufacturerSupplied && (
                    <button className="whitespace-nowrap text-xs text-sky-700" onClick={() => toggle(key)}>
                      {isRemoved ? 'Restore' : 'Remove'}
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        </Card>
      ))}
    </div>
  );
}
