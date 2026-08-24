import { Banner, Card, SectionHeading } from '../../components/ui';

export function CommissioningScreen({ jobId }: { jobId: string | null }) {
  if (!jobId) return <Banner tone="info">Select or create a job from Home first.</Banner>;
  return (
    <div className="space-y-4">
      <SectionHeading title="Commissioning" subtitle="Checklist, handover pack, service records." />
      <Card><p className="text-sm text-slate-500">Commissioning screen under construction.</p></Card>
    </div>
  );
}
