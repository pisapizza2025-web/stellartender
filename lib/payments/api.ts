/**
 * Data access for Alternative Stellar Payment.
 *
 * Payment sessions are created and settled by edge functions only: the server
 * owns the commercial amount, the asset choice and the fee split. The app never
 * inserts a session or flips a status to settled by itself.
 */

import { FunctionsHttpError, type Tables } from '@biltme/backend';
import { Platform } from 'react-native';

import { bilt } from '@/lib/bilt';
import { isPaymentErrorCode, PaymentError, type PaymentErrorCode } from '@/lib/stellar/errors';

import type { PaymentStatus, PublicSession } from './types';

export type Merchant = Tables<'merchants'>;
export type PlatformSettings = Tables<'platform_settings'>;
export type PaymentSessionRow = Tables<'payment_sessions'>;
export type TransactionRow = Tables<'transactions'>;

export type TransactionWithSession = TransactionRow & {
  payment_sessions: Pick<
    PaymentSessionRow,
    'public_token' | 'order_reference' | 'amount_gbp' | 'status' | 'settled_at'
  > | null;
};

/* -------------------------------------------------------------------------- */
/* Edge function plumbing                                                      */
/* -------------------------------------------------------------------------- */

type FunctionErrorBody = { code: PaymentErrorCode; message?: string; raw: unknown };

async function readFunctionError(error: FunctionsHttpError): Promise<FunctionErrorBody> {
  let parsed: unknown = null;
  try {
    parsed = await error.context.json();
  } catch {
    parsed = null;
  }

  const body = parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  const code = 'error' in body && isPaymentErrorCode(body.error) ? body.error : 'server_error';
  const message =
    'message' in body && typeof body.message === 'string' && body.message.length > 0
      ? body.message
      : undefined;

  return { code, message, raw: parsed };
}

async function invokeFn<T>(name: string, body: Record<string, unknown>): Promise<T> {
  const { data, error } = await bilt.functions.invoke<T>(name, { body });

  if (!error) {
    if (data === null || data === undefined) {
      throw new PaymentError('server_error', 'The payment service returned an empty response.');
    }
    return data;
  }

  if (error instanceof FunctionsHttpError) {
    const parsed = await readFunctionError(error);
    throw new PaymentError(parsed.code, parsed.message, true, parsed.raw);
  }

  throw new PaymentError('network_error', undefined, true, error.message);
}

function dbError(message: string): PaymentError {
  return new PaymentError('server_error', message);
}

/* -------------------------------------------------------------------------- */
/* Merchant profile + platform settings                                        */
/* -------------------------------------------------------------------------- */

export async function fetchMerchant(): Promise<Merchant | null> {
  const { data, error } = await bilt.from('merchants').select('*').limit(1).maybeSingle();
  if (error) throw dbError(error.message);
  return data;
}

export async function createMerchant(input: {
  business_name: string;
  existing_pos: string;
  stellar_wallet: string;
  card_processing_rate?: number;
}): Promise<Merchant> {
  const { data: userData, error: userError } = await bilt.auth.getUser();
  if (userError || !userData.user) throw new PaymentError('server_error', 'You are not signed in.');

  const { data, error } = await bilt
    .from('merchants')
    .insert({
      user_id: userData.user.id,
      business_name: input.business_name,
      existing_pos: input.existing_pos,
      stellar_wallet: input.stellar_wallet,
      card_processing_rate: input.card_processing_rate ?? 1.75,
    })
    .select('*')
    .single();
  if (error) throw dbError(error.message);
  return data;
}

export async function updateMerchant(
  id: string,
  patch: Partial<
    Pick<Merchant, 'business_name' | 'existing_pos' | 'stellar_wallet' | 'card_processing_rate'>
  >,
): Promise<Merchant> {
  const { data, error } = await bilt
    .from('merchants')
    .update(patch)
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw dbError(error.message);
  return data;
}

export async function fetchSettings(): Promise<PlatformSettings | null> {
  const { data, error } = await bilt
    .from('platform_settings')
    .select('*')
    .eq('id', true)
    .maybeSingle();
  if (error) throw dbError(error.message);
  return data;
}

export async function updateSettings(
  patch: Partial<
    Pick<
      PlatformSettings,
      | 'platform_fee_bps'
      | 'platform_wallet'
      | 'settlement_asset_code'
      | 'settlement_asset_issuer'
      | 'xlm_gbp_rate'
      | 'settlement_cost_pct'
      | 'soroban_contract_id'
      | 'pay_base_url'
    >
  >,
): Promise<PlatformSettings> {
  const { data, error } = await bilt
    .from('platform_settings')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', true)
    .select('*')
    .single();
  if (error) throw dbError(error.message);
  return data;
}

/* -------------------------------------------------------------------------- */
/* Payment sessions                                                            */
/* -------------------------------------------------------------------------- */

