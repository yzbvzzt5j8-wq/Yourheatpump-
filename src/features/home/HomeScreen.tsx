import { useEffect, useState } from 'react';
import { listJobs, saveJob } from '../../db/jobs';
import type { Job } from '../../types/job';
import { Button, Card, SectionHeading } from '../../components/ui';
import { NAV_ITEMS } from '../../components/AppShell';

function newJobId(): string {
  return `job-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function HomeScreen({
  currentJob,
  onSelectJob,
  onNavigate,
}: {
  currentJob: Job | null;
  onSelectJob: (jobId: string) => void;
  onNavigate: (key: string) => void;
}) {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [creating, setCreating] = useState(false);

  const refresh = () => listJobs().then(setJobs);
  useEffect(() => {
    refresh();
  }, []);

  async function handleNewSurvey() {
    setCreating(true);
    const id = newJobId();
    const now = new Date().toISOString();
    const job: Job = {
      id,
      reference: `JOB-${jobs.length + 1}`.padStart(7, '0'),
      name: 'New job',
      customer: { name: '', addressLine1: '', city: '', postcode: '' },
      status: 'survey',
      createdAt: now,
      updatedAt: now,
    };
    await saveJob(job);
    setCreating(false);
    onSelectJob(id);
    onNavigate('survey');
  }

  const tiles = NAV_ITEMS.filter((i) => i.key !== 'home' && i.key !== 'settings' && i.key !== 'help');

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-center gap-2 py-6 text-center">
        <span className="text-4xl" aria-hidden>♨</span>
        <h1 className="text-2xl font-bold text-slate-900">YourHeatPump</h1>
        <p className="max-w-md text-sm text-slate-500">
          Heat pump design for MCS-certified heating engineers. A design aid only — not MCS-certified documentation.
        </p>
      </div>

      <Card>
        <SectionHeading title="Current job" />
        {currentJob ? (
          <div className="flex items-center justify-between gap-2">
            <div>
              <div className="font-medium text-slate-900">{currentJob.name || currentJob.reference}</div>
              <div className="text-sm text-slate-500">{currentJob.customer.name || 'No customer name yet'} · {currentJob.status}</div>
            </div>
            <Button variant="secondary" onClick={() => onNavigate('survey')}>Continue</Button>
          </div>
        ) : (
          <p className="text-sm text-slate-500">No job selected. Start a new survey or pick a saved job below.</p>
        )}
      </Card>

      <Button onClick={handleNewSurvey} disabled={creating} className="w-full sm:w-auto">
        + New survey
      </Button>

      <Card>
        <SectionHeading title="Saved jobs" />
        {jobs.length === 0 && <p className="text-sm text-slate-500">No jobs yet.</p>}
        <ul className="divide-y divide-slate-100">
          {jobs.map((job) => (
            <li key={job.id} className="flex items-center justify-between gap-2 py-2">
              <button className="text-left" onClick={() => onSelectJob(job.id)}>
                <div className="text-sm font-medium text-slate-900">{job.name || job.reference}</div>
                <div className="text-xs text-slate-500">{job.customer.name || 'No customer name'} · {job.status}</div>
              </button>
              <span className="whitespace-nowrap text-xs text-slate-400">{new Date(job.updatedAt).toLocaleDateString('en-GB')}</span>
            </li>
          ))}
        </ul>
      </Card>

      <div>
        <SectionHeading title="Sections" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {tiles.map((tile) => (
            <button
              key={tile.key}
              onClick={() => onNavigate(tile.key)}
              className="flex flex-col items-center gap-2 rounded-lg border border-slate-200 bg-white p-4 text-center hover:border-sky-400 hover:bg-sky-50"
            >
              <span className="text-2xl" aria-hidden>{tile.icon}</span>
              <span className="text-sm font-medium text-slate-700">{tile.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
