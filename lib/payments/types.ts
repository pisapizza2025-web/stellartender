/** Shared payment types used by both the merchant app and the customer page. */

export type PaymentStatus =
  | 'pending'
  | 'wallet_connected'
  | 'authorising'
  | 'submitted'
  | 'settled'
  | 'failed'
  | 'expired';

/** Anon-safe view of a payment session, as returned by the payment-public function. */
export type PublicSession = {
  public_token: string;
  business_name: string;
  existing_pos: string | null;
  amount_gbp: number;
  order_reference: string | null;
  asset_code: string;
  asset_issuer: string | null;
  settlement_amount: number;
  merchant_amount: number;
  platform_fee: number;
  platform_fee_bps: number;
  merchant_wallet: string;
  platform_wallet: string | null;
  settlement_mode: string;
  status: PaymentStatus;
  payer_address: string | null;
  stellar_transaction_hash: string | null;
  failure_reason: string | null;
  expires_at: string;
  settled_at: string | null;
  created_at: string;
  memo: string;
};

export const POS_OPTIONS = [
  'Square',
  'Lightspeed',
  'Epos Now',
  'Clover',
  'SumUp',
  'Zettle',
  'Toast',
  'Other',
] as const;

export type PosOption = (typeof POS_OPTIONS)[number];

export const TERMINAL_STATUSES: PaymentStatus[] = ['settled', 'expired', 'failed'];

export function isTerminal(status: PaymentStatus): boolean {
  return TERMINAL_STATUSES.includes(status);
}
