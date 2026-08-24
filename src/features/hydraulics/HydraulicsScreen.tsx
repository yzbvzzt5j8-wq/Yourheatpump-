import { Banner, Card, SectionHeading } from '../../components/ui';

export function HydraulicsScreen({ jobId }: { jobId: string | null }) {
  if (!jobId) return <Banner tone="info">Select or create a job from Home first.</Banner>;
  return (
    <div className="space-y-4">
      <SectionHeading title="Hydraulics" subtitle="Arrangement, pipework tree, sketch, pump duty." />
      <Card><p className="text-sm text-slate-500">Hydraulics screen under construction.</p></Card>
    </div>
  );
}
