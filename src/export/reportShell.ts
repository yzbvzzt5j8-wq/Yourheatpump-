import type { CompanySettings } from '../types/settings';

const SHARED_CSS = `
  @page { size: A4; margin: 14mm; }
  * { box-sizing: border-box; }
  body { font-family: -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; color: #0f172a; margin: 0; padding: 16px; }
  h1 { font-size: 20px; margin: 0 0 4px; }
  h2 { font-size: 15px; margin: 16px 0 6px; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; }
  .muted { color: #64748b; font-size: 12px; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #0369a1; padding-bottom: 12px; margin-bottom: 12px; }
  .card { break-inside: avoid; border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px 12px; margin-bottom: 10px; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  th, td { text-align: left; padding: 4px 6px; border-bottom: 1px solid #f1f5f9; }
  .disclaimer { margin-top: 20px; padding: 10px; background: #fffbeb; border: 1px solid #fde68a; border-radius: 6px; font-size: 11px; color: #92400e; }
  .badge { display: inline-block; padding: 1px 8px; border-radius: 999px; font-size: 11px; font-weight: 600; }
  .pass { background: #d1fae5; color: #065f46; }
  .fail { background: #fee2e2; color: #991b1b; }
  @media print { .no-print { display: none; } }
`;

export const MCS_DISCLAIMER =
  'This is a design aid, not MCS-certified documentation. This application does not confer MCS certification — MCS ' +
  'certifies installers and installations, and separately approves calculation software. Certified paperwork, the ' +
  'official MCS 020 sound assessment and MCS database registration happen outside this application.';

function headerHtml(company: CompanySettings, title: string, jobRef: string): string {
  return `
    <div class="header">
      <div>
        <h1>${title}</h1>
        <div class="muted">Job ${jobRef}</div>
      </div>
      <div style="text-align:right">
        <div style="font-weight:600">${company.name || 'Company name not set'}</div>
        <div class="muted">${company.addressLine1 || ''} ${company.city || ''} ${company.postcode || ''}</div>
        ${company.mcsNumber ? `<div class="muted">MCS: ${company.mcsNumber}</div>` : ''}
      </div>
    </div>`;
}

export function reportShell(title: string, jobRef: string, bodyHtml: string, company: CompanySettings): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>${title} — ${jobRef}</title>
<style>${SHARED_CSS}</style>
</head>
<body>
${headerHtml(company, title, jobRef)}
${bodyHtml}
<div class="disclaimer">${MCS_DISCLAIMER}</div>
</body>
</html>`;
}
