import { useEffect, useState } from 'react';
import type { AppSettingsBundle } from '../../types/settings';
import { getSettings, saveSettings, resetSettings } from '../../db/settings';
import { exportBackup, importBackup, backupToJsonBlob, parseBackupJson } from '../../db/backup';
import { Banner, Button, Card, CheckboxField, ConfirmDialog, Field, Select, SectionHeading, TextInput } from '../../components/ui';

export function SettingsScreen() {
  const [saved, setSaved] = useState<AppSettingsBundle | null>(null);
  const [draft, setDraft] = useState<AppSettingsBundle | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  function load() {
    getSettings().then((s) => {
      setSaved(s);
      setDraft(structuredClone(s));
    });
  }
  useEffect(load, []);

  if (!draft || !saved) return <p className="text-sm text-slate-500">Loading…</p>;
  const dirty = JSON.stringify(draft) !== JSON.stringify(saved);

  async function handleSave() {
    await saveSettings(draft!);
    setSaved(structuredClone(draft!));
    setStatus('Saved. These are defaults for new jobs only — existing jobs are unchanged.');
  }

  function handleCancel() {
    if (dirty) setConfirmCancel(true);
    else load();
  }

  async function handleResetConfirmed() {
    await resetSettings();
    setConfirmReset(false);
    load();
    setStatus('Reset to shipped defaults.');
  }

  async function handleExportBackup() {
    const backup = await exportBackup();
    const blob = backupToJsonBlob(backup);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `yourheatpump-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  }

  async function handleImportBackup(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    try {
      const backup = parseBackupJson(text);
      await importBackup(backup);
      setStatus('Backup restored. This replaced all local data.');
    } catch (err) {
      setStatus(`Could not restore backup: ${err instanceof Error ? err.message : 'unknown error'}`);
    }
    e.target.value = '';
  }

  return (
    <div className="space-y-4">
      <SectionHeading title="Settings" subtitle="Defaults for new jobs only — changing a setting never rewrites a completed project." />
      {status && <Banner tone="info">{status}</Banner>}

      <Card className="space-y-3">
        <h3 className="text-sm font-semibold text-slate-700">Company</h3>
        <Field label="Name"><TextInput value={draft.company.name} onChange={(e) => setDraft({ ...draft, company: { ...draft.company, name: e.target.value } })} /></Field>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Address line 1"><TextInput value={draft.company.addressLine1} onChange={(e) => setDraft({ ...draft, company: { ...draft.company, addressLine1: e.target.value } })} /></Field>
          <Field label="City"><TextInput value={draft.company.city} onChange={(e) => setDraft({ ...draft, company: { ...draft.company, city: e.target.value } })} /></Field>
          <Field label="Postcode"><TextInput value={draft.company.postcode} onChange={(e) => setDraft({ ...draft, company: { ...draft.company, postcode: e.target.value } })} /></Field>
          <Field label="Phone"><TextInput value={draft.company.phone ?? ''} onChange={(e) => setDraft({ ...draft, company: { ...draft.company, phone: e.target.value } })} /></Field>
          <Field label="MCS number"><TextInput value={draft.company.mcsNumber ?? ''} onChange={(e) => setDraft({ ...draft, company: { ...draft.company, mcsNumber: e.target.value } })} /></Field>
          <Field label="Gas Safe number"><TextInput value={draft.company.gasSafeNumber ?? ''} onChange={(e) => setDraft({ ...draft, company: { ...draft.company, gasSafeNumber: e.target.value } })} /></Field>
          <Field label="F-Gas number"><TextInput value={draft.company.fGasNumber ?? ''} onChange={(e) => setDraft({ ...draft, company: { ...draft.company, fGasNumber: e.target.value } })} /></Field>
        </div>
      </Card>

      <Card className="space-y-3">
        <h3 className="text-sm font-semibold text-slate-700">Calculation</h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Default external design temp (°C)"><TextInput type="number" value={draft.calculation.defaultExternalDesignTempC} onChange={(e) => setDraft({ ...draft, calculation: { ...draft.calculation, defaultExternalDesignTempC: Number(e.target.value) } })} /></Field>
          <Field label="Default thermal bridging (%)"><TextInput type="number" value={draft.calculation.defaultBridgingFraction * 100} onChange={(e) => setDraft({ ...draft, calculation: { ...draft.calculation, defaultBridgingFraction: Number(e.target.value) / 100 } })} /></Field>
          <Field label="Default antifreeze concentration (%)"><TextInput type="number" value={draft.calculation.defaultAntifreezeConcentrationFraction * 100} onChange={(e) => setDraft({ ...draft, calculation: { ...draft.calculation, defaultAntifreezeConcentrationFraction: Number(e.target.value) / 100 } })} /></Field>
          <Field label="Pipe sizing basis">
            <Select value={draft.calculation.pressureDropBasis} onChange={(e) => setDraft({ ...draft, calculation: { ...draft.calculation, pressureDropBasis: e.target.value as typeof draft.calculation.pressureDropBasis } })}>
              <option value="velocityAnd300">Velocity + 300 Pa/m ceiling (default)</option>
              <option value="cibse200">CIBSE 200 Pa/m</option>
              <option value="velocity">Velocity only</option>
            </Select>
          </Field>
        </div>
      </Card>

      <Card className="space-y-3">
        <h3 className="text-sm font-semibold text-slate-700">Project</h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="DHW design temperature (°C)"><TextInput type="number" value={draft.project.dhwDesignTempC} onChange={(e) => setDraft({ ...draft, project: { ...draft.project, dhwDesignTempC: Number(e.target.value) } })} /></Field>
          <Field label="Preferred manufacturers" hint="Comma-separated"><TextInput value={draft.project.preferredManufacturers.join(', ')} onChange={(e) => setDraft({ ...draft, project: { ...draft.project, preferredManufacturers: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) } })} /></Field>
        </div>
        <Field label="Report disclaimer footer"><TextInput value={draft.project.reportWording.disclaimerFooter} onChange={(e) => setDraft({ ...draft, project: { ...draft.project, reportWording: { disclaimerFooter: e.target.value } } })} /></Field>
        <CheckboxField label="Autosave" checked={draft.project.autosaveEnabled} onChange={(e) => setDraft({ ...draft, project: { ...draft.project, autosaveEnabled: e.target.checked } })} />
      </Card>

      <Card className="space-y-3">
        <h3 className="text-sm font-semibold text-slate-700">App</h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Theme">
            <Select value={draft.app.theme} onChange={(e) => setDraft({ ...draft, app: { ...draft.app, theme: e.target.value as typeof draft.app.theme } })}>
              <option value="system">System</option>
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </Select>
          </Field>
          <Field label="Text size">
            <Select value={draft.app.textSize} onChange={(e) => setDraft({ ...draft, app: { ...draft.app, textSize: e.target.value as typeof draft.app.textSize } })}>
              <option value="small">Small</option>
              <option value="medium">Medium</option>
              <option value="large">Large</option>
            </Select>
          </Field>
        </div>
        <CheckboxField label="Notifications" checked={draft.app.notificationsEnabled} onChange={(e) => setDraft({ ...draft, app: { ...draft.app, notificationsEnabled: e.target.checked } })} />
      </Card>

      <Card className="space-y-3">
        <h3 className="text-sm font-semibold text-slate-700">Backup / restore</h3>
        <p className="text-xs text-slate-500">Export everything as a JSON file, or restore from a previous export. Restoring replaces all local data.</p>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={handleExportBackup}>Export backup</Button>
          <label className="inline-flex min-h-11 cursor-pointer items-center justify-center rounded-md bg-slate-100 px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-200">
            Import backup
            <input type="file" accept="application/json" className="hidden" onChange={handleImportBackup} />
          </label>
        </div>
      </Card>

      <div className="flex flex-wrap gap-2">
        <Button onClick={handleSave} disabled={!dirty}>Save</Button>
        <Button variant="secondary" onClick={handleCancel} disabled={!dirty}>Cancel</Button>
        <Button variant="danger" onClick={() => setConfirmReset(true)}>Reset to defaults</Button>
      </div>

      <ConfirmDialog
        open={confirmReset}
        title="Reset settings?"
        message="This restores every section to the shipped defaults. Existing jobs are not affected."
        confirmLabel="Reset"
        onConfirm={handleResetConfirmed}
        onCancel={() => setConfirmReset(false)}
      />
      <ConfirmDialog
        open={confirmCancel}
        title="Discard unsaved changes?"
        message="Your edits since the last save will be lost."
        confirmLabel="Discard"
        onConfirm={() => { setConfirmCancel(false); load(); }}
        onCancel={() => setConfirmCancel(false)}
      />
    </div>
  );
}
