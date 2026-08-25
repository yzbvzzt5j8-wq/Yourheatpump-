import { useEffect, useState } from 'react';
import type { MaterialRecord } from '../../types/materials';
import { listMaterials, saveMaterial } from '../../db/materials';
import { Banner, SectionHeading } from '../../components/ui';
import { CatalogueTab } from './CatalogueTab';
import { BomTab } from './BomTab';
import { KitsTab } from './KitsTab';

type Tab = 'catalogue' | 'bom' | 'kits';

export function MaterialsScreen({ jobId }: { jobId: string | null }) {
  const [tab, setTab] = useState<Tab>('catalogue');
  const [materials, setMaterials] = useState<MaterialRecord[]>([]);
  const [loading, setLoading] = useState(true);

  function refresh() {
    listMaterials().then((m) => {
      setMaterials(m);
      setLoading(false);
    });
  }
  useEffect(refresh, []);

  async function handleSaveMaterial(material: MaterialRecord) {
    setMaterials((prev) => prev.map((m) => (m.id === material.id ? material : m)));
    await saveMaterial(material);
  }

  return (
    <div className="space-y-4">
      <SectionHeading title="Materials" subtitle="Catalogue, pricing, bill of materials, kits." />

      <div className="flex gap-2 text-sm">
        {(['catalogue', 'bom', 'kits'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-full px-3 py-1 capitalize ${tab === t ? 'bg-sky-700 text-white' : 'bg-slate-100 text-slate-600'}`}
          >
            {t === 'bom' ? 'Bill of materials' : t}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-sm text-slate-500">Loading…</p>
      ) : (
        <>
          {tab === 'catalogue' && <CatalogueTab materials={materials} onSaveMaterial={handleSaveMaterial} />}
          {tab === 'bom' && (jobId ? <BomTab jobId={jobId} materials={materials} /> : <Banner tone="info">Select or create a job from Home first.</Banner>)}
          {tab === 'kits' && <KitsTab materials={materials} />}
        </>
      )}
    </div>
  );
}
