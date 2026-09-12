/**
 * Payment error model. Every failure the customer or merchant can hit is mapped
 * to a stable code plus a plain-English message — no stack traces in the UI.
 */

export type PaymentErrorCode =
  | 'wallet_unavailable'
  | 'wallet_rejected'
  | 'wallet_closed'
  | 'wrong_network'
  | 'account_not_funded'
  | 'no_trustline'
  | 'insufficient_balance'
  | 'expired'
  | 'already_settled'
  | 'not_found'
  | 'invalid_amount'
  | 'invalid_token'
  | 'amount_mismatch'
  | 'memo_mismatch'
  | 'tx_failed'
  | 'tx_not_found'
  | 'rpc_failure'
  | 'contract_failure'
  | 'network_error'
  | 'no_merchant'
  | 'invalid_merchant_wallet'
  | 'server_error'
  | 'unknown';

const MESSAGES: Record<PaymentErrorCode, string> = {
  wallet_unavailable:
    'No Stellar wallet was found in this browser. Install Freighter, or open this payment link in a wallet browser.',
  wallet_rejected: 'The payment was declined in your wallet. You can try again.',
  wallet_closed: 'The wallet window was closed before the payment was signed.',
  wrong_network:
    'Your wallet is not on the Stellar test network. Switch it to Testnet and try again.',
  account_not_funded:
    'This wallet has no funded Stellar Testnet account yet. Fund it with Friendbot and try again.',
  no_trustline:
    'This wallet cannot hold the settlement asset yet. Add the trustline and try again.',
  insufficient_balance: 'This wallet does not have enough testnet balance to complete the payment.',
  expired: 'This payment request expired. Ask the merchant to create a new one.',
  already_settled: 'This payment has already been paid.',
  not_found: 'This payment request could not be found.',
  invalid_amount: 'That amount is not valid.',
  invalid_token: 'That payment link is not valid.',
  amount_mismatch: 'The transaction did not pay the expected amount.',
  memo_mismatch: 'That transaction does not reference this payment request.',
  tx_failed: 'The Stellar transaction failed on the network.',
  tx_not_found: 'The transaction is not visible on Stellar yet.',
  rpc_failure: 'Stellar could not be reached right now. Try again in a moment.',
  contract_failure: 'The settlement contract rejected this payment.',
  network_error: 'Could not reach the payment service. Check your connection and try again.',
  no_merchant: 'Finish merchant onboarding first.',
  invalid_merchant_wallet: 'The merchant Stellar address looks invalid. Update it in Settings.',
  server_error: 'Something went wrong on our side. Try again.',
  unknown: 'Something went wrong. Try again.',
};

export function messageForCode(code: PaymentErrorCode): string {
  return MESSAGES[code] ?? MESSAGES.unknown;
}

const CODES = new Set<string>([
  'wallet_unavailable',
  'wallet_rejected',
  'wallet_closed',
  'wrong_network',
  'account_not_funded',
  'no_trustline',
  'insufficient_balance',
  'expired',
  'already_settled',
  'not_found',
  'invalid_amount',
  'invalid_token',
  'amount_mismatch',
  'memo_mismatch',
  'tx_failed',
  'tx_not_found',
  'rpc_failure',
  'contract_failure',
  'network_error',
  'no_merchant',
  'invalid_merchant_wallet',
  'server_error',
  'unknown',
] satisfies PaymentErrorCode[]);

/** Narrow an edge function's `error` field to a known code, defaulting to server_error. */
export function isPaymentErrorCode(value: unknown): value is PaymentErrorCode {
  return typeof value === 'string' && CODES.has(value);
}

export class PaymentError extends Error {
  readonly code: PaymentErrorCode;
  readonly retryable: boolean;
  readonly details: unknown;

  constructor(code: PaymentErrorCode, message?: string, retryable = true, details?: unknown) {
    super(message && message.length > 0 ? message : messageForCode(code));
    this.name = 'PaymentError';
    this.code = code;
    this.retryable = retryable;
    this.details = details ?? null;
  }
}

function normalise(value: unknown): string {
  if (value instanceof Error) return value.message;
  if (typeof value === 'string') return value;
  if (value && typeof value === 'object') {
    if ('message' in value && typeof value.message === 'string') return value.message;
    try {
      return JSON.stringify(value);
    } catch {
      return Object.prototype.toString.call(value);
    }
  }
  if (value === null || value === undefined) return '';
  if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') {
    return String(value);
  }
  return Object.prototype.toString.call(value);
}

/** Convert any thrown value (including wallet SDK errors) into a PaymentError. */
export function toPaymentError(value: unknown): PaymentError {
  if (value instanceof PaymentError) return value;

  const raw = normalise(value);
  const text = raw.toLowerCase();

  if (
    text.includes('declined') ||
    text.includes('rejected') ||
    text.includes('denied') ||
    text.includes('user cancel')
  ) {
    return new PaymentError('wallet_rejected', undefined, true, raw);
  }
  if (text.includes('closed') || text.includes('dismiss')) {
    return new PaymentError('wallet_closed', undefined, true, raw);
  }
  if (
    text.includes('not installed') ||
    text.includes('not available') ||
    text.includes('no wallet')
  ) {
    return new PaymentError('wallet_unavailable', undefined, false, raw);
  }
  if (text.includes('network') && text.includes('mismatch')) {
    return new PaymentError('wrong_network', undefined, true, raw);
  }
  if (text.includes('underfunded') || text.includes('insufficient')) {
    return new PaymentError('insufficient_balance', undefined, true, raw);
  }
  if (text.includes('no_trust') || text.includes('trustline')) {
    return new PaymentError('no_trustline', undefined, true, raw);
  }
  if (text.includes('failed to fetch') || text.includes('network request failed')) {
    return new PaymentError('network_error', undefined, true, raw);
  }

  return new PaymentError(
    'unknown',
    raw.length > 0 && raw.length < 200 ? raw : undefined,
    true,
    raw,
  );
}
