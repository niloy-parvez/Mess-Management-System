import { v4 as uuidv4 } from 'uuid';

export interface InMemoryPayment {
  id: string;
  member_id: string;
  amount: number;
  payment_method: string;
  payment_date: string;
  reference?: string | null;
  notes?: string | null;
  verified?: boolean;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
  member?: any;
}

export const paymentsFallback: InMemoryPayment[] = [];

export function addFallbackPayment(p: Omit<InMemoryPayment, 'id' | 'created_at' | 'updated_at'>): InMemoryPayment {
  const now = new Date().toISOString();
  const payment: InMemoryPayment = {
    id: uuidv4(),
    created_at: now,
    updated_at: now,
    ...p,
  };
  paymentsFallback.push(payment);
  return payment;
}

export function listFallbackPayments() {
  return paymentsFallback.slice().reverse();
}
