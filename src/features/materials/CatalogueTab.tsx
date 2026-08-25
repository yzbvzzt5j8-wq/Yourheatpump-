import { useMemo, useState } from 'react';
import type { MaterialCategory, MaterialRecord } from '../../types/materials';
import { computePriceStats, effectiveUnitPriceExVat, sellingPriceExVat, grossMarginFraction } from '../../calc/pricing';
import { PREFERRED_SUPPLIERS } from '../../types/materials';
import { isCataloguePriceStale } from '../../data/materials';
import { Banner, Card, Field, Select, TextInput } from '../../components/ui';

const CATEGORIES: MaterialCategory[] = [
  'pipework', 'fittings', 'insulation', 'valves', 'filters', 'flexibles', 'freeze-protection',
  'cylinder', 'radiators', 'pumps', 'electrical', 'chemicals', 'mounting', 'condensate', 'sundries', 'main-equipment', 'other',
];

const STATUS_BADGE: Record<MaterialRecord['status'], string> = {
  verified: 'bg-emerald-100 text-emerald-800',
  provisional: 'bg-amber-100 text-amber-800',
  outdated: 'bg-red-100 text-red-800',
  'supplier-quote-required': 'bg-slate-200 text-slate-700',
};

export function CatalogueTab({ materials, onSaveMaterial }: { materials: MaterialRecord[]; onSaveMaterial: (m: MaterialRecord) => void }) {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<MaterialCategory | ''>('');
  const today = new Date().toISOString();

  const filtered = useMemo(() => {
    return materials.filter((m) => {
      if (category && m.category !== category) return false;
      if (search && !`${m.productName} ${m.manufacturer}`.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [materials, search, category]);

  return (
    <div className="space-y-4">
      <Banner tone="warning">
        Material prices are estimating figures only and must be checked against current supplier quotations before the customer quotation is issued.
      </Banner>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Search"><TextInput value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Product or manufacturer" /></Field>
        <Field label="Category">
          <Select value={category} onChange={(e) => setCategory(e.target.value as MaterialCategory | '')}>
            <option value="">All categories</option>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </Select>
        </Field>
      </div>

      <div className="space-y-2">
        {filtered.map((material) => {
          const stats = computePriceStats(material.supplierPrices, PREFERRED_SUPPLIERS);
          const effective = effectiveUnitPriceExVat({ manualPriceExVat: material.manualPriceExVat, priceStats: stats });
          const selling = sellingPriceExVat(effective, material.defaultMarkupFraction);
          const margin = grossMarginFraction(effective, selling);
          const stale = isCataloguePriceStale(material.dateChecked, today);

          return (
            <Card key={material.id}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-sm font-semibold text-slate-900">{material.productName}</div>
                  <div className="text-xs text-slate-500">{material.manufacturer} · {material.size ?? '—'}</div>
                </div>
                <span className={`whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_BADGE[material.status]}`}>{material.status}</span>
              </div>

              {material.status === 'supplier-quote-required' ? (
                <p className="mt-2 text-sm text-amber-700">Main equipment — never averaged. Select a model and get a supplier quote before pricing this line.</p>
              ) : (
                <>
                  <div className="mt-2 grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
                    <div><div className="text-xs text-slate-500">Low / High</div><div className="whitespace-nowrap">£{stats.low.toFixed(2)} / £{stats.high.toFixed(2)}</div></div>
                    <div><div className="text-xs text-slate-500">Median (recommended)</div><div className="whitespace-nowrap font-semibold">£{stats.median.toFixed(2)}</div></div>
                    <div><div className="text-xs text-slate-500">Selling (ex VAT)</div><div className="whitespace-nowrap">£{selling.toFixed(2)}</div></div>
                    <div><div className="text-xs text-slate-500">Margin</div><div className="whitespace-nowrap">{(margin * 100).toFixed(1)}%</div></div>
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <label className="text-xs text-slate-500">Manual trade price (£)</label>
                    <TextInput
                      type="number" className="w-28"
                      value={material.manualPriceExVat ?? ''}
                      placeholder={stats.median.toFixed(2)}
                      onChange={(e) => onSaveMaterial({ ...material, manualPriceExVat: e.target.value === '' ? null : Number(e.target.value) })}
                    />
                    {material.manualPriceExVat != null && <span className="text-xs text-sky-700">Overriding median — never auto-cleared by a price refresh</span>}
                  </div>
                </>
              )}
              {stale && <p className="mt-1 text-xs text-red-600">Price checked over 90 days ago ({material.dateChecked}) — verify before quoting.</p>}
              {material.notes && <p className="mt-1 text-xs text-slate-400">{material.notes}</p>}
            </Card>
          );
        })}
        {filtered.length === 0 && <p className="text-sm text-slate-500">No materials match.</p>}
      </div>
    </div>
  );
}
