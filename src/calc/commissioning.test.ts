import { describe, it, expect } from 'vitest';
import { addWorkingDays, checkCertificateDeadline } from './commissioning';

describe('addWorkingDays', () => {
  it('skips weekends — 10 working days from a Monday lands two weeks later minus the weekends crossed', () => {
    // Monday 2026-01-05 + 10 working days -> Monday 2026-01-19
    expect(addWorkingDays('2026-01-05', 10)).toBe('2026-01-19');
  });

  it('starting on a Friday, +1 working day lands on Monday', () => {
    expect(addWorkingDays('2026-01-09', 1)).toBe('2026-01-12');
  });
});

describe('checkCertificateDeadline — MIS 3005 cl. 7.1.1, 10 working days', () => {
  it('not overdue while still before the deadline and uncertified', () => {
    const result = checkCertificateDeadline('2026-01-05', undefined, '2026-01-08');
    expect(result.isOverdue).toBe(false);
    expect(result.daysRemaining).toBeGreaterThan(0);
  });

  it('overdue once today passes the deadline with no certificate issued', () => {
    const result = checkCertificateDeadline('2026-01-05', undefined, '2026-01-25');
    expect(result.isOverdue).toBe(true);
  });

  it('a certificate issued after the deadline is flagged overdue even though it exists', () => {
    const result = checkCertificateDeadline('2026-01-05', '2026-01-25', '2026-01-25');
    expect(result.isOverdue).toBe(true);
  });

  it('a certificate issued within the window is not overdue', () => {
    const result = checkCertificateDeadline('2026-01-05', '2026-01-10', '2026-01-25');
    expect(result.isOverdue).toBe(false);
  });
});
