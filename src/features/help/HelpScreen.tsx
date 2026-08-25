import { useMemo, useState } from 'react';
import { HELP_CONTENT, type HelpEntryType } from '../../data/helpContent';
import { Card, Field, SectionHeading, TextInput } from '../../components/ui';

const TYPE_LABEL: Record<HelpEntryType, string> = { article: 'Article', faq: 'FAQ', glossary: 'Glossary' };
const TYPE_BADGE: Record<HelpEntryType, string> = {
  article: 'bg-sky-100 text-sky-800', faq: 'bg-violet-100 text-violet-800', glossary: 'bg-emerald-100 text-emerald-800',
};

export function HelpScreen() {
  const [search, setSearch] = useState('');

  const results = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return HELP_CONTENT;
    return HELP_CONTENT.filter((e) => `${e.title} ${e.body}`.toLowerCase().includes(q));
  }, [search]);

  return (
    <div className="space-y-4">
      <SectionHeading title="Help" subtitle="Search articles, FAQs and glossary together." />
      <Field label="Search"><TextInput value={search} onChange={(e) => setSearch(e.target.value)} placeholder="e.g. glycol, index circuit, VAT" /></Field>

      <div className="space-y-2">
        {results.map((entry) => (
          <Card key={entry.id}>
            <div className="mb-1 flex items-center justify-between gap-2">
              <span className="text-sm font-semibold text-slate-900">{entry.title}</span>
              <span className={`whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-semibold ${TYPE_BADGE[entry.type]}`}>{TYPE_LABEL[entry.type]}</span>
            </div>
            <p className="text-sm text-slate-600">{entry.body}</p>
          </Card>
        ))}
        {results.length === 0 && <p className="text-sm text-slate-500">No matches for "{search}".</p>}
      </div>
    </div>
  );
}
