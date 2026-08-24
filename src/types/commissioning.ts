export interface CommissioningChecklistItem {
  id: string;
  label: string;
  reference?: string; // e.g. "BS 7593 flushing", "cl. 7.1.1"
  checked: boolean;
  notes?: string;
}

export interface CommissioningRecord {
  id: string;
  jobId: string;
  dateCompleted?: string;
  engineerName: string;
  flushingCompliance: 'BS-7593' | 'not-applicable';
  checklist: CommissioningChecklistItem[];
  measuredFlowRateLps?: number;
  measuredFlowTempC?: number;
  measuredReturnTempC?: number;
  handoverBriefingDate?: string; // MIS 3005 cl. 7.2.1
  certificateIssuedDate?: string; // within 10 working days of handover, cl. 7.1.1
  notes?: string;
}

export interface ServiceRecord {
  id: string;
  jobId: string;
  serviceDate: string;
  engineerName: string;
  findings: string;
  partsReplaced: string[];
  nextServiceDueDate?: string;
}
