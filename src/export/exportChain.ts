/**
 * Export chain (spec Part 6). window.print() is unreliable in embedded
 * viewers and on mobile; file downloads are blocked outright in sandboxed
 * frames. This tries, in order:
 *   1. navigator.share with a File — best on mobile (Files/Mail/AirDrop)
 *   2. Blob + <a download>
 *   3. window.open with the document written into it
 *   4. Fallback: caller shows a panel offering print, or the raw HTML to copy
 *
 * The report node's content is passed in as a standalone HTML string with
 * its styles inlined, so whichever route lands, the file opens correctly
 * in any browser on its own.
 */

export type ExportMethod = 'share' | 'download' | 'window-open' | 'fallback';

export interface ExportResult {
  method: ExportMethod;
  success: boolean;
  error?: string;
}

function toHtmlFile(filename: string, html: string): File {
  return new File([html], filename, { type: 'text/html' });
}

async function tryShare(filename: string, html: string): Promise<ExportResult | null> {
  if (typeof navigator === 'undefined' || !navigator.share) return null;
  const file = toHtmlFile(filename, html);
  const canShareFiles = 'canShare' in navigator && navigator.canShare?.({ files: [file] });
  if (!canShareFiles) return null;
  try {
    await navigator.share({ files: [file], title: filename });
    return { method: 'share', success: true };
  } catch (err) {
    // AbortError means the user cancelled the share sheet — not a failure of the chain itself.
    if (err instanceof Error && err.name === 'AbortError') return { method: 'share', success: false, error: 'cancelled' };
    return null; // fall through to the next method
  }
}

function tryDownload(filename: string, html: string): ExportResult | null {
  try {
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 10000);
    return { method: 'download', success: true };
  } catch {
    return null;
  }
}

function tryWindowOpen(html: string): ExportResult | null {
  try {
    const win = window.open('', '_blank');
    if (!win) return null;
    win.document.open();
    win.document.write(html);
    win.document.close();
    return { method: 'window-open', success: true };
  } catch {
    return null;
  }
}

export async function exportReport(filename: string, html: string): Promise<ExportResult> {
  const shared = await tryShare(filename, html);
  if (shared) return shared;

  const downloaded = tryDownload(filename, html);
  if (downloaded) return downloaded;

  const opened = tryWindowOpen(html);
  if (opened) return opened;

  return { method: 'fallback', success: false, error: 'All export routes failed — offer print or copy directly.' };
}