export type CreateSessionResult = {
  session: PaymentSessionRow;
  merchant: { business_name: string; existing_pos: string };
  notices: { asset_fallback_reason: string | null; merchant_account_funded: boolean };
  pay_base_url: string | null;
};

export function createPaymentSession(input: {
  amount_gbp: number;
  order_reference?: string | null;
  expiry_seconds?: number;
}): Promise<CreateSessionResult> {
  return invokeFn<CreateSessionResult>('payment-create', {
    amount_gbp: input.amount_gbp,
    order_reference: input.order_reference ?? null,
    expiry_seconds: input.expiry_seconds ?? 300,
  });
}

export async function fetchSessionById(id: string): Promise<PaymentSessionRow | null> {
  const { data, error } = await bilt
    .from('payment_sessions')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw dbError(error.message);
  return data;
}

export async function fetchSessions(limit = 50): Promise<PaymentSessionRow[]> {
  const { data, error } = await bilt
    .from('payment_sessions')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw dbError(error.message);
  return data ?? [];
}

/* -------------------------------------------------------------------------- */
/* Public (customer) payment endpoints — no login required                      */
/* -------------------------------------------------------------------------- */

export async function fetchPublicSession(token: string): Promise<PublicSession> {
  const result = await invokeFn<{ session: PublicSession }>('payment-public', {
    action: 'get',
    token,
  });
  return result.session;
}

export async function updatePublicStatus(
  token: string,
  status: Extract<
    PaymentStatus,
    'pending' | 'wallet_connected' | 'authorising' | 'submitted' | 'failed'
  >,
  extra: {
    payer_address?: string;
    stellar_transaction_hash?: string;
    failure_reason?: string;
  } = {},
): Promise<PublicSession> {
  const result = await invokeFn<{ session: PublicSession }>('payment-public', {
    action: 'status',
    token,
    status,
    ...extra,
  });
  return result.session;
}

export async function settlePublicPayment(
  token: string,
  hash: string,
): Promise<{ session: PublicSession; settled?: boolean; already_settled?: boolean }> {
  return invokeFn<{ session: PublicSession; settled?: boolean; already_settled?: boolean }>(
    'payment-public',
    { action: 'settle', token, hash },
  );
}

/* -------------------------------------------------------------------------- */
/* Transactions + merchant stats                                               */
/* -------------------------------------------------------------------------- */

export async function fetchTransactions(limit = 200): Promise<TransactionWithSession[]> {
  const { data, error } = await bilt
    .from('transactions')
    .select('*, payment_sessions(public_token, order_reference, amount_gbp, status, settled_at)')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw dbError(error.message);
  return data ?? [];
}

export async function fetchTransactionById(id: string): Promise<TransactionWithSession | null> {
  const { data, error } = await bilt
    .from('transactions')
    .select('*, payment_sessions(public_token, order_reference, amount_gbp, status, settled_at)')
    .eq('id', id)
    .maybeSingle();
  if (error) throw dbError(error.message);
  return data ?? null;
}

export type MerchantStats = {
  todayVolume: number;
  todayCount: number;
  todayFees: number;
  monthVolume: number;
  monthCount: number;
  monthFees: number;
  lifetimeVolume: number;
  lifetimeCount: number;
  lifetimeFees: number;
};

const EMPTY_STATS: MerchantStats = {
  todayVolume: 0,
  todayCount: 0,
  todayFees: 0,
  monthVolume: 0,
  monthCount: 0,
  monthFees: 0,
  lifetimeVolume: 0,
  lifetimeCount: 0,
  lifetimeFees: 0,
};

/** Aggregate settled transactions into today / this month / lifetime buckets. */
export function summariseTransactions(
  rows: TransactionWithSession[],
  feeGbpFor: (row: TransactionWithSession) => number,
): MerchantStats {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

  return rows.reduce<MerchantStats>(
    (acc, row) => {
      const gbp = row.amount_gbp;
      const fee = feeGbpFor(row);
      const at = new Date(row.created_at).getTime();

      acc.lifetimeVolume += gbp;
      acc.lifetimeCount += 1;
      acc.lifetimeFees += fee;

      if (at >= startOfMonth) {
        acc.monthVolume += gbp;
        acc.monthCount += 1;
        acc.monthFees += fee;
      }
      if (at >= startOfDay) {
        acc.todayVolume += gbp;
        acc.todayCount += 1;
        acc.todayFees += fee;
      }
      return acc;
    },
    { ...EMPTY_STATS },
  );
}

/* -------------------------------------------------------------------------- */
/* Payment link building                                                       */
/* -------------------------------------------------------------------------- */

/**
 * Public payment URL for a token. This is the value encoded in the QR code and
 * the value that goes into an NFC tag later — both reference the same session.
 */
export function buildPayUrl(token: string, configuredBase?: string | null): string {
  const base = configuredBase?.trim();
  if (base && base.length > 0) {
    return `${base.replace(/\/+$/, '')}/pay/${token}`;
  }
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    return `${window.location.origin}/pay/${token}`;
  }
  return `/pay/${token}`;
}
