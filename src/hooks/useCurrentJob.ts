import { useCallback, useEffect, useState } from 'react';
import { getJob } from '../db/jobs';
import type { Job } from '../types/job';

const STORAGE_KEY = 'yhp-current-job-id';

export function useCurrentJob(): [Job | null, (jobId: string | null) => void, boolean] {
  const [jobId, setJobIdState] = useState<string | null>(() => localStorage.getItem(STORAGE_KEY));
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    if (!jobId) {
      setJob(null);
      setLoading(false);
      return;
    }
    getJob(jobId).then((found) => {
      if (!cancelled) {
        setJob(found ?? null);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [jobId]);

  const setJobId = useCallback((id: string | null) => {
    if (id) localStorage.setItem(STORAGE_KEY, id);
    else localStorage.removeItem(STORAGE_KEY);
    setJobIdState(id);
  }, []);

  return [job, setJobId, loading];
}
