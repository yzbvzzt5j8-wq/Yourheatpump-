import { describe, it, expect, vi, afterEach } from 'vitest';
import { exportReport } from './exportChain';

afterEach(() => {
  vi.unstubAllGlobals();
  // @ts-expect-error test cleanup of a property we may have added to navigator
  delete navigator.share;
  // @ts-expect-error same for canShare
  delete navigator.canShare;
});

describe('export chain', () => {
  it('uses navigator.share when available and canShare confirms files are supported', async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'share', { value: share, configurable: true });
    Object.defineProperty(navigator, 'canShare', { value: () => true, configurable: true });

    const result = await exportReport('report.html', '<html></html>');
    expect(result.method).toBe('share');
    expect(result.success).toBe(true);
    expect(share).toHaveBeenCalledOnce();
  });

  it('falls through to blob download when share is unavailable', async () => {
    const result = await exportReport('report.html', '<html></html>');
    expect(result.method).toBe('download');
    expect(result.success).toBe(true);
  });

  it('a cancelled share (AbortError) is reported, not silently retried as a different method', async () => {
    const abortError = Object.assign(new Error('cancelled'), { name: 'AbortError' });
    Object.defineProperty(navigator, 'share', { value: vi.fn().mockRejectedValue(abortError), configurable: true });
    Object.defineProperty(navigator, 'canShare', { value: () => true, configurable: true });

    const result = await exportReport('report.html', '<html></html>');
    expect(result.method).toBe('share');
    expect(result.success).toBe(false);
    expect(result.error).toBe('cancelled');
  });

  it('a share failure that is NOT a cancel falls through to download instead of surfacing as a hard failure', async () => {
    Object.defineProperty(navigator, 'share', { value: vi.fn().mockRejectedValue(new Error('boom')), configurable: true });
    Object.defineProperty(navigator, 'canShare', { value: () => true, configurable: true });

    const result = await exportReport('report.html', '<html></html>');
    expect(result.method).toBe('download');
    expect(result.success).toBe(true);
  });

  it('falls through to window.open when both share and download are unavailable', async () => {
    const originalCreateElement = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      if (tag === 'a') throw new Error('anchors blocked in this sandboxed frame');
      return originalCreateElement(tag);
    });
    const openSpy = vi.spyOn(window, 'open').mockReturnValue({
      document: { open: vi.fn(), write: vi.fn(), close: vi.fn() },
    } as unknown as Window);

    const result = await exportReport('report.html', '<html></html>');
    expect(result.method).toBe('window-open');
    expect(result.success).toBe(true);
    openSpy.mockRestore();
    vi.restoreAllMocks();
  });

  it('reports fallback (not a throw) when every route fails, so the caller can show a print/copy panel', async () => {
    const originalCreateElement = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      if (tag === 'a') throw new Error('blocked');
      return originalCreateElement(tag);
    });
    vi.spyOn(window, 'open').mockReturnValue(null);

    const result = await exportReport('report.html', '<html></html>');
    expect(result.method).toBe('fallback');
    expect(result.success).toBe(false);
    vi.restoreAllMocks();
  });
});
