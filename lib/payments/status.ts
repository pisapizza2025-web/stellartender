/** Status vocabulary shared by the merchant terminal and the customer page. */

import type { PaymentStatus } from './types';

export type StatusTone = 'neutral' | 'progress' | 'success' | 'danger';

type StatusMeta = {
  /** Merchant terminal wording. */
  merchantLabel: string;
  /** Customer page wording. */
  customerLabel: string;
  tone: StatusTone;
};

const META: Record<PaymentStatus, StatusMeta> = {
  pending: {
    merchantLabel: 'WAITING FOR PAYMENT',
    customerLabel: 'READY TO PAY',
    tone: 'neutral',
  },
  wallet_connected: {
    merchantLabel: 'CUSTOMER CONNECTED',
    customerLabel: 'WALLET CONNECTED',
    tone: 'progress',
  },
  authorising: {
    merchantLabel: 'CUSTOMER AUTHORISING',
    customerLabel: 'CONFIRM IN YOUR WALLET',
    tone: 'progress',
  },
  submitted: {
    merchantLabel: 'PAYMENT PROCESSING...',
    customerLabel: 'CONFIRMING ON STELLAR',
    tone: 'progress',
  },
  settled: {
    merchantLabel: 'PAYMENT SETTLED',
    customerLabel: 'PAYMENT COMPLETE',
    tone: 'success',
  },
  failed: {
    merchantLabel: 'PAYMENT FAILED',
    customerLabel: 'PAYMENT FAILED',
    tone: 'danger',
  },
  expired: {
    merchantLabel: 'PAYMENT REQUEST EXPIRED',
    customerLabel: 'PAYMENT REQUEST EXPIRED',
    tone: 'danger',
  },
};

export function statusMeta(status: PaymentStatus): StatusMeta {
  return META[status] ?? META.pending;
}

export function merchantStatusLabel(status: PaymentStatus): string {
  return statusMeta(status).merchantLabel;
}

export function customerStatusLabel(status: PaymentStatus): string {
  return statusMeta(status).customerLabel;
}

export function statusTone(status: PaymentStatus): StatusTone {
  return statusMeta(status).tone;
}

/** Short label used in transaction lists. */
export function statusShortLabel(status: PaymentStatus): string {
  switch (status) {
    case 'settled':
      return 'SETTLED';
    case 'expired':
      return 'EXPIRED';
    case 'failed':
      return 'FAILED';
    case 'pending':
      return 'WAITING';
    default:
      return 'IN PROGRESS';
  }
}
