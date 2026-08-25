import { useEffect, useState } from 'react';
import type { CommissioningRecord, ServiceRecord } from '../../types/commissioning';
import { getCommissioningForJob, saveCommissioning, getServiceRecordsForJob, saveServiceRecord, deleteServiceRecord } from '../../db/commissioning';
import { checkCertificateDeadline } from '../../calc/commissioning';
import { defaultChecklist } from './checklistItems';
import { Banner, Button, Card, CheckboxField, Field, SectionHeading, TextInput } from '../../components/ui';

function uid(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}
function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function CommissioningScreen({ jobId }: { jobId: string | null }) {
  const [record, setRecord] = useState<CommissioningRecord | null>(null);
  const [serviceRecords, setServiceRecords] = useState<ServiceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [newServiceNotes, setNewServiceNotes] = useState('');
  const [newServiceEngineer, setNewServiceEngineer] = useState('');

  useEffect(() => {
    if (!jobId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    Promise.all([getCommissioningForJob(jobId), getServiceRecordsForJob(jobId)]).then(([r, s]) => {
      setRecord(r ?? { id: uid('commissioning'), jobId, engineerName: '', flushingCompliance: 'BS-7593', checklist: defaultChecklist() });
      setServiceRecords(s);
      setLoading(false);
    });
  }, [jobId]);

  async function persist(next: CommissioningRecord) {
    setRecord(next);
    await saveCommissioning(next);
  }

  async function addServiceRecord() {
    if (!jobId || !newServiceNotes) return;
    const rec: ServiceRecord = { id: uid('service'), jobId, serviceDate: todayIso(), engineerName: newServiceEngineer, findings: newServiceNotes, partsReplaced: [] };
    await saveServiceRecord(rec);
    setServiceRecords((prev) => [rec, ...prev]);
    setNewServiceNotes('');
    setNewServiceEngineer('');
  }

  if (!jobId) return <Banner tone="info">Select or create a job from Home first.</Banner>;
  if (loading || !record) return <p className="text-sm text-slate-500">Loading…</p>;

  const deadline = record.handoverBriefingDate
    ? checkCertificateDeadline(record.handoverBriefingDate, record.certificateIssuedDate, todayIso())
    : null;

  return (
    <div className="space-y-4">
      <SectionHeading title="Commissioning" subtitle="Checklist, handover pack, service records." />

      <Card className="space-y-3">
        <Field label="Commissioning engineer"><TextInput value={record.engineerName} onChange={(e) => persist({ ...record, engineerName: e.target.value })} /></Field>
        <Field label="Date completed"><TextInput type="date" value={record.dateCompleted ?? ''} onChange={(e) => persist({ ...record, dateCompleted: e.target.value })} /></Field>
      </Card>

      <Card>
        <h3 className="mb-2 text-sm font-semibold text-slate-700">Checklist</h3>
        <div className="space-y-1">
          {record.checklist.map((item) => (
            <CheckboxField
              key={item.id}
              label={item.label}
              checked={item.checked}
              onChange={(e) => persist({ ...record, checklist: record.checklist.map((c) => (c.id === item.id ? { ...c, checked: e.target.checked } : c)) })}
            />
          ))}
        </div>
      </Card>

      <Card className="space-y-3">
        <h3 className="text-sm font-semibold text-slate-700">Measured at commissioning</h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Field label="Flow rate (L/s)"><TextInput type="number" value={record.measuredFlowRateLps ?? ''} onChange={(e) => persist({ ...record, measuredFlowRateLps: Number(e.target.value) })} /></Field>
          <Field label="Flow temp (°C)"><TextInput type="number" value={record.measuredFlowTempC ?? ''} onChange={(e) => persist({ ...record, measuredFlowTempC: Number(e.target.value) })} /></Field>
          <Field label="Return temp (°C)"><TextInput type="number" value={record.measuredReturnTempC ?? ''} onChange={(e) => persist({ ...record, measuredReturnTempC: Number(e.target.value) })} /></Field>
        </div>
      </Card>

      <Card className="space-y-3">
        <h3 className="text-sm font-semibold text-slate-700">Handover</h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Customer briefing date" hint="MIS 3005 cl. 7.2.1"><TextInput type="date" value={record.handoverBriefingDate ?? ''} onChange={(e) => persist({ ...record, handoverBriefingDate: e.target.value })} /></Field>
          <Field label="Certificate issued date" hint="Must be within 10 working days of briefing (cl. 7.1.1)"><TextInput type="date" value={record.certificateIssuedDate ?? ''} onChange={(e) => persist({ ...record, certificateIssuedDate: e.target.value })} /></Field>
        </div>
        {deadline && (
          <Banner tone={deadline.isOverdue ? 'critical' : 'info'}>
            {record.certificateIssuedDate
              ? deadline.isOverdue
                ? `Certificate was issued after the 10 working day deadline (${deadline.deadlineDateIso}).`
                : `Certificate issued within the 10 working day deadline (${deadline.deadlineDateIso}).`
              : deadline.isOverdue
                ? `Overdue — the 10 working day deadline (${deadline.deadlineDateIso}) has passed with no certificate recorded.`
                : `Deadline: ${deadline.deadlineDateIso} (${deadline.daysRemaining} day(s) remaining).`}
          </Banner>
        )}
      </Card>

      <Card className="space-y-3">
        <h3 className="text-sm font-semibold text-slate-700">Service records</h3>
        <div className="space-y-2">
          {serviceRecords.map((s) => (
            <div key={s.id} className="rounded-md border border-slate-200 p-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="font-medium">{s.serviceDate} — {s.engineerName || 'Unnamed engineer'}</span>
                <button className="text-xs text-red-600" onClick={async () => { await deleteServiceRecord(s.id); setServiceRecords((prev) => prev.filter((r) => r.id !== s.id)); }}>Delete</button>
              </div>
              <p className="mt-1 text-slate-600">{s.findings}</p>
            </div>
          ))}
          {serviceRecords.length === 0 && <p className="text-xs text-slate-400">No service visits recorded yet.</p>}
        </div>
        <div className="space-y-2 border-t border-slate-100 pt-3">
          <Field label="Engineer"><TextInput value={newServiceEngineer} onChange={(e) => setNewServiceEngineer(e.target.value)} /></Field>
          <Field label="Findings"><TextInput value={newServiceNotes} onChange={(e) => setNewServiceNotes(e.target.value)} placeholder="Describe the visit" /></Field>
          <Button onClick={addServiceRecord} disabled={!newServiceNotes}>+ Add service record</Button>
        </div>
      </Card>
    </div>
  );
}
