export interface Customer {
  name: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  postcode: string;
  phone?: string;
  email?: string;
}

export type JobStatus = 'survey' | 'design' | 'hydraulics' | 'materials' | 'ready-to-quote' | 'commissioned' | 'complete';

export interface Job {
  id: string;
  reference: string;
  name: string;
  customer: Customer;
  status: JobStatus;
  createdAt: string;
  updatedAt: string;
  notes?: string;
}
