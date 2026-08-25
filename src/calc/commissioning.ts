/** Working-day arithmetic for the MIS 3005 cl. 7.1.1 "certificate within 10 working days" deadline. */

function isWeekend(date: Date): boolean {
  const day = date.getUTCDay();
  return day === 0 || day === 6;
}

/** Adds N working days (Mon-Fri) to an ISO date, skipping weekends. Does not account for public holidays. */
export function addWorkingDays(startDateIso: string, workingDays: number): string {
  const date = new Date(startDateIso + 'T00:00:00Z');
  let remaining = workingDays;
  while (remaining > 0) {
    date.setUTCDate(date.getUTCDate() + 1);
    if (!isWeekend(date)) remaining -= 1;
  }
  return date.toISOString().slice(0, 10);
}

export interface CertificateDeadlineResult {
  deadlineDateIso: string;
  isOverdue: boolean;
  daysRemaining: number | null;
}

/** MIS 3005 cl. 7.1.1: the certificate must be issued within 10 working days of handover. */
export function checkCertificateDeadline(handoverDateIso: string, certificateIssuedDateIso: string | undefined, todayIso: string): CertificateDeadlineResult {
  const deadlineDateIso = addWorkingDays(handoverDateIso, 10);
  if (certificateIssuedDateIso) {
    return { deadlineDateIso, isOverdue: certificateIssuedDateIso > deadlineDateIso, daysRemaining: null };
  }
  const isOverdue = todayIso > deadlineDateIso;
  const daysRemaining = Math.ceil((new Date(deadlineDateIso).getTime() - new Date(todayIso).getTime()) / (1000 * 60 * 60 * 24));
  return { deadlineDateIso, isOverdue, daysRemaining };
}
