import { Banner, Card, SectionHeading } from '../../components/ui';

export function DesignScreen({ jobId }: { jobId: string | null }) {
  if (!jobId) return <Banner tone="info">Select or create a job from Home first.</Banner>;
  return (
    <div className="space-y-4">
      <SectionHeading title="Design" subtitle="Guided setup, heat pump selection, MCS compliance, sound." />
      <Card><p className="text-sm text-slate-500">Design screen under construction.</p></Card>
    </div>
  );
}
