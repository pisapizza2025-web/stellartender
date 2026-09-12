/**
 * Horizon REST access over plain fetch. Deliberately avoids the SDK's Horizon
 * client so the web bundle stays free of its axios/eventsource stack.
 */

import { HORIZON_URL } from './config';
import { PaymentError } from './errors';

export type HorizonBalance = {
  asset_type: string;
  asset_code?: string;
  asset_issuer?: string;
  balance: string;
};

export type HorizonAccount = {
  id: string;
  sequence: string;
  balances: HorizonBalance[];
};

export type HorizonTransaction = {
  hash: string;
  successful: boolean;
  ledger?: number;
  created_at?: string;
  memo?: string;
  memo_type?: string;
};

async function horizonFetch(path: string, init?: RequestInit): Promise<Response> {
  try {
    return await fetch(`${HORIZON_URL}${path}`, init);
  } catch (cause) {
    throw new PaymentError('rpc_failure', undefined, true, cause);
  }
}

/** Horizon always answers with a JSON object; anything else is a broken response. */
async function readJsonObject(res: Response): Promise<Record<string, unknown> | null> {
  const parsed: unknown = await res.json().catch(() => null);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
  return { ...parsed };
}

function str(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

function num(value: unknown): number | undefined {
  return typeof value === 'number' ? value : undefined;
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? { ...value } : {};
}

function toBalances(value: unknown): HorizonBalance[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry): HorizonBalance[] => {
    const row = record(entry);
    const assetType = str(row.asset_type);
    const balance = str(row.balance);
    if (!assetType || balance === undefined) return [];
    return [
      {
        asset_type: assetType,
        asset_code: str(row.asset_code),
        asset_issuer: str(row.asset_issuer),
        balance,
      },
    ];
  });
}

/** Load an account, or null when Horizon has never seen it (unfunded). */
export async function loadAccount(address: string): Promise<HorizonAccount | null> {
  const res = await horizonFetch(`/accounts/${address}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new PaymentError('rpc_failure', `Stellar Horizon returned ${res.status}.`);

  const payload = await readJsonObject(res);
  const id = str(payload?.id);
  const sequence = str(payload?.sequence);
  if (!payload || !id || !sequence) {
    throw new PaymentError('rpc_failure', 'Stellar Horizon returned an unexpected account.');
  }
  return { id, sequence, balances: toBalances(payload.balances) };
}

export function balanceFor(
  balances: HorizonBalance[] | undefined,
  code: string,
  issuer: string | null,
): number | null {
  if (!balances) return null;
  const match = balances.find((b) =>
    code === 'XLM'
      ? b.asset_type === 'native'
      : b.asset_code === code && (!issuer || b.asset_issuer === issuer),
  );
  return match ? Number(match.balance) : null;
}

function mapResultCode(code: string): PaymentError {
  const text = code.toLowerCase();
  if (text.includes('underfunded')) return new PaymentError('insufficient_balance');
  if (text.includes('no_trust')) return new PaymentError('no_trustline');
  if (text.includes('no_destination')) {
    return new PaymentError(
      'rpc_failure',
      'The merchant Stellar account does not exist on Testnet yet.',
      false,
    );
  }
  if (text.includes('too_late') || text.includes('bad_seq')) {
    return new PaymentError(
      'rpc_failure',
      'The transaction timed out before reaching Stellar. Try again.',
    );
  }
  if (text.includes('insufficient_fee')) {
    return new PaymentError('rpc_failure', 'The network fee was too low. Try again.');
  }
  return new PaymentError('tx_failed', `Stellar rejected the transaction (${code}).`);
}

export type SubmitResult = { hash: string; successful: boolean; ledger?: number };

/** Submit a signed transaction envelope to Horizon. */
export async function submitTransaction(signedXdr: string): Promise<SubmitResult> {
  const res = await horizonFetch('/transactions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `tx=${encodeURIComponent(signedXdr)}`,
  });

  const payload = await readJsonObject(res);

  if (res.ok && payload) {
    const hash = str(payload.hash);
    if (!hash) {
      throw new PaymentError('rpc_failure', 'Stellar Horizon accepted the payment without a hash.');
    }
    return {
      hash,
      successful: payload.successful !== false,
      ledger: num(payload.ledger),
    };
  }

  const extras = record(payload?.extras);
  const resultCodes = record(extras.result_codes);
  const operations = Array.isArray(resultCodes.operations) ? resultCodes.operations : [];
  const opCode = operations.map(str).find((c) => c && c !== 'op_success');
  const code = opCode ?? str(resultCodes.transaction) ?? '';
  if (code) throw mapResultCode(code);

  throw new PaymentError('rpc_failure', `Stellar Horizon returned ${res.status}.`);
}

/** Read a submitted transaction back from Horizon (used while confirming). */
export async function fetchTransaction(hash: string): Promise<HorizonTransaction | null> {
  const res = await horizonFetch(`/transactions/${hash}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new PaymentError('rpc_failure', `Stellar Horizon returned ${res.status}.`);

  const payload = await readJsonObject(res);
  const txHash = str(payload?.hash);
  if (!payload || !txHash) return null;

  return {
    hash: txHash,
    successful: payload.successful === true,
    ledger: num(payload.ledger),
    created_at: str(payload.created_at),
    memo: str(payload.memo),
    memo_type: str(payload.memo_type),
  };
}
